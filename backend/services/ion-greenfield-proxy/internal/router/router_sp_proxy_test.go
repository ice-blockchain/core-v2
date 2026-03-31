package router_test

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"ion-greenfield-proxy/internal/adnl"
	"ion-greenfield-proxy/internal/config"
	"ion-greenfield-proxy/internal/router"
)

type echoResponse struct {
	Path  string            `json:"path"`
	Query map[string]string `json:"query"`
}

const testADNLAddress = "test-adnl-address"

func newTestProxy(t *testing.T, upstreamURL string) *httptest.Server {
	t.Helper()
	gin.SetMode(gin.TestMode)
	r := router.New(router.Params{
		Config: &config.Config{
			GreenfieldRPCEndpoint: upstreamURL,
			Env:                   "development",
		},
		Key: &adnl.Key{Address: testADNLAddress},
	})
	return httptest.NewServer(r)
}

// spGet sends a GET to the proxy's /sp/ route with the Host header set to
// the ADNL address, simulating how the ADNL transport delivers requests.
func spGet(t *testing.T, proxyURL, host, targetURL, extraPath string) *http.Response {
	t.Helper()
	encoded := base64.RawURLEncoding.EncodeToString([]byte(targetURL))
	req, err := http.NewRequest("GET", proxyURL+"/sp/"+encoded+extraPath, nil)
	require.NoError(t, err)
	req.Host = host
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	return resp
}

func TestProxySP_ForwardsRequestToUpstream(t *testing.T) {
	t.Parallel()

	upstream := echoUpstream(t)
	defer upstream.Close()

	proxy := newTestProxy(t, upstream.URL)
	defer proxy.Close()

	resp := spGet(t, proxy.URL, testADNLAddress, upstream.URL, "?foo=bar&baz=qux")
	defer resp.Body.Close()

	require.Equal(t, http.StatusOK, resp.StatusCode)

	var echo echoResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&echo))

	require.Equal(t, "/", echo.Path)
	require.Equal(t, "bar", echo.Query["foo"])
	require.Equal(t, "qux", echo.Query["baz"])
}

func TestProxySP_RejectsWrongHost(t *testing.T) {
	t.Parallel()

	upstream := unreachableUpstream(t)
	defer upstream.Close()

	proxy := newTestProxy(t, upstream.URL)
	defer proxy.Close()

	resp := spGet(t, proxy.URL, "wrong-adnl-address", upstream.URL, "")
	defer resp.Body.Close()

	require.Equal(t, http.StatusForbidden, resp.StatusCode)
}

func TestProxySP_HostCheckIsCaseInsensitive(t *testing.T) {
	t.Parallel()

	upstream := echoUpstream(t)
	defer upstream.Close()

	proxy := newTestProxy(t, upstream.URL)
	defer proxy.Close()

	resp := spGet(t, proxy.URL, "TEST-ADNL-ADDRESS", upstream.URL, "")
	defer resp.Body.Close()

	require.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestProxySP_InvalidBase64(t *testing.T) {
	t.Parallel()

	upstream := unreachableUpstream(t)
	defer upstream.Close()

	proxy := newTestProxy(t, upstream.URL)
	defer proxy.Close()

	req, _ := http.NewRequest("GET", proxy.URL+"/sp/not-valid-base64!!", nil)
	req.Host = testADNLAddress
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	require.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestProxySP_EmptyPath(t *testing.T) {
	t.Parallel()

	upstream := unreachableUpstream(t)
	defer upstream.Close()

	proxy := newTestProxy(t, upstream.URL)
	defer proxy.Close()

	req, _ := http.NewRequest("GET", proxy.URL+"/sp/", nil)
	req.Host = testADNLAddress
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	require.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestProxySP_UpstreamDown(t *testing.T) {
	t.Parallel()

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	upstreamURL := upstream.URL
	upstream.Close()

	proxy := newTestProxy(t, upstreamURL)
	defer proxy.Close()

	resp := spGet(t, proxy.URL, testADNLAddress, upstreamURL, "")
	defer resp.Body.Close()

	require.Equal(t, http.StatusBadGateway, resp.StatusCode)
}

func TestProxySP_ForwardsSubPath(t *testing.T) {
	t.Parallel()

	upstream := echoUpstream(t)
	defer upstream.Close()

	proxy := newTestProxy(t, upstream.URL)
	defer proxy.Close()

	resp := spGet(t, proxy.URL, testADNLAddress, upstream.URL, "/head/foo?q=1")
	defer resp.Body.Close()

	require.Equal(t, http.StatusOK, resp.StatusCode)

	var echo echoResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&echo))

	require.Equal(t, "/head/foo", echo.Path)
	require.Equal(t, "1", echo.Query["q"])
}

func TestProxySP_NoQueryParams(t *testing.T) {
	t.Parallel()

	upstream := echoUpstream(t)
	defer upstream.Close()

	proxy := newTestProxy(t, upstream.URL)
	defer proxy.Close()

	resp := spGet(t, proxy.URL, testADNLAddress, upstream.URL, "")
	defer resp.Body.Close()

	require.Equal(t, http.StatusOK, resp.StatusCode)

	var echo echoResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&echo))

	require.Equal(t, "/", echo.Path)
	require.Empty(t, echo.Query)
}

func unreachableUpstream(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("upstream should not be reached")
	}))
}

func echoUpstream(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := echoResponse{
			Path:  r.URL.Path,
			Query: make(map[string]string),
		}
		for k, v := range r.URL.Query() {
			resp.Query[k] = v[0]
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
}

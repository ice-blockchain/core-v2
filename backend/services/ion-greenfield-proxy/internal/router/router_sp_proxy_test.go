package router_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestProxySP_ForwardsRequestToUpstream(t *testing.T) {
	t.Parallel()

	upstream := echoUpstream(t)
	defer upstream.Close()

	proxy := newTestProxySP(t, upstream.URL)
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

	proxy := newTestProxySP(t, upstream.URL)
	defer proxy.Close()

	resp := spGet(t, proxy.URL, "wrong-adnl-address", upstream.URL, "")
	defer resp.Body.Close()

	require.Equal(t, http.StatusForbidden, resp.StatusCode)
}

func TestProxySP_HostCheckIsCaseInsensitive(t *testing.T) {
	t.Parallel()

	upstream := echoUpstream(t)
	defer upstream.Close()

	proxy := newTestProxySP(t, upstream.URL)
	defer proxy.Close()

	resp := spGet(t, proxy.URL, "TEST-ADNL-ADDRESS", upstream.URL, "")
	defer resp.Body.Close()

	require.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestProxySP_InvalidBase64(t *testing.T) {
	t.Parallel()

	proxy := newTestProxy(t)
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

	proxy := newTestProxy(t)
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

	upstream := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	upstreamURL := upstream.URL
	upstream.Close()

	proxy := newTestProxySP(t, upstreamURL)
	defer proxy.Close()

	resp := spGet(t, proxy.URL, testADNLAddress, upstreamURL, "")
	defer resp.Body.Close()

	require.Equal(t, http.StatusBadGateway, resp.StatusCode)
}

func TestProxySP_ForwardsSubPath(t *testing.T) {
	t.Parallel()

	upstream := echoUpstream(t)
	defer upstream.Close()

	proxy := newTestProxySP(t, upstream.URL)
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

	proxy := newTestProxySP(t, upstream.URL)
	defer proxy.Close()

	resp := spGet(t, proxy.URL, testADNLAddress, upstream.URL, "")
	defer resp.Body.Close()

	require.Equal(t, http.StatusOK, resp.StatusCode)

	var echo echoResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&echo))

	require.Equal(t, "/", echo.Path)
	require.Empty(t, echo.Query)
}

func TestProxySP_RejectsNilProvisioner(t *testing.T) {
	t.Parallel()

	// newTestProxy creates a router with Provisioner: nil.
	// The SP proxy must fail closed (403) rather than allow unvalidated proxying.
	proxy := newTestProxy(t)
	defer proxy.Close()

	upstream := echoUpstream(t)
	defer upstream.Close()

	resp := spGet(t, proxy.URL, testADNLAddress, upstream.URL, "")
	defer resp.Body.Close()

	require.Equal(t, http.StatusForbidden, resp.StatusCode)
}

func TestProxySP_RejectsUnknownSPHost(t *testing.T) {
	t.Parallel()

	// The only "known" SP is an unreachable HTTPS endpoint. The test
	// never contacts it — the proxy rejects before proxying.
	mock := newMockClient(t, []string{"https://known-sp.example.com"}, nil)
	proxy := newTestProxyWithMock(t, mock)
	defer proxy.Close()

	resp := spGet(t, proxy.URL, testADNLAddress, "https://evil.example.com", "/get")
	defer resp.Body.Close()

	require.Equal(t, http.StatusForbidden, resp.StatusCode)
}

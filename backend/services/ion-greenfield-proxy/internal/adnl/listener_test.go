package adnl

import (
	"net/http"
	"testing"

	"ion-greenfield-proxy/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestBuildHTTPRequest_convertsMethodURLHeaders(t *testing.T) {
	t.Parallel()
	req := Request{
		ID:      make([]byte, 32),
		Method:  "POST",
		URL:     "https://example.com/api/v1/data",
		Version: "HTTP/1.1",
		Headers: []Header{
			{Name: "Content-Type", Value: "application/json"},
			{Name: "Authorization", Value: "Bearer token123"},
		},
	}

	httpReq, err := BuildHTTPRequest(req)
	require.NoError(t, err)
	require.Equal(t, "POST", httpReq.Method)
	require.Equal(t, "https://example.com/api/v1/data", httpReq.URL.String())
	require.Equal(t, "application/json", httpReq.Header.Get("Content-Type"))
	require.Equal(t, "Bearer token123", httpReq.Header.Get("Authorization"))
}

func TestBuildHTTPRequest_rejectsInvalidURL(t *testing.T) {
	t.Parallel()
	_, err := BuildHTTPRequest(Request{Method: "GET", URL: "://"})
	require.Error(t, err)
}

func TestBuildHTTPRequest_multipleValuesForSameHeader(t *testing.T) {
	t.Parallel()
	req := Request{
		ID:      make([]byte, 32),
		Method:  "GET",
		URL:     "/test",
		Version: "HTTP/1.1",
		Headers: []Header{
			{Name: "Accept", Value: "text/html"},
			{Name: "Accept", Value: "application/json"},
		},
	}

	httpReq, err := BuildHTTPRequest(req)
	require.NoError(t, err)
	values := httpReq.Header.Values("Accept")
	require.Len(t, values, 2)
	require.Contains(t, values, "text/html")
	require.Contains(t, values, "application/json")
}

func TestBuildTLResponse_convertsStatusHeadersAndPayloadFlag(t *testing.T) {
	t.Parallel()
	w := NewResponseWriter()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(201)
	w.Write([]byte(`{"ok":true}`))

	resp := BuildTLResponse(w)
	require.Equal(t, int32(201), resp.StatusCode)
	require.Equal(t, "Created", resp.Reason)
	require.False(t, resp.NoPayload)
	require.Contains(t, resp.Headers, Header{Name: "Content-Type", Value: "application/json"})
}

func TestBuildTLResponse_noPayloadWhenBodyEmpty(t *testing.T) {
	t.Parallel()
	w := NewResponseWriter()
	w.WriteHeader(204)

	resp := BuildTLResponse(w)
	require.True(t, resp.NoPayload)
}

func TestPayloadChunk_singleChunk(t *testing.T) {
	t.Parallel()
	chunk, isLast := PayloadChunk([]byte("hello"), 0)
	require.Equal(t, "hello", string(chunk))
	require.True(t, isLast)
}

func TestPayloadChunk_multipleChunks(t *testing.T) {
	t.Parallel()
	body := make([]byte, chunkSize+100)
	for i := range body {
		body[i] = byte(i % 256)
	}

	c0, last0 := PayloadChunk(body, 0)
	require.Len(t, c0, chunkSize)
	require.False(t, last0)

	c1, last1 := PayloadChunk(body, 1)
	require.Len(t, c1, 100)
	require.True(t, last1)
}

func TestPayloadChunk_beyondEnd(t *testing.T) {
	t.Parallel()
	chunk, isLast := PayloadChunk([]byte("data"), 999)
	require.Nil(t, chunk)
	require.True(t, isLast)
}

func TestResponseWriter_capturesStatusAndBody(t *testing.T) {
	t.Parallel()
	w := NewResponseWriter()
	w.Header().Set("X-Custom", "value")
	w.WriteHeader(418)
	w.Write([]byte("teapot"))

	require.Equal(t, 418, w.code)
	require.Equal(t, "teapot", w.body.String())
	require.Equal(t, "value", w.Header().Get("X-Custom"))
}

func TestResponseWriter_defaultsTo200(t *testing.T) {
	t.Parallel()
	w := NewResponseWriter()
	w.Write([]byte("ok"))
	require.Equal(t, http.StatusOK, w.code)
}

func TestADNLContextMiddleware_setsContextAndStripsHeaders(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)
	var gotAddr, gotRLDP, hdrAddr string

	r := gin.New()
	r.Use(ADNLContextMiddleware())
	r.GET("/t", func(c *gin.Context) {
		if v, ok := c.Get(middleware.ContextKeyADNLAddress); ok {
			gotAddr = v.(string)
		}
		if v, ok := c.Get(middleware.ContextKeyADNLRLDPID); ok {
			gotRLDP = v.(string)
		}
		hdrAddr = c.GetHeader("X-ADNL-Address")
		c.Status(200)
	})

	req, _ := http.NewRequest("GET", "/t", nil)
	req.Header.Set("X-ADNL-Address", "abc123")
	req.Header.Set("X-ADNL-RLDP-ID", "transfer456")

	w := NewResponseWriter()
	r.ServeHTTP(w, req)

	require.Equal(t, "abc123", gotAddr)
	require.Equal(t, "transfer456", gotRLDP)
	require.Empty(t, hdrAddr, "X-ADNL-Address header should be stripped")
}

func TestADNLContextMiddleware_noopWithoutHeaders(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)
	var hasAddr bool

	r := gin.New()
	r.Use(ADNLContextMiddleware())
	r.GET("/t", func(c *gin.Context) {
		_, hasAddr = c.Get(middleware.ContextKeyADNLAddress)
		c.Status(200)
	})

	req, _ := http.NewRequest("GET", "/t", nil)
	w := NewResponseWriter()
	r.ServeHTTP(w, req)

	require.False(t, hasAddr, "context should not have adnl_address for non-ADNL requests")
}

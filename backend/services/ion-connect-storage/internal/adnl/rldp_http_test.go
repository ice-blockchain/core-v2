package adnl

import (
	"math"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestExtractChunkNegativeSeqno(t *testing.T) {
	data := make([]byte, chunkSize*2)
	chunk, isLast := extractChunk(data, -1)
	require.Nil(t, chunk)
	require.True(t, isLast)
}

func TestExtractChunkOverflowSeqno(t *testing.T) {
	data := make([]byte, chunkSize)
	chunk, isLast := extractChunk(data, math.MaxInt32)
	require.Nil(t, chunk)
	require.True(t, isLast)
}

func TestExtractChunkValidFirst(t *testing.T) {
	data := make([]byte, chunkSize+100)
	for i := range data {
		data[i] = byte(i)
	}
	chunk, isLast := extractChunk(data, 0)
	require.Equal(t, chunkSize, len(chunk))
	require.False(t, isLast)
}

func TestExtractChunkValidLast(t *testing.T) {
	data := make([]byte, chunkSize+100)
	chunk, isLast := extractChunk(data, 1)
	require.Equal(t, 100, len(chunk))
	require.True(t, isLast)
}

func TestBuildHTTPRequestRejectsLongURL(t *testing.T) {
	req := Request{
		Method: "GET",
		URL:    "http://example.com/" + strings.Repeat("a", maxURLLength),
	}
	_, err := buildHTTPRequest(req)
	require.Error(t, err)
	require.Contains(t, err.Error(), "URL too long")
}

func TestBuildHTTPRequestRejectsLongMethod(t *testing.T) {
	req := Request{
		Method: strings.Repeat("X", maxMethodLength+1),
		URL:    "http://example.com",
	}
	_, err := buildHTTPRequest(req)
	require.Error(t, err)
	require.Contains(t, err.Error(), "method too long")
}

func TestBuildHTTPRequestRejectsTooManyHeaders(t *testing.T) {
	headers := make([]Header, maxHeaderCount+1)
	for i := range headers {
		headers[i] = Header{Name: "X-Test", Value: "val"}
	}
	req := Request{
		Method:  "GET",
		URL:     "http://example.com",
		Headers: headers,
	}
	_, err := buildHTTPRequest(req)
	require.Error(t, err)
	require.Contains(t, err.Error(), "too many headers")
}

func TestBuildHTTPRequestRejectsOversizedHeader(t *testing.T) {
	req := Request{
		Method: "GET",
		URL:    "http://example.com",
		Headers: []Header{
			{Name: "X-Big", Value: strings.Repeat("v", maxHeaderSize)},
		},
	}
	_, err := buildHTTPRequest(req)
	require.Error(t, err)
	require.Contains(t, err.Error(), "header too large")
}

func TestBuildHTTPRequestAcceptsValid(t *testing.T) {
	req := Request{
		Method: "GET",
		URL:    "http://example.com/path",
		Headers: []Header{
			{Name: "Accept", Value: "application/json"},
		},
	}
	httpReq, err := buildHTTPRequest(req)
	require.NoError(t, err)
	require.Equal(t, "GET", httpReq.Method)
	require.Equal(t, "application/json", httpReq.Header.Get("Accept"))
}

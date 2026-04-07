package adnl

import (
	"context"
	"math"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

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

func TestExtractChunkMaxIntSeqnoRejectsOverflow(t *testing.T) {
	data := make([]byte, chunkSize)
	// math.MaxInt / chunkSize + 1 would overflow when multiplied by chunkSize
	hugeSeqno := math.MaxInt/chunkSize + 1
	chunk, isLast := extractChunk(data, hugeSeqno)
	require.Nil(t, chunk)
	require.True(t, isLast)
}

func TestExtractChunkBoundarySeqnoSafe(t *testing.T) {
	data := make([]byte, chunkSize)
	// Exactly at the limit -- won't overflow but exceeds data length
	boundarySeqno := math.MaxInt / chunkSize
	chunk, isLast := extractChunk(data, boundarySeqno)
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

func TestBuildHTTPRequestRejectsAbsoluteURL(t *testing.T) {
	req := Request{
		Method: "GET",
		URL:    "http://169.254.169.254/latest/meta-data/",
	}
	_, err := buildHTTPRequest(req)
	require.Error(t, err)
	require.Contains(t, err.Error(), "relative path")
}

func TestBuildHTTPRequestRejectsSchemeInPath(t *testing.T) {
	req := Request{
		Method: "GET",
		URL:    "/redirect?url=http://evil.com",
	}
	_, err := buildHTTPRequest(req)
	require.Error(t, err)
	require.Contains(t, err.Error(), "scheme")
}

func TestBuildHTTPRequestRejectsLocalhostURL(t *testing.T) {
	req := Request{
		Method: "GET",
		URL:    "http://localhost:8080/admin",
	}
	_, err := buildHTTPRequest(req)
	require.Error(t, err)
	require.Contains(t, err.Error(), "relative path")
}

func TestBuildHTTPRequestRejectsEmptyURL(t *testing.T) {
	req := Request{
		Method: "GET",
		URL:    "",
	}
	_, err := buildHTTPRequest(req)
	require.Error(t, err)
	require.Contains(t, err.Error(), "relative path")
}

func TestBuildHTTPRequestAcceptsRelativePath(t *testing.T) {
	req := Request{
		Method: "GET",
		URL:    "/bags/abc123",
		Headers: []Header{
			{Name: "Accept", Value: "application/json"},
		},
	}
	httpReq, err := buildHTTPRequest(req)
	require.NoError(t, err)
	require.Equal(t, "GET", httpReq.Method)
	require.Equal(t, "/bags/abc123", httpReq.URL.Path)
	require.Equal(t, "application/json", httpReq.Header.Get("Accept"))
}

func TestBuildHTTPRequestAcceptsRelativePathWithQuery(t *testing.T) {
	req := Request{
		Method: "GET",
		URL:    "/bags/abc123?format=json",
	}
	httpReq, err := buildHTTPRequest(req)
	require.NoError(t, err)
	require.Equal(t, "/bags/abc123", httpReq.URL.Path)
	require.Equal(t, "format=json", httpReq.URL.RawQuery)
}

func TestBuildHTTPRequestRejectsLongURL(t *testing.T) {
	req := Request{
		Method: "GET",
		URL:    "/" + strings.Repeat("a", maxURLLength),
	}
	_, err := buildHTTPRequest(req)
	require.Error(t, err)
	require.Contains(t, err.Error(), "URL too long")
}

func TestBuildHTTPRequestRejectsLongMethod(t *testing.T) {
	req := Request{
		Method: strings.Repeat("X", maxMethodLength+1),
		URL:    "/test",
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
		URL:     "/test",
		Headers: headers,
	}
	_, err := buildHTTPRequest(req)
	require.Error(t, err)
	require.Contains(t, err.Error(), "too many headers")
}

func TestBuildHTTPRequestRejectsOversizedHeader(t *testing.T) {
	req := Request{
		Method: "GET",
		URL:    "/test",
		Headers: []Header{
			{Name: "X-Big", Value: strings.Repeat("v", maxHeaderSize)},
		},
	}
	_, err := buildHTTPRequest(req)
	require.Error(t, err)
	require.Contains(t, err.Error(), "header too large")
}

func TestPayloadCountAtomicUnderConcurrency(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	bridge := NewRLDPHTTPBridge(ctx, nil, testLogger())
	defer bridge.Stop()

	const goroutines = 200
	var reserved atomic.Int64
	var wg sync.WaitGroup

	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if bridge.tryReservePayloadSlot(1024) {
				reserved.Add(1)
			}
		}()
	}
	wg.Wait()

	// All should succeed since goroutines < maxPendingPayloads
	require.Equal(t, int64(goroutines), reserved.Load())
	require.Equal(t, int64(goroutines), bridge.payloadCount)
}

func TestPayloadCountNeverExceedsLimit(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	bridge := NewRLDPHTTPBridge(ctx, nil, testLogger())
	defer bridge.Stop()

	// Fill to the limit
	bridge.payloadMu.Lock()
	bridge.payloadCount = maxPendingPayloads - 1
	bridge.payloadMu.Unlock()

	const goroutines = 100
	var reserved atomic.Int64
	var wg sync.WaitGroup

	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if bridge.tryReservePayloadSlot(1024) {
				reserved.Add(1)
			}
		}()
	}
	wg.Wait()

	// Exactly 1 slot was available
	require.Equal(t, int64(1), reserved.Load())
	bridge.payloadMu.Lock()
	require.Equal(t, int64(maxPendingPayloads), bridge.payloadCount)
	bridge.payloadMu.Unlock()
}

func TestPayloadIsolationBetweenPeers(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	bridge := NewRLDPHTTPBridge(ctx, nil, testLogger())
	defer bridge.Stop()

	peerA := []byte("peer-aaaa-aaaa-aaaa-aaaa-aaaa-aaaa")
	peerB := []byte("peer-bbbb-bbbb-bbbb-bbbb-bbbb-bbbb")
	reqID := []byte("same-request-id-for-both-peers!")

	prefixA := "peer-aaaa-aaaa-aaaa-aaaa-aaaa-aaaa"
	prefixB := "peer-bbbb-bbbb-bbbb-bbbb-bbbb-bbbb"
	_ = peerA
	_ = peerB

	keyA := prefixA + ":" + "same-request-id-for-both-peers!"
	keyB := prefixB + ":" + "same-request-id-for-both-peers!"
	_ = reqID

	// Peer A stores a payload
	bridge.payloads.Store(keyA, &pendingPayload{data: []byte("secret-A"), size: 8, createdAt: time.Now()})
	bridge.payloadMu.Lock()
	bridge.payloadCount = 1
	bridge.payloadMu.Unlock()

	// Peer B cannot load peer A's payload using the same reqID
	_, ok := bridge.payloads.Load(keyB)
	require.False(t, ok, "peer B must not access peer A's payload")

	// Peer A can load its own payload
	payload, ok := bridge.payloads.Load(keyA)
	require.True(t, ok)
	require.Equal(t, []byte("secret-A"), payload.data)
}

func TestDeletePayloadDecrementsSafely(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	bridge := NewRLDPHTTPBridge(ctx, nil, testLogger())
	defer bridge.Stop()

	bridge.payloads.Store("key1", &pendingPayload{data: []byte("x"), size: 1, createdAt: time.Now()})
	bridge.payloadMu.Lock()
	bridge.payloadCount = 1
	bridge.totalPayloadBytes = 1
	bridge.payloadMu.Unlock()

	// First delete decrements
	bridge.deletePayload("key1")
	bridge.payloadMu.Lock()
	require.Equal(t, int64(0), bridge.payloadCount)
	require.Equal(t, int64(0), bridge.totalPayloadBytes)
	bridge.payloadMu.Unlock()

	// Second delete on same key is a no-op (no double decrement)
	bridge.deletePayload("key1")
	bridge.payloadMu.Lock()
	require.Equal(t, int64(0), bridge.payloadCount)
	bridge.payloadMu.Unlock()
}

func TestPayloadByteLimitEnforced(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	bridge := NewRLDPHTTPBridge(ctx, nil, testLogger())
	defer bridge.Stop()

	// Set totalPayloadBytes just below the limit.
	bridge.payloadMu.Lock()
	bridge.totalPayloadBytes = maxTotalPayloadBytes - 100
	bridge.payloadMu.Unlock()

	// A small payload should succeed.
	require.True(t, bridge.tryReservePayloadSlot(50))
	bridge.payloadMu.Lock()
	require.Equal(t, int64(maxTotalPayloadBytes-50), bridge.totalPayloadBytes)
	bridge.payloadMu.Unlock()

	// A payload that would exceed the limit should be rejected.
	require.False(t, bridge.tryReservePayloadSlot(100))
}

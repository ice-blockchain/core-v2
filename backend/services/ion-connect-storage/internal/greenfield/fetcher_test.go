package greenfield

import (
	"context"
	"io"
	"strings"
	"sync"
	"sync/atomic"
	"testing"

	greenfieldclient "github.com/ice-blockchain/ion/packages/greenfield-client"
	"github.com/stretchr/testify/require"
)

type mockGreenfieldClient struct {
	getObjectCalls atomic.Int64
	objectData     string
}

func (m *mockGreenfieldClient) Subscribe(_ context.Context, _ greenfieldclient.SubscribeOpts) (<-chan *greenfieldclient.TxEvent, error) {
	return nil, nil
}
func (m *mockGreenfieldClient) IsSubscribed() bool { return false }
func (m *mockGreenfieldClient) GetObject(_ context.Context, _, _ string, _ greenfieldclient.GetObjectOpts) (io.ReadCloser, greenfieldclient.ObjectStat, error) {
	m.getObjectCalls.Add(1)
	return io.NopCloser(strings.NewReader(m.objectData)), greenfieldclient.ObjectStat{Size: int64(len(m.objectData))}, nil
}
func (m *mockGreenfieldClient) FGetObject(_ context.Context, _, _, _ string, _ greenfieldclient.GetObjectOpts) error {
	return nil
}
func (m *mockGreenfieldClient) FGetObjectResumable(_ context.Context, _, _, _ string, _ greenfieldclient.GetObjectOpts) error {
	return nil
}
func (m *mockGreenfieldClient) Close() error { return nil }

func TestFetcherCoalescesSegmentRequests(t *testing.T) {
	mock := &mockGreenfieldClient{objectData: strings.Repeat("x", 1024)}
	fetcher := NewFetcher(mock, testLogger())

	var wg sync.WaitGroup
	results := make([][]byte, 5)
	errs := make([]error, 5)

	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			results[idx], errs[idx] = fetcher.FetchSegment(context.Background(), "b", "o", 0, nil)
		}(i)
	}
	wg.Wait()

	for i := 0; i < 5; i++ {
		require.NoError(t, errs[i])
		require.Len(t, results[i], 1024)
	}

	// singleflight should coalesce into 1 call (or very few if timing varies)
	require.LessOrEqual(t, mock.getObjectCalls.Load(), int64(2))
}

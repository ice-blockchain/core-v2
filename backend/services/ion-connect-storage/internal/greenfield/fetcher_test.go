package greenfield

import (
	"context"
	"io"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

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
	mock := &slowGreenfieldClient{
		mockGreenfieldClient: mockGreenfieldClient{objectData: strings.Repeat("x", 1024)},
		delay:                100 * time.Millisecond,
	}
	fetcher := NewFetcher(mock, testLogger())

	var wg sync.WaitGroup
	results := make([][]byte, 5)
	errs := make([]error, 5)
	start := make(chan struct{})

	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			<-start
			results[idx], errs[idx] = fetcher.FetchSegment(context.Background(), "b", "o", 0, nil)
		}(i)
	}
	close(start)
	wg.Wait()

	for i := 0; i < 5; i++ {
		require.NoError(t, errs[i])
		require.Len(t, results[i], 1024)
	}

	// singleflight should coalesce into 1 call (or very few if timing varies)
	require.LessOrEqual(t, mock.getObjectCalls.Load(), int64(2))
}

type slowGreenfieldClient struct {
	mockGreenfieldClient
	delay time.Duration
}

func (m *slowGreenfieldClient) GetObject(ctx context.Context, bucket, object string, opts greenfieldclient.GetObjectOpts) (io.ReadCloser, greenfieldclient.ObjectStat, error) {
	select {
	case <-time.After(m.delay):
	case <-ctx.Done():
		return nil, greenfieldclient.ObjectStat{}, ctx.Err()
	}
	return m.mockGreenfieldClient.GetObject(ctx, bucket, object, opts)
}

func TestFetcherContextCancelDoesNotAffectCoalescedCallers(t *testing.T) {
	mock := &slowGreenfieldClient{
		mockGreenfieldClient: mockGreenfieldClient{objectData: strings.Repeat("y", 512)},
		delay:                200 * time.Millisecond,
	}
	fetcher := NewFetcher(mock, testLogger())

	// First caller cancels immediately, second caller waits.
	cancelledCtx, cancel := context.WithCancel(context.Background())
	cancel()

	var wg sync.WaitGroup
	var result2 []byte
	var err2 error
	start := make(chan struct{})

	wg.Add(2)
	go func() {
		defer wg.Done()
		<-start
		// Cancelled context -- should not poison the singleflight.
		// FetchSegment uses context.WithoutCancel internally, so the
		// cancelled caller still receives the shared result.
		_, _ = fetcher.FetchSegment(cancelledCtx, "b", "o", 0, nil)
	}()
	go func() {
		defer wg.Done()
		<-start
		result2, err2 = fetcher.FetchSegment(context.Background(), "b", "o", 0, nil)
	}()
	close(start)
	wg.Wait()

	// Second caller must succeed despite first caller's cancellation.
	require.NoError(t, err2)
	require.Len(t, result2, 512)
}

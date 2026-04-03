package cluster

import (
	"context"
	"log/slog"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

type mockPeerBroadcaster struct {
	mu       sync.Mutex
	messages [][]byte
}

func (m *mockPeerBroadcaster) BroadcastToCluster(_ context.Context, data []byte) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cp := make([]byte, len(data))
	copy(cp, data)
	m.messages = append(m.messages, cp)
	return nil
}

func TestBroadcasterSendsHeadCID(t *testing.T) {
	mock := &mockPeerBroadcaster{}
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	b := NewADNLBroadcaster(mock, logger)
	defer b.Close()

	err := b.Broadcast(context.Background(), []byte("head-cid-123"))
	require.NoError(t, err)

	mock.mu.Lock()
	require.Len(t, mock.messages, 1)
	mock.mu.Unlock()

	// Verify the message is a valid TL-encoded CRDT head.
	parsed, err := ParseCRDTHead(mock.messages[0])
	require.NoError(t, err)
	require.Equal(t, []byte("head-cid-123"), parsed)
}

func TestBroadcasterReceivesIncoming(t *testing.T) {
	mock := &mockPeerBroadcaster{}
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	b := NewADNLBroadcaster(mock, logger)
	defer b.Close()

	incoming := SerializeCRDTHead([]byte("remote-head"))
	b.HandleIncoming(incoming)

	done := make(chan []byte, 1)
	go func() {
		data, err := b.Next(context.Background())
		if err == nil {
			done <- data
		}
	}()

	select {
	case data := <-done:
		require.Equal(t, []byte("remote-head"), data)
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for Next()")
	}
}

func TestBroadcasterCloseUnblocksNext(t *testing.T) {
	mock := &mockPeerBroadcaster{}
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	b := NewADNLBroadcaster(mock, logger)

	done := make(chan error, 1)
	go func() {
		_, err := b.Next(context.Background())
		done <- err
	}()

	b.Close()

	select {
	case err := <-done:
		require.Error(t, err)
	case <-time.After(time.Second):
		t.Fatal("Close did not unblock Next()")
	}
}

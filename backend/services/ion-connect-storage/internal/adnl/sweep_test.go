package adnl

import (
	"context"
	"crypto/ed25519"
	"sync"
	"testing"

	"github.com/stretchr/testify/require"
)

// TestQuerySeedsEmptyReturnsEmpty verifies basic behavior with no seeds.
func TestQuerySeedsEmptyReturnsEmpty(t *testing.T) {
	t.Parallel()
	_, priv, _ := ed25519.GenerateKey(nil)
	s := newSweeper(nil, priv, nil, testLogger())

	result := s.querySeeds(context.Background(), make([]byte, 32), &sync.Map{})
	require.Empty(t, result)
}

// TestQueryNodesEmptyReturnsEmpty verifies basic behavior with no nodes.
func TestQueryNodesEmptyReturnsEmpty(t *testing.T) {
	t.Parallel()
	_, priv, _ := ed25519.GenerateKey(nil)
	s := newSweeper(nil, priv, nil, testLogger())

	result := s.queryNodes(context.Background(), nil, make([]byte, 32), &sync.Map{})
	require.Empty(t, result)
}

// TestQuerySeedsCancelledContextNoDeadlock tests that with a cancelled context
// and zero-length seed list, querySeeds returns immediately.
func TestQuerySeedsCancelledContextNoDeadlock(t *testing.T) {
	t.Parallel()
	_, priv, _ := ed25519.GenerateKey(nil)
	s := newSweeper(nil, priv, nil, testLogger())

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	result := s.querySeeds(ctx, make([]byte, 32), &sync.Map{})
	require.Empty(t, result)
}

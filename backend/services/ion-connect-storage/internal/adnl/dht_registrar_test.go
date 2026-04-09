package adnl

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"testing"
	"time"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/stretchr/testify/require"
	"github.com/xssnick/tonutils-go/adnl/overlay"
)

type mockDHTStorer struct {
	storeCount     int
	lastOverlayKey []byte
}

func (m *mockDHTStorer) StoreOverlayNodes(
	_ context.Context,
	overlayKey []byte,
	_ *overlay.NodesList,
	_ time.Duration,
	_ int,
) (int, []byte, error) {
	m.storeCount++
	m.lastOverlayKey = overlayKey
	return 1, overlayKey, nil
}

func generateTestKey(t *testing.T) ed25519.PrivateKey {
	t.Helper()
	_, priv, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)
	return priv
}

func TestDHTRegistrar_RegisterDeregister(t *testing.T) {
	t.Parallel()
	mock := &mockDHTStorer{}
	key := generateTestKey(t)
	reg := newDHTRegistrar(mock, nil, 100, key, testLogger())

	bag1 := boc.BagID{1}
	bag2 := boc.BagID{2}
	bag3 := boc.BagID{3}

	require.NoError(t, reg.Register(t.Context(), bag1))
	require.NoError(t, reg.Register(t.Context(), bag2))
	require.NoError(t, reg.Register(t.Context(), bag3))
	require.Equal(t, 3, reg.Count())
	require.Equal(t, 3, mock.storeCount)

	reg.Deregister(bag1)
	require.Equal(t, 2, reg.Count())
}

func TestDHTRegistrar_LRUEviction(t *testing.T) {
	t.Parallel()
	mock := &mockDHTStorer{}
	key := generateTestKey(t)
	reg := newDHTRegistrar(mock, nil, 2, key, testLogger())

	_ = reg.Register(t.Context(), boc.BagID{1})
	_ = reg.Register(t.Context(), boc.BagID{2})
	_ = reg.Register(t.Context(), boc.BagID{3})

	require.Equal(t, 2, reg.Count())
}

func TestDHTRegistrar_RegionIndex(t *testing.T) {
	t.Parallel()
	mock := &mockDHTStorer{}
	key := generateTestKey(t)
	reg := newDHTRegistrar(mock, nil, 100, key, testLogger())

	bag1 := boc.BagID{1}
	bag2 := boc.BagID{2}

	_ = reg.Register(t.Context(), bag1)
	_ = reg.Register(t.Context(), bag2)

	region1 := overlayRegion(bag1)
	region2 := overlayRegion(bag2)

	bags1 := reg.bagsInRegion(region1)
	require.Contains(t, bags1, bag1)

	bags2 := reg.bagsInRegion(region2)
	require.Contains(t, bags2, bag2)

	reg.Deregister(bag1)
	require.Empty(t, reg.bagsInRegion(region1))
}

func TestDHTRegistrar_LRUEvictionCleansRegionIndex(t *testing.T) {
	t.Parallel()
	mock := &mockDHTStorer{}
	key := generateTestKey(t)
	reg := newDHTRegistrar(mock, nil, 2, key, testLogger())

	bag1 := boc.BagID{1}
	bag2 := boc.BagID{2}
	bag3 := boc.BagID{3}

	_ = reg.Register(t.Context(), bag1)
	_ = reg.Register(t.Context(), bag2)

	region1 := overlayRegion(bag1)
	require.NotEmpty(t, reg.bagsInRegion(region1))

	// Evicts bag1
	_ = reg.Register(t.Context(), bag3)
	require.Equal(t, 2, reg.Count())

	// bag1 should be gone from region index
	bags := reg.bagsInRegion(region1)
	for _, b := range bags {
		require.NotEqual(t, bag1, b, "evicted bag should not be in region index")
	}
}

func TestComputeOverlayID_Deterministic(t *testing.T) {
	t.Parallel()
	bag1 := boc.BagID{0x00}
	bag2 := boc.BagID{0xFF}

	key1 := computeOverlayKey(bag1)
	key2 := computeOverlayKey(bag2)

	require.NotEqual(t, key1, key2)
	require.Len(t, key1, 32)
	require.Equal(t, key1, computeOverlayKey(bag1))
}

func TestDHTRegistrar_StopClean(t *testing.T) {
	t.Parallel()
	mock := &mockDHTStorer{}
	key := generateTestKey(t)
	reg := newDHTRegistrar(mock, nil, 100, key, testLogger())

	ctx, cancel := context.WithCancel(t.Context())
	reg.Start(ctx)
	cancel()

	done := make(chan struct{})
	go func() {
		reg.Stop()
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("Stop did not complete within 2 seconds")
	}
}

func TestXorAffinity(t *testing.T) {
	t.Parallel()
	a := make([]byte, 32)
	b := make([]byte, 32)

	require.Equal(t, uint(256), xorAffinity(a, b))

	b[0] = 0x80
	require.Equal(t, uint(0), xorAffinity(a, b))

	b[0] = 0
	b[1] = 0x01
	require.Equal(t, uint(15), xorAffinity(a, b))
}

func TestRegionCenterKey(t *testing.T) {
	t.Parallel()
	key := regionCenterKey(0xAB)
	require.Len(t, key, 32)
	require.Equal(t, byte(0xAB), key[0])
	require.Equal(t, byte(0), key[1])
}

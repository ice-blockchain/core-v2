package adnl

import (
	"context"
	"fmt"
	"testing"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/stretchr/testify/require"
)

func TestRecoverPanic_CatchesPanicString(t *testing.T) {
	t.Parallel()
	var retErr error
	func() {
		defer recoverPanic(testLogger(), &retErr)
		panic("boom")
	}()

	require.Error(t, retErr)
	require.Contains(t, retErr.Error(), "panic recovered")
}

func TestRecoverPanic_CatchesPanicError(t *testing.T) {
	t.Parallel()
	var retErr error
	func() {
		defer recoverPanic(testLogger(), &retErr)
		panic(fmt.Errorf("unexpected nil"))
	}()

	require.Error(t, retErr)
	require.Contains(t, retErr.Error(), "panic recovered")
}

func TestRecoverPanic_NoPanicPreservesNilError(t *testing.T) {
	t.Parallel()
	var retErr error
	func() {
		defer recoverPanic(testLogger(), &retErr)
	}()

	require.NoError(t, retErr)
}

func TestRecoverPanic_NoPanicPreservesExistingError(t *testing.T) {
	t.Parallel()
	retErr := fmt.Errorf("original error")
	func() {
		defer recoverPanic(testLogger(), &retErr)
	}()

	require.EqualError(t, retErr, "original error")
}

func TestRecoverPanic_CatchesNilPointerPanic(t *testing.T) {
	t.Parallel()
	var retErr error
	func() {
		defer recoverPanic(testLogger(), &retErr)
		var s *string
		_ = *s //nolint:govet // intentional nil dereference for test
	}()

	require.Error(t, retErr)
	require.Contains(t, retErr.Error(), "panic recovered")
}

func TestOverlayManager_HandleIncomingQueryPanicRecovery(t *testing.T) {
	t.Parallel()
	m := newOverlayManager(10, testLogger())
	bagID := boc.BagID{99}

	m.SetQueryHandler(func(_ context.Context, _ boc.BagID, _ []byte) ([]byte, error) {
		panic("handler exploded")
	})
	_ = m.Join(context.Background(), bagID)
	overlayID := ComputeOverlayID(bagID)

	// Simulates what makeADNLHandler does: call HandleIncomingQuery
	// inside a function protected by recoverPanic.
	var retErr error
	func() {
		defer recoverPanic(testLogger(), &retErr)
		_, err := m.HandleIncomingQuery(context.Background(), overlayID, []byte("query"))
		if err != nil {
			retErr = err
		}
	}()

	require.Error(t, retErr)
	require.Contains(t, retErr.Error(), "panic recovered")
}

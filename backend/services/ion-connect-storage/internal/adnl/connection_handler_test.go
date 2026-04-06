package adnl

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRecoverPanic_CatchesPanicString(t *testing.T) {
	var retErr error
	func() {
		defer recoverPanic(testLogger(), &retErr)
		panic("boom")
	}()

	require.Error(t, retErr)
	require.Contains(t, retErr.Error(), "panic recovered")
}

func TestRecoverPanic_CatchesPanicError(t *testing.T) {
	var retErr error
	func() {
		defer recoverPanic(testLogger(), &retErr)
		panic(fmt.Errorf("unexpected nil"))
	}()

	require.Error(t, retErr)
	require.Contains(t, retErr.Error(), "panic recovered")
}

func TestRecoverPanic_NoPanicPreservesNilError(t *testing.T) {
	var retErr error
	func() {
		defer recoverPanic(testLogger(), &retErr)
	}()

	require.NoError(t, retErr)
}

func TestRecoverPanic_NoPanicPreservesExistingError(t *testing.T) {
	retErr := fmt.Errorf("original error")
	func() {
		defer recoverPanic(testLogger(), &retErr)
	}()

	require.EqualError(t, retErr, "original error")
}

func TestRecoverPanic_CatchesNilPointerPanic(t *testing.T) {
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
	m := newOverlayManager(10, testLogger())
	bagID := [32]byte{99}

	m.SetQueryHandler(func(_ context.Context, _ [32]byte, _ []byte) ([]byte, error) {
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

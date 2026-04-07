package ctxlock

import (
	"bytes"
	"context"
	"log/slog"
	"strings"
	"testing"
	"testing/synctest"
	"time"

	"github.com/stretchr/testify/require"
)

func testMutex(buf *bytes.Buffer, interval time.Duration) *Mutex {
	logger := slog.New(slog.NewTextHandler(buf, &slog.HandlerOptions{Level: slog.LevelDebug}))
	return New(logger, interval)
}

func TestLock_uncontended(t *testing.T) {
	t.Parallel()
	var buf bytes.Buffer
	mu := testMutex(&buf, time.Second)

	err := mu.Lock(context.Background(), "op1")
	require.NoError(t, err)
	mu.Unlock()

	require.Empty(t, buf.String(), "no log output expected for uncontended lock")
}

// TestLock_contention_logs_warnings verifies that a goroutine waiting
// for a held lock sees periodic "waiting for lock" warnings, and that
// "lock acquired after contention" is logged once it finally gets the lock.
//
// Uses synctest so the warn intervals elapse in fake time (instant).
func TestLock_contention_logs_warnings(t *testing.T) {
	t.Parallel()
	synctest.Test(t, func(t *testing.T) {
		var buf bytes.Buffer
		mu := testMutex(&buf, 100*time.Millisecond)

		require.NoError(t, mu.Lock(context.Background(), "holder"))

		// Waiter blocks until we release.
		ctx, cancel := context.WithTimeout(context.Background(), 350*time.Millisecond)
		defer cancel()

		done := make(chan error, 1)
		go func() {
			done <- mu.Lock(ctx, "waiter")
		}()

		// Let fake time pass 250ms — enough for two warn ticks.
		time.Sleep(250 * time.Millisecond)
		synctest.Wait()

		logs := buf.String()
		count := strings.Count(logs, "waiting for lock")
		require.GreaterOrEqual(t, count, 2,
			"expected at least 2 contention warnings, got %d:\n%s", count, logs)
		require.Contains(t, logs, `operation=waiter`)

		// Release — waiter acquires.
		mu.Unlock()
		synctest.Wait()

		err := <-done
		require.NoError(t, err)

		logs = buf.String()
		require.Contains(t, logs, "lock acquired after contention")

		mu.Unlock() // waiter's lock
	})
}

func TestLock_context_cancelled(t *testing.T) {
	t.Parallel()
	synctest.Test(t, func(t *testing.T) {
		var buf bytes.Buffer
		mu := testMutex(&buf, 100*time.Millisecond)

		require.NoError(t, mu.Lock(context.Background(), "holder"))

		ctx, cancel := context.WithCancel(context.Background())

		done := make(chan error, 1)
		go func() {
			done <- mu.Lock(ctx, "cancelled-waiter")
		}()

		// Let one warn tick pass.
		time.Sleep(150 * time.Millisecond)
		synctest.Wait()

		cancel()
		synctest.Wait()

		err := <-done
		require.ErrorIs(t, err, context.Canceled)

		logs := buf.String()
		require.Contains(t, logs, "lock wait cancelled")
		require.Contains(t, logs, `operation=cancelled-waiter`)

		mu.Unlock()
	})
}

func TestLock_context_deadline_exceeded(t *testing.T) {
	t.Parallel()
	synctest.Test(t, func(t *testing.T) {
		var buf bytes.Buffer
		mu := testMutex(&buf, 100*time.Millisecond)

		require.NoError(t, mu.Lock(context.Background(), "holder"))

		ctx, cancel := context.WithTimeout(context.Background(), 250*time.Millisecond)
		defer cancel()

		done := make(chan error, 1)
		go func() {
			done <- mu.Lock(ctx, "deadline-waiter")
		}()

		synctest.Wait()

		err := <-done
		require.ErrorIs(t, err, context.DeadlineExceeded)

		logs := buf.String()
		require.Contains(t, logs, "waiting for lock")
		require.Contains(t, logs, "lock wait cancelled")

		mu.Unlock()
	})
}

func TestLock_mutual_exclusion(t *testing.T) {
	t.Parallel()
	synctest.Test(t, func(t *testing.T) {
		var buf bytes.Buffer
		mu := testMutex(&buf, time.Hour) // long interval — no warn logs

		require.NoError(t, mu.Lock(context.Background(), "first"))

		ctx, cancel := context.WithTimeout(context.Background(), time.Hour)
		defer cancel()

		acquired := make(chan struct{})
		go func() {
			_ = mu.Lock(ctx, "second")
			close(acquired)
		}()

		// "second" must not acquire while "first" holds.
		time.Sleep(10 * time.Millisecond)
		synctest.Wait()
		select {
		case <-acquired:
			t.Fatal("second goroutine acquired lock while first still holds it")
		default:
		}

		mu.Unlock()
		synctest.Wait()

		<-acquired
		mu.Unlock()
	})
}

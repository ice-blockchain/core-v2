// Package ctxlock provides a context-aware mutex built on
// golang.org/x/sync/semaphore. It respects context cancellation
// and logs a warning at a configurable interval while contending.
package ctxlock

import (
	"context"
	"log/slog"
	"time"

	"golang.org/x/sync/semaphore"
)

// Mutex is a context-aware mutual exclusion lock.
// Lock blocks until the lock is acquired or the context expires.
// A warning is logged every WarnInterval while waiting.
type Mutex struct {
	sem          *semaphore.Weighted
	logger       *slog.Logger
	warnInterval time.Duration
}

// New creates a Mutex that logs contention warnings at the given interval.
func New(logger *slog.Logger, warnInterval time.Duration) *Mutex {
	return &Mutex{
		sem:          semaphore.NewWeighted(1),
		logger:       logger,
		warnInterval: warnInterval,
	}
}

// Lock acquires the lock or returns ctx.Err() if the context expires.
// Logs a warning every WarnInterval while contending.
func (m *Mutex) Lock(ctx context.Context, operation string) error {
	// Fast path: no contention.
	if m.sem.TryAcquire(1) {
		return nil
	}

	// Slow path: wait with periodic contention warnings.
	start := time.Now()
	for {
		deadline := time.Now().Add(m.warnInterval)
		tryCtx, cancel := context.WithDeadline(ctx, deadline)
		err := m.sem.Acquire(tryCtx, 1)
		cancel()

		if err == nil {
			waited := time.Since(start)
			if waited >= m.warnInterval {
				m.logger.InfoContext(ctx, "lock acquired after contention",
					"operation", operation,
					"waited", waited.Round(time.Millisecond),
				)
			}
			return nil
		}

		// Real context expired — caller disconnected.
		if ctx.Err() != nil {
			m.logger.DebugContext(ctx, "lock wait cancelled",
				"operation", operation,
				"waited", time.Since(start).Round(time.Millisecond),
				"error", ctx.Err(),
			)
			return ctx.Err()
		}

		// Short deadline expired — log and retry.
		m.logger.WarnContext(ctx, "waiting for lock",
			"operation", operation,
			"waited", time.Since(start).Round(time.Millisecond),
		)
	}
}

// Unlock releases the lock.
func (m *Mutex) Unlock() {
	m.sem.Release(1)
}

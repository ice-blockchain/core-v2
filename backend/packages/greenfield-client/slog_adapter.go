package greenfieldclient

import (
	"context"
	"log/slog"
	"time"
)

// SlogAdapter wraps *slog.Logger to implement the Logger interface.
type SlogAdapter struct {
	L     *slog.Logger
	attrs []slog.Attr
}

// NewSlogAdapter creates a Logger backed by the given slog.Logger.
func NewSlogAdapter(l *slog.Logger) Logger {
	return &SlogAdapter{L: l}
}

func (s *SlogAdapter) Debug() LogEvent { return newSlogEvent(s.L, slog.LevelDebug) }
func (s *SlogAdapter) Info() LogEvent  { return newSlogEvent(s.L, slog.LevelInfo) }
func (s *SlogAdapter) Warn() LogEvent  { return newSlogEvent(s.L, slog.LevelWarn) }
func (s *SlogAdapter) Error() LogEvent { return newSlogEvent(s.L, slog.LevelError) }

func (s *SlogAdapter) With() LogContext {
	return &slogContext{logger: s.L}
}

type slogEvent struct {
	logger *slog.Logger
	level  slog.Level
	attrs  []slog.Attr
}

func newSlogEvent(l *slog.Logger, level slog.Level) *slogEvent {
	return &slogEvent{logger: l, level: level}
}

func (e *slogEvent) Err(err error) LogEvent {
	if err != nil {
		e.attrs = append(e.attrs, slog.String("error", err.Error()))
	}
	return e
}

func (e *slogEvent) Str(key, val string) LogEvent {
	e.attrs = append(e.attrs, slog.String(key, val))
	return e
}

func (e *slogEvent) Int64(key string, val int64) LogEvent {
	e.attrs = append(e.attrs, slog.Int64(key, val))
	return e
}

func (e *slogEvent) Int(key string, val int) LogEvent {
	e.attrs = append(e.attrs, slog.Int(key, val))
	return e
}

func (e *slogEvent) Dur(key string, val time.Duration) LogEvent {
	e.attrs = append(e.attrs, slog.Duration(key, val))
	return e
}

func (e *slogEvent) Msg(msg string) {
	e.logger.LogAttrs(context.Background(), e.level, msg, e.attrs...)
}

type slogContext struct {
	logger *slog.Logger
}

func (c *slogContext) Str(key, val string) LogContext {
	c.logger = c.logger.With(slog.String(key, val))
	return c
}

func (c *slogContext) Logger() Logger {
	return &SlogAdapter{L: c.logger}
}

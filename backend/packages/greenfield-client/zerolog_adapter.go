package greenfieldclient

import (
	"time"

	"github.com/rs/zerolog"
)

// ZerologAdapter wraps zerolog.Logger to implement the Logger interface.
type ZerologAdapter struct {
	L zerolog.Logger
}

// NewZerologAdapter creates a Logger backed by the given zerolog.Logger.
func NewZerologAdapter(l zerolog.Logger) Logger {
	return &ZerologAdapter{L: l}
}

func (z *ZerologAdapter) Debug() LogEvent { return &zerologEvent{e: z.L.Debug()} }
func (z *ZerologAdapter) Info() LogEvent  { return &zerologEvent{e: z.L.Info()} }
func (z *ZerologAdapter) Warn() LogEvent  { return &zerologEvent{e: z.L.Warn()} }
func (z *ZerologAdapter) Error() LogEvent { return &zerologEvent{e: z.L.Error()} }

func (z *ZerologAdapter) With() LogContext {
	return &zerologContext{ctx: z.L.With()}
}

type zerologEvent struct {
	e *zerolog.Event
}

func (e *zerologEvent) Err(err error) LogEvent               { e.e = e.e.Err(err); return e }
func (e *zerologEvent) Str(key, val string) LogEvent         { e.e = e.e.Str(key, val); return e }
func (e *zerologEvent) Int64(key string, val int64) LogEvent { e.e = e.e.Int64(key, val); return e }
func (e *zerologEvent) Int(key string, val int) LogEvent     { e.e = e.e.Int(key, val); return e }
func (e *zerologEvent) Dur(key string, val time.Duration) LogEvent {
	e.e = e.e.Dur(key, val)
	return e
}
func (e *zerologEvent) Msg(msg string) { e.e.Msg(msg) }

type zerologContext struct {
	ctx zerolog.Context
}

func (c *zerologContext) Str(key, val string) LogContext {
	c.ctx = c.ctx.Str(key, val)
	return c
}

func (c *zerologContext) Logger() Logger {
	l := c.ctx.Logger()
	return &ZerologAdapter{L: l}
}

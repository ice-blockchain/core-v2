package greenfieldclient

import "time"

// LogEvent accumulates structured fields and emits a log entry on Msg.
type LogEvent interface {
	Err(err error) LogEvent
	Str(key, val string) LogEvent
	Int64(key string, val int64) LogEvent
	Int(key string, val int) LogEvent
	Dur(key string, val time.Duration) LogEvent
	Msg(msg string)
}

// Logger produces structured log events at standard severity levels.
type Logger interface {
	Debug() LogEvent
	Info() LogEvent
	Warn() LogEvent
	Error() LogEvent
	With() LogContext
}

// LogContext builds a child Logger with extra fields.
type LogContext interface {
	Str(key, val string) LogContext
	Logger() Logger
}

// nopLogger discards all log output. Used when no Logger is configured.
type nopLogger struct{}

func (n *nopLogger) Debug() LogEvent  { return &nopEvent{} }
func (n *nopLogger) Info() LogEvent   { return &nopEvent{} }
func (n *nopLogger) Warn() LogEvent   { return &nopEvent{} }
func (n *nopLogger) Error() LogEvent  { return &nopEvent{} }
func (n *nopLogger) With() LogContext { return &nopContext{} }

type nopEvent struct{}

func (e *nopEvent) Err(_ error) LogEvent                   { return e }
func (e *nopEvent) Str(_, _ string) LogEvent               { return e }
func (e *nopEvent) Int64(_ string, _ int64) LogEvent       { return e }
func (e *nopEvent) Int(_ string, _ int) LogEvent           { return e }
func (e *nopEvent) Dur(_ string, _ time.Duration) LogEvent { return e }
func (e *nopEvent) Msg(_ string)                           {}

type nopContext struct{}

func (c *nopContext) Str(_, _ string) LogContext { return c }
func (c *nopContext) Logger() Logger             { return &nopLogger{} }

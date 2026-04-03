package adnl

import (
	"bytes"
	"net/http"
)

// responseWriter captures an HTTP response for RLDP serialization.
type responseWriter struct {
	code    int
	headers http.Header
	body    bytes.Buffer
}

func newResponseWriter() *responseWriter {
	return &responseWriter{
		code:    http.StatusOK,
		headers: make(http.Header),
	}
}

func (w *responseWriter) Header() http.Header {
	return w.headers
}

func (w *responseWriter) Write(b []byte) (int, error) {
	return w.body.Write(b)
}

func (w *responseWriter) WriteHeader(code int) {
	w.code = code
}

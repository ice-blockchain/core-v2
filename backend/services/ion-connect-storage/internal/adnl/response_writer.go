package adnl

import (
	"bytes"
	"fmt"
	"net/http"
)

const maxResponseBodySize = 10 << 20 // 10 MB

// responseWriter captures an HTTP response for RLDP serialization.
type responseWriter struct {
	code    int
	headers http.Header
	body    bytes.Buffer
	err     error
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
	if w.err != nil {
		return 0, w.err
	}
	if w.body.Len()+len(b) > maxResponseBodySize {
		w.err = fmt.Errorf("response body exceeds %d bytes", maxResponseBodySize)
		return 0, w.err
	}
	return w.body.Write(b)
}

func (w *responseWriter) WriteHeader(code int) {
	w.code = code
}

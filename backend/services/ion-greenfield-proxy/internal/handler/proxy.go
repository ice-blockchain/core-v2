package handler

import (
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	"github.com/prometheus/client_golang/prometheus"
)

var upstreamTransport = &http.Transport{
	DialContext:           (&net.Dialer{Timeout: 10 * time.Second}).DialContext,
	ResponseHeaderTimeout: 60 * time.Second,
	IdleConnTimeout:       90 * time.Second,
	MaxIdleConnsPerHost:   10,
}

type proxyMetrics struct {
	upstreamErrors      *prometheus.CounterVec
	upstreamResponseTime *prometheus.HistogramVec
	label               string
}

// timedTransport wraps an http.RoundTripper and records response time.
type timedTransport struct {
	base http.RoundTripper
	pm   *proxyMetrics
}

func (t *timedTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	start := time.Now()
	resp, err := t.base.RoundTrip(req)
	if t.pm != nil {
		t.pm.upstreamResponseTime.WithLabelValues(t.pm.label).Observe(time.Since(start).Seconds())
	}
	return resp, err
}

func newReverseProxy(target *url.URL, logger *slog.Logger, pm *proxyMetrics) *httputil.ReverseProxy {
	transport := http.RoundTripper(upstreamTransport)
	if pm != nil && pm.upstreamResponseTime != nil {
		transport = &timedTransport{base: upstreamTransport, pm: pm}
	}

	return &httputil.ReverseProxy{
		Transport: transport,
		Rewrite: func(req *httputil.ProxyRequest) {
			req.SetURL(target)
		},
		ModifyResponse: func(resp *http.Response) error {
			if pm != nil && resp.StatusCode >= 500 {
				pm.upstreamErrors.WithLabelValues(pm.label).Inc()
			}
			return nil
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			if pm != nil {
				pm.upstreamErrors.WithLabelValues(pm.label).Inc()
			}
			logger.Error("proxy upstream error",
				"method", r.Method,
				"path", r.URL.Path,
				"error", err,
			)
			w.WriteHeader(http.StatusBadGateway)
		},
	}
}

package handler

import (
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"
)

var upstreamTransport = &http.Transport{
	DialContext:           (&net.Dialer{Timeout: 10 * time.Second}).DialContext,
	ResponseHeaderTimeout: 60 * time.Second,
	IdleConnTimeout:       90 * time.Second,
	MaxIdleConnsPerHost:   10,
}

func newReverseProxy(target *url.URL, logger *slog.Logger) *httputil.ReverseProxy {
	return &httputil.ReverseProxy{
		Transport: upstreamTransport,
		Rewrite: func(req *httputil.ProxyRequest) {
			req.SetURL(target)
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			logger.Error("proxy upstream error",
				"method", r.Method,
				"path", r.URL.Path,
				"error", err,
			)
			w.WriteHeader(http.StatusBadGateway)
		},
	}
}

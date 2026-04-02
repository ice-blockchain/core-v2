package handler

import (
	"encoding/base64"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"

	"ion-greenfield-proxy/internal/apperror"
)

// ProxySP handles requests at /sp/{base64Target}[/subpath...].
// It decodes the base64-encoded original SP URL and forwards the request.
// Only HTTPS SP origins are accepted to prevent SSRF to arbitrary hosts.
func ProxySP(logger *slog.Logger, adnlAddress string) gin.HandlerFunc {
	return func(c *gin.Context) {
		raw := strings.TrimPrefix(c.Param("path"), "/")
		if raw == "" {
			apperror.WriteError(c, apperror.New(http.StatusBadRequest, "MISSING_TARGET_SP", "missing target SP in path"))
			return
		}

		// Split "base64Target/sub/path" into the encoded SP origin and the forwarded path.
		encodedTarget, subPath, _ := strings.Cut(raw, "/")

		decoded, err := base64.RawURLEncoding.DecodeString(encodedTarget)
		if err != nil {
			c.Error(err)
			apperror.WriteError(c, apperror.New(http.StatusBadRequest, "INVALID_TARGET_SP", "invalid base64 encoding for target SP"))
			return
		}

		spURL, err := url.Parse(string(decoded))
		if err != nil || spURL.Host == "" {
			apperror.WriteError(c, apperror.New(http.StatusBadRequest, "INVALID_TARGET_SP", "invalid URL in target SP"))
			return
		}

		// Only allow proxying to HTTPS SP endpoints.
		if spURL.Scheme != "https" {
			apperror.WriteError(c, apperror.New(http.StatusForbidden, "INVALID_SP_SCHEME", "only HTTPS storage providers are allowed"))
			return
		}

		forwardPath := "/"
		if subPath != "" {
			forwardPath = "/" + subPath
		}

		// The SDK sets req.Host to the real SP host (including bucket
		// subdomain for virtual-hosted style). Use it directly.
		host := c.Request.Host
		if host == "" || host == adnlAddress {
			host = spURL.Host
		}

		// Validate that the Host header matches the decoded SP origin
		// (either exact or as a subdomain). Prevents forwarding to
		// arbitrary hosts.
		if host != spURL.Host && !strings.HasSuffix(host, "."+spURL.Host) {
			apperror.WriteError(c, apperror.New(http.StatusForbidden, "INVALID_SP_HOST", "host does not match target SP"))
			return
		}

		// If the Host has a bucket subdomain (virtual-hosted style),
		// strip the bucket prefix from the forwarded path.
		if bucket, ok := strings.CutSuffix(host, "."+spURL.Host); ok && bucket != "" {
			forwardPath = strings.TrimPrefix(forwardPath, "/"+bucket)
			if forwardPath == "" {
				forwardPath = "/"
			}
		}

		proxy := newReverseProxy(spURL, logger)
		proxy.Rewrite = func(req *httputil.ProxyRequest) {
			req.Out.URL.Scheme = spURL.Scheme
			req.Out.URL.Host = host
			req.Out.URL.RawQuery = c.Request.URL.RawQuery
			req.Out.URL.Path = forwardPath
			req.Out.Host = host
		}
		proxy.ServeHTTP(c.Writer, c.Request)
	}
}

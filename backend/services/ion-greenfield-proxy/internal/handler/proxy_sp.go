package handler

import (
	"context"
	"encoding/base64"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"

	"ion-greenfield-proxy/internal/apperror"
	"ion-greenfield-proxy/internal/middleware"
)

// ProxySP handles requests at /sp/{base64Target}[/subpath...].
// It decodes the base64-encoded original SP URL and forwards the request.
// Only HTTPS SP origins that belong to known storage providers are accepted.
//
//	@Summary		Proxy to Storage Provider
//	@Description	Decodes the base64url-encoded SP origin from the path, validates it against the known SP allowlist, and reverse-proxies the request. The Host header may carry a bucket subdomain for virtual-hosted style access.
//	@Tags			Storage Provider Proxy
//	@Param			path	path	string	true	"Base64url-encoded SP origin optionally followed by /subpath"
//	@Success		200		"Proxied response from the storage provider"
//	@Failure		400		{object}	apperror.AppError	"MISSING_TARGET_SP / INVALID_TARGET_SP"
//	@Failure		403		{object}	apperror.AppError	"INVALID_SP_SCHEME / SP_VALIDATION_UNAVAILABLE / UNKNOWN_SP / INVALID_SP_HOST"
//	@Failure		503		{object}	apperror.AppError	"SP_LIST_UNAVAILABLE"
//	@Router			/sp/{path} [get]
//	@Router			/sp/{path} [put]
//	@Router			/sp/{path} [post]
//	@Router			/sp/{path} [delete]
func ProxySP(
	logger *slog.Logger,
	adnlAddress string,
	provisioner interface {
		IsKnownSPHost(ctx context.Context, host string) (bool, error)
	},
	allowInsecure bool,
	mc *middleware.MetricsCollectors) gin.HandlerFunc {
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

		// Only allow HTTPS, or HTTP when explicitly permitted.
		if spURL.Scheme != "https" && !(allowInsecure && spURL.Scheme == "http") {
			apperror.WriteError(c, apperror.New(http.StatusForbidden, "INVALID_SP_SCHEME", "only HTTPS storage providers are allowed"))
			return
		}

		// Validate that the target host belongs to a known storage provider.
		// Fail closed: if the provisioner is unavailable, reject the request
		// rather than allowing unvalidated proxying.
		if provisioner == nil {
			apperror.WriteError(c, apperror.New(http.StatusForbidden, "SP_VALIDATION_UNAVAILABLE", "storage provider validation unavailable"))
			return
		}
		known, err := provisioner.IsKnownSPHost(c.Request.Context(), spURL.Host)
		if err != nil {
			logger.Error("failed to check SP allowlist", "host", spURL.Host, "error", err)
			apperror.WriteError(c, apperror.New(http.StatusServiceUnavailable, "SP_LIST_UNAVAILABLE", "storage provider list unavailable"))
			return
		}
		if !known {
			logger.Warn("rejected proxy to unknown SP", "host", spURL.Host)
			apperror.WriteError(c, apperror.New(http.StatusForbidden, "UNKNOWN_SP", "target is not a known storage provider"))
			return
		}

		forwardPath := "/"
		if subPath != "" {
			forwardPath = "/" + subPath
		}

		// The SDK sets req.Host to the real SP host (including bucket
		// subdomain for virtual-hosted style). Use it directly.
		host := c.Request.Host
		if host == "" || strings.EqualFold(host, adnlAddress) {
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

		var pm *proxyMetrics
		if mc != nil {
			pm = &proxyMetrics{
				upstreamErrors:       mc.ProxyUpstreamErrors,
				upstreamResponseTime: mc.ProxyUpstreamResponseTime,
				label:                "sp",
			}
		}
		proxy := newReverseProxy(spURL, logger, pm)
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

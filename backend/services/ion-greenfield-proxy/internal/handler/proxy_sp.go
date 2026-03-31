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
// It validates the Host header matches the expected ADNL address, decodes
// the base64-encoded original SP URL, and forwards the request there.
func ProxySP(logger *slog.Logger, adnlAddress string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !strings.EqualFold(c.Request.Host, adnlAddress) {
			apperror.WriteError(c, apperror.New(http.StatusForbidden, "INVALID_SP_HOST", "request does not match this node"))
			return
		}

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

		urlParsed, err := url.Parse(string(decoded))
		if err != nil {
			c.Error(err)
			apperror.WriteError(c, apperror.New(http.StatusBadRequest, "INVALID_TARGET_SP", "invalid URL in target SP"))
			return
		}

		forwardPath := "/"
		if subPath != "" {
			forwardPath = "/" + subPath
		}

		proxy := newReverseProxy(urlParsed, logger)
		proxy.Rewrite = func(req *httputil.ProxyRequest) {
			req.Out.URL.Scheme = urlParsed.Scheme
			req.Out.URL.Host = urlParsed.Host
			req.Out.URL.RawQuery = c.Request.URL.RawQuery
			req.Out.URL.Path = forwardPath
			req.Out.Host = ""
		}
		proxy.ServeHTTP(c.Writer, c.Request)
	}
}

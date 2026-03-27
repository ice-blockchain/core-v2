package router

import (
	"log/slog"

	"ion-greenfield-proxy/internal/adnl"
	"ion-greenfield-proxy/internal/config"
	"ion-greenfield-proxy/internal/handler"
	"ion-greenfield-proxy/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"go.uber.org/fx"
)

type Params struct {
	fx.In

	Config            *config.Config
	Logger            *slog.Logger
	Registry          *prometheus.Registry
	MetricsCollectors *middleware.MetricsCollectors
}

func New(p Params) *gin.Engine {
	if !p.Config.IsDevelopment() {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(
		adnl.ADNLContextMiddleware(),
		middleware.CORS(),
		middleware.Auth(),
		middleware.FeeGuarantee(),
		middleware.RateLimiter(),
		middleware.Metrics(p.MetricsCollectors),
		middleware.Logger(p.Logger),
	)

	r.GET("/health-check", handler.Health)

	if p.Config.MetricsPort == 0 {
		r.GET("/metrics", handler.MetricsHandler(p.Registry))
	}

	return r
}

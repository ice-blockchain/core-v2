package router

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"os"

	"ion-greenfield-proxy/internal/adnl"
	"ion-greenfield-proxy/internal/config"
	gf "ion-greenfield-proxy/internal/greenfield"
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
	Key               *adnl.Key
	Provisioner       gf.BucketProvisioner
	Lifecycle         fx.Lifecycle
	AllowInsecureSP   bool
}

func New(p Params) (*gin.Engine, error) {
	if !p.Config.IsDevelopment() {
		gin.SetMode(gin.ReleaseMode)
	}

	logger := p.Logger
	if logger == nil {
		logger = slog.New(slog.NewTextHandler(os.Stderr, nil))
	}
	logger = logger.With("component", "router")

	rpcURL, err := url.Parse(p.Config.GreenfieldRPCEndpoint)
	if err != nil {
		return nil, fmt.Errorf("invalid Greenfield RPC endpoint URL: %w", err)
	}

	var proxyAddr string
	if p.Provisioner != nil {
		proxyAddr = p.Provisioner.ProxyAddress()
	}

	chainID := fmt.Sprintf("greenfield_%d-1", p.Config.GreenfieldChainID)
	adnlAddress := p.Key.Address

	rateLimiterMw, stopRateLimiterCleanup := middleware.RateLimiter(logger, p.Config, p.MetricsCollectors)
	if p.Lifecycle != nil {
		p.Lifecycle.Append(fx.Hook{
			OnStop: func(ctx context.Context) error {
				stopRateLimiterCleanup()
				return nil
			},
		})
	}

	r := gin.New()
	r.Use(
		adnl.ADNLContextMiddleware(),
		middleware.CORS(),
	)
	if p.MetricsCollectors != nil {
		r.Use(middleware.Metrics(p.MetricsCollectors))
	}
	r.Use(
		rateLimiterMw,
		middleware.RPCParser(),
		middleware.RPCIntercept(logger, p.Config.GreenfieldRPCEndpoint, adnlAddress, p.Provisioner, chainID),
		middleware.FeeGuarantee(logger, p.Provisioner, proxyAddr, chainID),
		middleware.Logger(logger),
	)

	r.GET("/health-check", handler.Health)
	if p.Config.MetricsPort == 0 && p.Registry != nil {
		r.GET("/metrics", handler.MetricsHandler(p.Registry))
	}

	logger.Info("Starting proxy",
		"upstream_rpc", rpcURL.String(),
		"adnl_address", adnlAddress,
	)
	r.Any("/sp/*path", handler.ProxySP(logger.With("proxy", "sp"), adnlAddress, p.Provisioner, p.AllowInsecureSP))
	r.NoRoute(handler.ProxyRPC(rpcURL, logger.With("proxy", "rpc"), adnlAddress))

	return r, nil
}

package router

import (
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
	Provisioner       *gf.BucketProvisioner
}

func New(p Params) *gin.Engine {
	if !p.Config.IsDevelopment() {
		gin.SetMode(gin.ReleaseMode)
	}

	logger := p.Logger
	if logger == nil {
		logger = slog.New(slog.NewTextHandler(os.Stderr, nil))
	}
	logger = logger.With("component", "router")

	var proxyAddr string
	if p.Provisioner != nil {
		proxyAddr = p.Provisioner.ProxyAddress()
	}

	adnlAddress := p.Key.Address

	r := gin.New()
	r.Use(
		adnl.ADNLContextMiddleware(),
		middleware.CORS(),
		middleware.RPCParser(),
		middleware.RPCIntercept(logger, p.Config.GreenfieldRPCEndpoint, adnlAddress, p.Provisioner),
		middleware.FeeGuarantee(logger, p.Provisioner, proxyAddr),
		middleware.RateLimiter(),
		middleware.Logger(logger),
	)
	if p.MetricsCollectors != nil {
		r.Use(middleware.Metrics(p.MetricsCollectors))
	}

	r.GET("/health-check", handler.Health)
	if p.Config.MetricsPort == 0 && p.Registry != nil {
		r.GET("/metrics", handler.MetricsHandler(p.Registry))
	}

	rpcURL, err := url.Parse(p.Config.GreenfieldRPCEndpoint)
	if err != nil {
		panic("invalid Greenfield RPC endpoint URL: " + err.Error())
	}

	logger.Info("Starting proxy",
		"upstream_rpc", rpcURL.String(),
		"adnl_address", adnlAddress,
	)
	r.Any("/sp/*path", handler.ProxySP(logger.With("proxy", "sp"), adnlAddress))
	r.NoRoute(handler.ProxyRPC(rpcURL, logger.With("proxy", "rpc"), adnlAddress))

	return r
}

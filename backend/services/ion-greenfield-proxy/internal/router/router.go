package router

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"time"

	"ion-greenfield-proxy/internal/adnl"
	"ion-greenfield-proxy/internal/config"
	gf "ion-greenfield-proxy/internal/greenfield"
	"ion-greenfield-proxy/internal/handler"
	"ion-greenfield-proxy/internal/middleware"
	_ "ion-greenfield-proxy/internal/router/docs"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
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
	AllowInsecureSP   bool `optional:"true"`
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

	feeGrantBNB, err := strconv.ParseFloat(p.Config.GreenfieldFeeGrantAmount, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid GREENFIELD_FEE_GRANT_AMOUNT_BNB %q: %w", p.Config.GreenfieldFeeGrantAmount, err)
	}

	rateLimiterMw, stopRateLimiterCleanup := middleware.RateLimiter(logger, p.Config, p.MetricsCollectors)

	var stopGrantCleanup func()
	if p.Provisioner != nil {
		stopGrantCleanup = p.Provisioner.StartGrantCleanup(30 * time.Second)
	}

	if p.Lifecycle != nil {
		p.Lifecycle.Append(fx.Hook{
			OnStop: func(ctx context.Context) error {
				stopRateLimiterCleanup()
				if stopGrantCleanup != nil {
					stopGrantCleanup()
				}
				return nil
			},
		})
	}

	r := gin.New()
	r.SetTrustedProxies(nil)
	r.Use(
		adnl.ADNLContextMiddleware(),
		middleware.CORS(),
	)
	if p.MetricsCollectors != nil {
		r.Use(middleware.Metrics(p.MetricsCollectors))
	}
	r.Use(
		middleware.RPCParser(),
		middleware.RPCIntercept(logger, p.Config.GreenfieldRPCEndpoint, adnlAddress, p.Provisioner, chainID),
		middleware.FeeGuarantee(logger, p.Provisioner, proxyAddr, chainID, p.MetricsCollectors, feeGrantBNB),
		rateLimiterMw,
		middleware.Logger(logger),
	)

	r.GET("/doc/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	r.GET("/docs", func(c *gin.Context) { c.Redirect(http.StatusMovedPermanently, "/doc/index.html") })
	r.GET("/health-check", handler.Health)
	if p.Config.MetricsPort == 0 && p.Registry != nil {
		r.GET("/metrics", handler.MetricsHandler(p.Registry))
	}
	r.GET("/guarantor", handler.Guarantor(proxyAddr, p.Config.GreenfieldFeeGrantAmount))

	logger.Info("Starting proxy",
		"upstream_rpc", rpcURL.String(),
		"adnl_address", adnlAddress,
	)
	r.Any("/sp/*path", handler.ProxySP(logger.With("proxy", "sp"), adnlAddress, p.Provisioner, p.AllowInsecureSP, p.MetricsCollectors))
	r.NoRoute(handler.ProxyRPC(rpcURL, logger.With("proxy", "rpc"), adnlAddress, p.MetricsCollectors))

	return r, nil
}

package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"ion-greenfield-proxy/internal/config"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/fx"
)

func NewHTTPServer(cfg *config.Config, router *gin.Engine, logger *slog.Logger, lc fx.Lifecycle) {
	srv := &http.Server{
		Addr:    fmt.Sprintf("127.0.0.1:%d", cfg.Port),
		Handler: router,
	}

	lc.Append(fx.Hook{
		OnStart: func(_ context.Context) error {
			logger.Info("http server starting", "addr", srv.Addr)
			result := make(chan error, 1)
			go func() {
				err := srv.ListenAndServe()
				if err != nil && err != http.ErrServerClosed {
					logger.Error("http server error", "error", err)
					select {
					case result <- err:
					default:
					}
				}
			}()
			select {
			case err := <-result:
				return err
			case <-time.After(300 * time.Millisecond):
				logger.Info("http server started")
			}
			return nil
		},
		OnStop: func(ctx context.Context) error {
			logger.Info("http server stopping")
			return srv.Shutdown(ctx)
		},
	})
}

func NewMetricsServer(cfg *config.Config, reg *prometheus.Registry, logger *slog.Logger, lc fx.Lifecycle) {
	if cfg.MetricsPort == 0 {
		return
	}

	mux := http.NewServeMux()
	mux.Handle("/metrics", promhttp.HandlerFor(reg, promhttp.HandlerOpts{}))

	srv := &http.Server{
		Addr:    fmt.Sprintf("127.0.0.1:%d", cfg.MetricsPort),
		Handler: mux,
	}

	lc.Append(fx.Hook{
		OnStart: func(_ context.Context) error {
			logger.Info("metrics server starting", "addr", srv.Addr)
			result := make(chan error, 1)
			go func() {
				err := srv.ListenAndServe()
				if err != nil && err != http.ErrServerClosed {
					logger.Error("metrics server error", "error", err)
					select {
					case result <- err:
					default:
					}
				}
			}()
			select {
			case err := <-result:
				return err
			case <-time.After(300 * time.Millisecond):
				logger.Info("metrics server started")
			}
			return nil
		},
		OnStop: func(ctx context.Context) error {
			logger.Info("metrics server stopping")
			return srv.Shutdown(ctx)
		},
	})
}

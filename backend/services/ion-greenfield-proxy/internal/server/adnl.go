package server

import (
	"context"
	"log/slog"

	"ion-greenfield-proxy/internal/adnl"

	"go.uber.org/fx"
)

func NewADNLServer(listener *adnl.Listener, logger *slog.Logger, lc fx.Lifecycle) {
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			logger.Info("adnl server starting")
			return listener.Start(ctx)
		},
		OnStop: func(_ context.Context) error {
			logger.Info("adnl server stopping")
			return listener.Stop()
		},
	})
}

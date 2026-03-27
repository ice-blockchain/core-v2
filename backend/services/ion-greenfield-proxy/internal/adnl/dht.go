package adnl

import (
	"context"
	"log/slog"
	"time"

	"ion-greenfield-proxy/internal/config"

	"github.com/xssnick/tonutils-go/adnl/dht"
	"go.uber.org/fx"
)

const (
	dhtPublishInterval = 1 * time.Minute
	dhtPublishTTL      = 5 * time.Minute
	dhtInitialDelay    = 15 * time.Second
	dhtRetryDelay      = 30 * time.Second
	dhtMaxInitRetries  = 5
)

// StartDHTPublisher bootstraps a DHT client from the global config URL
// and periodically publishes the service's ADNL address to the DHT.
func StartDHTPublisher(
	cfg *config.Config, key *Key, listener *Listener,
	logger *slog.Logger, lc fx.Lifecycle,
) {
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			gate := listener.Gateway()
			if gate == nil {
				logger.Warn("DHT publish skipped — ADNL gateway not started")
				return nil
			}

			dhtClient, err := dht.NewClientFromConfigUrl(ctx, gate, cfg.ADNLConfigURL)
			if err != nil {
				logger.Error("DHT bootstrap failed", "url", cfg.ADNLConfigURL, "error", err)
				return err
			}
			logger.Info("DHT client connected", "config_url", cfg.ADNLConfigURL)

			go publishLoop(ctx, dhtClient, key, listener, logger)
			return nil
		},
		OnStop: func(_ context.Context) error {
			return nil
		},
	})
}

func publishLoop(
	ctx context.Context, client *dht.Client,
	key *Key, listener *Listener, logger *slog.Logger,
) {
	if !waitFor(ctx, dhtInitialDelay) {
		return
	}

	// Retry the initial publish — DHT routing may not be ready yet.
	for attempt := 1; attempt <= dhtMaxInitRetries; attempt++ {
		if err := publish(ctx, client, key, listener, logger); err == nil {
			break
		}
		logger.Warn("DHT publish not ready, retrying",
			"attempt", attempt, "max", dhtMaxInitRetries, "retry_in", dhtRetryDelay)
		if !waitFor(ctx, dhtRetryDelay) {
			return
		}
	}

	ticker := time.NewTicker(dhtPublishInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := publish(ctx, client, key, listener, logger); err != nil {
				logger.Error("DHT publish failed", "error", err)
			}
		}
	}
}

func publish(
	ctx context.Context, client *dht.Client,
	key *Key, listener *Listener, logger *slog.Logger,
) error {
	addrList := listener.Gateway().GetAddressList()
	if len(addrList.Addresses) == 0 {
		logger.Warn("DHT publish skipped — address list is empty")
		return nil
	}

	_, _, err := client.StoreAddress(ctx, addrList, dhtPublishTTL, key.Private, 0)
	if err != nil {
		return err
	}
	logger.Info("DHT address published", "adnl_address", key.Address)
	return nil
}

func waitFor(ctx context.Context, d time.Duration) bool {
	select {
	case <-ctx.Done():
		return false
	case <-time.After(d):
		return true
	}
}

package greenfield

import (
	"log/slog"

	"ion-greenfield-proxy/internal/config"

	"go.uber.org/fx"
)

func RegisterDNS(cfg *config.Config, logger *slog.Logger, lc fx.Lifecycle) {
	if cfg.DNSPrivateKey == "" || cfg.DNSName == "" {
		logger.Warn("DNS registration skipped — DNS_PRIVATE_KEY or DNS_NAME not configured")
		return
	}

	logger.Info("DNS registration configured", "dns_name", cfg.DNSName)
	// Phase 4+: submit changeRecord transaction to register ADNL address
	// under cfg.DNSName using cfg.DNSPrivateKey.
}

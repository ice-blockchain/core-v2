package main

import (
	"flag"
	"log"
	"log/slog"

	"ion-greenfield-proxy/internal/config"
	appfx "ion-greenfield-proxy/internal/fx"

	"go.uber.org/fx"
	"go.uber.org/fx/fxevent"
)

func main() {
	adnlKey := flag.String("adnl-key", "", "ADNL Ed25519 private key (overrides ADNL_PRIVATE_KEY)")
	dnsKey := flag.String("dns-key", "", "DNS wallet private key (overrides DNS_PRIVATE_KEY)")
	dnsName := flag.String("dns-name", "", ".ion domain name (overrides DNS_NAME)")
	flag.Parse()

	cfg, err := config.Load(*adnlKey, *dnsKey, *dnsName)
	if err != nil {
		log.Fatal(err)
	}

	fx.New(
		fx.Supply(cfg),
		appfx.ObservabilityModule,
		appfx.ADNLModule,
		appfx.RouterModule,
		appfx.ServerModule,
		appfx.GreenfieldModule,
		fx.WithLogger(func(log *slog.Logger) fxevent.Logger {
			return &fxevent.SlogLogger{Logger: log}
		}),
	).Run()
}

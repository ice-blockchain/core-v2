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

//	@title			ION Greenfield Proxy API
//	@version		1.0
//	@description	Transparent reverse proxy between ION clients and BNB Greenfield (RPC + Storage Provider endpoints).
//	@description
//	@description	Most requests pass through unmodified. The middleware layer intercepts three classes of requests:
//	@description
//	@description	1. **StorageProviders ABCI Query** -- rewrites SP endpoint URLs so all subsequent SP traffic is routed back through this proxy (`/sp/{base64}`).
//	@description	2. **CreateBucket Broadcast** -- intercepts `MsgCreateBucket` where `bucket_name == creator_address`, creates the bucket using the proxy's signing key, grants object CRUD permissions and SP delegation to the user, and returns a synthetic broadcast result.
//	@description	3. **Fee Allowance Grant** -- for `broadcast_tx_sync`/`commit` containing `MsgCreateObject`, `MsgDelegateCreateObject`, `MsgUpdateObjectContent`, `MsgDeleteObject`, or `MsgDeleteBucket` with `fee_granter == proxy_address`, submits a short-lived `MsgGrantAllowance` on-chain before forwarding the original transaction.
//	@description
//	@description	The proxy listens on two transports: HTTP/TCP (localhost) and ADNL/RLDP (ION overlay network). Both feed into the same Gin engine and middleware stack.
//	@BasePath		/
func main() {
	adnlKey := flag.String("adnl-key", "", "ADNL Ed25519 private key (overrides ADNL_PRIVATE_KEY)")
	flag.Parse()

	cfg, err := config.Load(*adnlKey)
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

package fx

import (
	"ion-greenfield-proxy/internal/adnl"
	"ion-greenfield-proxy/internal/greenfield"
	"ion-greenfield-proxy/internal/middleware"
	"ion-greenfield-proxy/internal/observability"
	"ion-greenfield-proxy/internal/router"
	"ion-greenfield-proxy/internal/server"

	"go.uber.org/fx"
)

var ObservabilityModule = fx.Options(
	fx.Provide(observability.NewLogger),
	fx.Provide(observability.NewRegistry),
	fx.Provide(middleware.NewMetricsCollectors),
)

var RouterModule = fx.Options(
	fx.Provide(router.New),
)

var ADNLModule = fx.Options(
	fx.Provide(adnl.NewKey),
	fx.Provide(adnl.NewListener),
)

var ServerModule = fx.Options(
	fx.Invoke(server.NewHTTPServer),
	fx.Invoke(server.NewMetricsServer),
	fx.Invoke(server.NewADNLServer),
	fx.Invoke(adnl.StartDHTPublisher),
)

var GreenfieldModule = fx.Options(
	fx.Provide(greenfield.NewClient),
	fx.Provide(greenfield.NewBucketProvisioner),
)

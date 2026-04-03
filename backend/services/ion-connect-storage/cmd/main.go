package main

import (
	"context"
	"log/slog"
	"net"
	"os"
	"os/signal"
	"strconv"
	"sync"
	"syscall"
	"time"

	"github.com/cockroachdb/pebble/v2"
	"github.com/gin-gonic/gin"
	greenfieldclient "github.com/ice-blockchain/ion/packages/greenfield-client"
	ionadnl "github.com/ice-blockchain/ion/services/ion-connect-storage/internal/adnl"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/cache"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/cluster"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/config"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/greenfield"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/health"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/index"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/metrics"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/provider"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/storage"
)

func main() {
	logger := createLogger()

	cfg, err := config.Load()
	if err != nil {
		logger.Error("load config failed", "error", err)
		os.Exit(1)
	}

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	db, gfClient, err := openBagIndex(cfg, logger)
	if err != nil {
		logger.Error("open bag index failed", "error", err)
		os.Exit(1)
	}
	defer db.Close()
	defer gfClient.Close()

	server, err := createServer(ctx, cfg, logger)
	if err != nil {
		logger.Error("create server failed", "error", err)
		os.Exit(1)
	}

	if err := server.Start(ctx); err != nil {
		logger.Error("start server failed", "error", err)
		os.Exit(1)
	}

	coord := createCoordinator(cfg, db, server, logger)

	m := metrics.NewMetrics()
	persister := index.NewPersister(db)
	fetcher := greenfield.NewFetcher(gfClient, logger)
	adnlAddr := adnlAddrFromGateway(server)
	providerIndex := provider.NewProviderIndex(db, adnlAddr, coord, logger)

	persister.SetOnBagIndexed(func(bagID [32]byte) {
		if err := providerIndex.Register(bagID); err != nil {
			logger.Error("provider register failed", "error", err)
		}
	})

	publicEngine := createPublicEngine(providerIndex)
	bridge := ionadnl.NewRLDPHTTPBridge(ctx, publicEngine, logger)
	server.SetHTTPBridge(bridge)

	privateEngine := createPrivateEngine(gfClient, db, server, coord, m, cfg)

	metadataStore := cache.NewMetadataStore(db, fetcher, persister, logger)
	segmentCache := cache.NewSegmentCache(cfg.CacheDir, cfg.CacheTTL, func(bagID [32]byte) {
		server.DHTRegistrar().Deregister(bagID)
		_ = server.OverlayManager().Leave(bagID)
	}, logger)

	storageHandler := storage.NewHandler(storage.HandlerConfig{
		MetadataStore:    metadataStore,
		SegmentCache:     segmentCache,
		Fetcher:          fetcher,
		Index:            persister,
		OwnershipChecker: coord,
		PieceForwarder:   coord,
		PrivateKey:       server.PrivateKey(),
		Logger:           logger,
	})
	server.OverlayManager().SetQueryHandler(storageHandler.HandleOverlayQuery)
	sessionInit := storage.NewSessionInitiator(storageHandler, logger)
	server.OverlayManager().SetSessionCallback(sessionInit.OnNewSession)

	// Wire piece handler for cluster forwarding (needs storage handler to be created first).
	if realCoord, ok := coord.(*cluster.Coordinator); ok && realCoord.Transport() != nil {
		realCoord.Transport().SetPieceHandler(storageHandler.ServePiece)
		realCoord.Transport().SetRawQueryHandler(storageHandler.HandleOverlayQuery)
	}
	logger.Info("cache layer initialized", "cache_dir", cfg.CacheDir, "cache_ttl", cfg.CacheTTL)

	// Subscriber starts AFTER coordinator to avoid indexing without CRDT claims.
	sub := index.NewSubscriber(gfClient, persister, coord, cfg.OnlineIOEnv, logger)
	var subscriberWg sync.WaitGroup
	subscriberWg.Add(1)
	go func() {
		defer subscriberWg.Done()
		if err := sub.Run(ctx); err != nil && ctx.Err() == nil {
			logger.Error("subscriber failed", "error", err)
		}
	}()

	go health.StartServer(ctx, privateEngine, "127.0.0.1:"+cfg.HttpPort, logger)
	startSeparateMetricsServer(ctx, cfg, m, logger)

	logger.Info("ion-connect-storage started")
	<-ctx.Done()

	logger.Info("shutdown signal received")
	bridge.Stop()
	subscriberWg.Wait()
	shutdownServer(server, logger)
	logger.Info("ion-connect-storage stopped")
}

func createCoordinator(cfg config.Config, db *pebble.DB, server *ionadnl.Server, logger *slog.Logger) coordinatorInterface {
	adnlAddr := adnlAddrFromGateway(server)
	ip, port := parseExternalAddr(cfg.AdnlExternalAddr)

	if !cfg.ClusterEnabled() {
		nodeID := cfg.NodeID
		if nodeID == "" {
			nodeID = hexEncodeAddr(adnlAddr)
		}
		return cluster.NewSingleNodeCoordinator(nodeID, adnlAddr, ip, port)
	}

	nodeID := cfg.NodeID
	if nodeID == "" {
		nodeID = hexEncodeAddr(adnlAddr)
	}

	coord, err := cluster.NewCoordinator(cluster.CoordinatorConfig{
		NodeID:                nodeID,
		ClusterOverlayID:      cfg.ClusterOverlayID,
		ADNLAddress:           hexEncodeAddr(adnlAddr),
		ExternalIP:            ip,
		ExternalPort:          port,
		DB:                    db,
		Logger:                logger,
		HeartbeatInterval:     cfg.HeartbeatInterval,
		ReclamationInterval:   cfg.ReclamationInterval,
		StaleHeartbeatTimeout: cfg.StaleHeartbeatTimeout,
	})
	if err != nil {
		logger.Error("create coordinator failed", "error", err)
		os.Exit(1)
	}

	// Wire CRDT transport over ADNL cluster overlay.
	overlayID := cluster.ComputeClusterOverlayID(cfg.ClusterOverlayID)
	transport := cluster.NewClusterTransport(server, overlayID, coord.Broadcaster(), coord.DAGService(), logger)
	transport.RegisterWithServer()
	coord.SetTransport(transport)
	coord.SetPieceForwarder(cluster.NewPieceForwarder(transport, coord, nil, logger))

	if err := coord.Start(context.Background()); err != nil {
		logger.Error("start coordinator failed", "error", err)
		os.Exit(1)
	}

	return coord
}

// coordinatorInterface combines all cluster interfaces.
type coordinatorInterface interface {
	index.OwnershipChecker
	storage.LocalOwnershipChecker
	storage.PieceForwarder
	provider.OwnerResolver
	health.ClusterChecker
}

func openBagIndex(cfg config.Config, logger *slog.Logger) (*pebble.DB, greenfieldclient.Client, error) {
	db, err := pebble.Open(cfg.DataDir, &pebble.Options{})
	if err != nil {
		return nil, nil, err
	}
	gfClient, err := greenfieldclient.New(greenfieldclient.Config{
		RpcURLs:    cfg.GreenfieldRpcURLs,
		ChainID:    cfg.GreenfieldChainID,
		PrivateKey: cfg.GreenfieldPrivKey,
		Logger:     greenfieldclient.NewSlogAdapter(logger),
	})
	if err != nil {
		db.Close()
		return nil, nil, err
	}
	return db, gfClient, nil
}

func createLogger() *slog.Logger {
	level := parseLogLevel(os.Getenv("LOG_LEVEL"))
	return slog.New(slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{Level: level}))
}

func parseLogLevel(raw string) slog.Level {
	switch raw {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

func createServer(ctx context.Context, cfg config.Config, logger *slog.Logger) (*ionadnl.Server, error) {
	return ionadnl.NewServer(ctx, ionadnl.ServerConfig{
		AdnlPrivateKey:  cfg.AdnlPrivateKey,
		GlobalConfigURL: cfg.GlobalConfigURL,
		Port:            cfg.AdnlPort,
		ExternalAddr:    cfg.AdnlExternalAddr,
		ActiveDHTLimit:  cfg.ActiveDHTLimit,
	}, logger)
}

func shutdownServer(server *ionadnl.Server, logger *slog.Logger) {
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := server.Stop(shutdownCtx); err != nil {
		logger.Error("server stop error", "error", err)
	}
}

func adnlAddrFromGateway(server *ionadnl.Server) [32]byte {
	id := server.Gateway().GetID()
	var addr [32]byte
	copy(addr[:], id)
	return addr
}

func createPublicEngine(providerIndex *provider.ProviderIndex) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	engine := gin.New()
	engine.Use(gin.Recovery())
	provider.RegisterRoutes(engine, providerIndex)
	return engine
}

func createPrivateEngine(
	gfClient greenfieldclient.Client,
	db *pebble.DB,
	server *ionadnl.Server,
	clusterChecker health.ClusterChecker,
	m *metrics.Metrics,
	cfg config.Config,
) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	engine := gin.New()
	engine.Use(gin.Recovery())

	health.RegisterRoutes(engine, health.Deps{
		GFClient:       gfClient,
		DB:             db,
		Server:         server,
		ClusterChecker: clusterChecker,
	})

	if cfg.MetricsPort == "" || cfg.MetricsPort == cfg.HttpPort {
		metrics.RegisterRoutes(engine, m.Registry())
	}

	return engine
}

func startSeparateMetricsServer(ctx context.Context, cfg config.Config, m *metrics.Metrics, logger *slog.Logger) {
	if cfg.MetricsPort == "" || cfg.MetricsPort == cfg.HttpPort {
		return
	}
	metricsEngine := gin.New()
	metrics.RegisterRoutes(metricsEngine, m.Registry())
	go health.StartServer(ctx, metricsEngine, "127.0.0.1:"+cfg.MetricsPort, logger)
}

func parseExternalAddr(addr string) (string, int) {
	host, portStr, err := net.SplitHostPort(addr)
	if err != nil {
		return addr, 0
	}
	port, _ := strconv.Atoi(portStr)
	return host, port
}

func hexEncodeAddr(addr [32]byte) string {
	const hex = "0123456789abcdef"
	out := make([]byte, 64)
	for i, v := range addr {
		out[i*2] = hex[v>>4]
		out[i*2+1] = hex[v&0x0f]
	}
	return string(out)
}

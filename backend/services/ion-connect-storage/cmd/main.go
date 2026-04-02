package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/cockroachdb/pebble/v2"
	greenfieldclient "github.com/ice-blockchain/ion/packages/greenfield-client"
	ionadnl "github.com/ice-blockchain/ion/services/ion-connect-storage/internal/adnl"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/cache"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/config"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/greenfield"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/index"
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

	persister := index.NewPersister(db)
	fetcher := greenfield.NewFetcher(gfClient, logger)

	sub := index.NewSubscriber(gfClient, persister, cfg.OnlineIOEnv, logger)

	var subscriberWg sync.WaitGroup
	subscriberWg.Add(1)
	go func() {
		defer subscriberWg.Done()
		if err := sub.Run(ctx); err != nil && ctx.Err() == nil {
			logger.Error("subscriber failed", "error", err)
		}
	}()

	server, err := createServer(ctx, cfg, logger)
	if err != nil {
		logger.Error("create server failed", "error", err)
		os.Exit(1)
	}

	metadataStore := cache.NewMetadataStore(db, fetcher, persister, logger)
	segmentCache := cache.NewSegmentCache(cfg.CacheDir, cfg.CacheTTL, func(bagID [32]byte) {
		server.DHTRegistrar().Deregister(bagID)
		_ = server.OverlayManager().Leave(bagID)
	}, logger)
	_ = metadataStore // consumed by Phase 4 storage handler
	_ = segmentCache  // consumed by Phase 4 storage handler
	logger.Info("cache layer initialized", "cache_dir", cfg.CacheDir, "cache_ttl", cfg.CacheTTL)

	go startHealthServer(ctx, cfg.HttpPort, logger)

	if err := server.Start(ctx); err != nil {
		logger.Error("start server failed", "error", err)
		os.Exit(1)
	}

	logger.Info("ion-connect-storage started")
	<-ctx.Done()

	logger.Info("shutdown signal received")
	subscriberWg.Wait()
	shutdownServer(server, logger)
	logger.Info("ion-connect-storage stopped")
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

func startHealthServer(ctx context.Context, port string, logger *slog.Logger) {
	mux := http.NewServeMux()
	mux.HandleFunc("/health-check", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 5 * time.Second,
		IdleTimeout:  30 * time.Second,
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdownCtx)
	}()

	logger.Info("health server started", "addr", ":"+port)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("health server failed", "error", err)
	}
}

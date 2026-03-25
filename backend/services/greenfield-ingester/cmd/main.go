package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	greenfieldclient "github.com/AudiusProject/ion/packages/greenfield-client"
	"github.com/AudiusProject/ion/services/greenfield-ingester/internal/config"
	"github.com/AudiusProject/ion/services/greenfield-ingester/internal/ingester"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
)

func startHealthServer(ctx context.Context, ing *ingester.Ingester, log zerolog.Logger) {
	mux := http.NewServeMux()
	mux.HandleFunc("/health-check", func(w http.ResponseWriter, r *http.Request) {
		if ing.IsHealthy() {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("ok"))
			return
		}
		w.WriteHeader(http.StatusServiceUnavailable)
		_, _ = w.Write([]byte("unhealthy"))
	})

	server := &http.Server{
		Addr:         ":8080",
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

	log.Info().Str("addr", ":8080").Msg("health server started")
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Error().Err(err).Msg("health server failed")
	}
}

func main() {
	log := zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr}).
		With().Timestamp().Str("service", "greenfield-ingester").Logger()

	level, err := zerolog.ParseLevel(os.Getenv("LOG_LEVEL"))
	if err != nil || level == zerolog.NoLevel {
		level = zerolog.InfoLevel
	}
	log = log.Level(level)

	ctx, cancel := signal.NotifyContext(
		context.Background(),
		syscall.SIGINT,
		syscall.SIGTERM,
	)
	defer cancel()

	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("load config")
	}

	gfClient, err := greenfieldclient.New(greenfieldclient.Config{
		RpcURLs:    cfg.GreenfieldRpcURLs,
		ChainID:    cfg.GreenfieldChainID,
		PrivateKey: cfg.GreenfieldPrivKey,
		Logger:     log,
	})
	if err != nil {
		log.Fatal().Err(err).Msg("create greenfield client")
	}
	defer gfClient.Close()

	redisOpts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		log.Fatal().Err(err).Msg("parse redis url")
	}

	redisClient := redis.NewClient(redisOpts)
	defer redisClient.Close()

	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Fatal().Err(err).Msg("redis ping")
	}

	ing := ingester.New(gfClient, redisClient, cfg.QueueName, cfg.OnlineIOEnv, log)

	go startHealthServer(ctx, ing, log)

	log.Info().Str("queue", cfg.QueueName).Msg("starting greenfield-ingester")

	if err := ing.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
		log.Fatal().Err(err).Msg("ingester run")
	}

	log.Info().Msg("greenfield-ingester stopped")
}

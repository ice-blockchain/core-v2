//go:build e2e

package storage

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/cockroachdb/pebble/v2"
	"github.com/gin-gonic/gin"
	ionadnl "github.com/ice-blockchain/ion/services/ion-connect-storage/internal/adnl"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/cache"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/greenfield"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/index"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/provider"
	"github.com/stretchr/testify/require"
	"github.com/syndtr/goleveldb/leveldb"
	ldbstorage "github.com/syndtr/goleveldb/leveldb/storage"
	"github.com/xssnick/tonutils-go/adnl"
	adnladdr "github.com/xssnick/tonutils-go/adnl/address"
	"github.com/xssnick/tonutils-go/adnl/dht"
	tonoverlay "github.com/xssnick/tonutils-go/adnl/overlay"
	tondb "github.com/xssnick/tonutils-storage/db"
	tonstorage "github.com/xssnick/tonutils-storage/storage"
)

// NodeCoordinator combines all cluster interfaces needed by a storage node.
type NodeCoordinator interface {
	LocalOwnershipChecker
	PieceForwarder
	provider.OwnerResolver
	index.OwnershipChecker
}

// SeederEnv holds the components of a storage node for e2e tests.
type SeederEnv struct {
	Server         *ionadnl.Server
	SegmentCache   *cache.SegmentCache
	MetadataStore  *cache.MetadataStore
	Persister      *index.Persister
	ProviderIndex  *provider.ProviderIndex
	StorageHandler *Handler
	DB             *pebble.DB
	CacheDir       string
	ADNLAddr       [32]byte
	Port           int
}

// SetupSeederServer creates a full storage node: ADNL server, storage handler,
// provider index, and subscriber (running). The subscriber is connected to
// Greenfield websocket and processes events in a background goroutine.
func SetupSeederServer(
	t *testing.T,
	greenfieldPrivKey string,
	coord NodeCoordinator,
	logger *slog.Logger,
) *SeederEnv {
	t.Helper()

	_, key, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)
	port := AllocatePort(t)
	externalAddr := fmt.Sprintf("127.0.0.1:%d", port)

	ctx := context.Background()
	server, err := ionadnl.NewServer(ctx, ionadnl.ServerConfig{
		AdnlPrivateKey:  hex.EncodeToString(key.Seed()),
		GlobalConfigURL: E2EGlobalConfigURL(),
		Port:            port,
		ExternalAddr:    externalAddr,
		ActiveDHTLimit:  100,
	}, logger)
	require.NoError(t, err)
	require.NoError(t, server.Start(ctx))

	db, err := pebble.Open(t.TempDir(), &pebble.Options{})
	require.NoError(t, err)

	gfClient := greenfield.CreateE2EClient(t, greenfieldPrivKey)

	persister := index.NewPersister(db)
	fetcher := greenfield.NewFetcher(gfClient, logger)
	metadataStore := cache.NewMetadataStore(db, fetcher, persister, logger)
	cacheDir := t.TempDir()
	segmentCache := cache.NewSegmentCache(cacheDir, time.Hour, func(bagID [32]byte) {
		server.DHTRegistrar().Deregister(bagID)
		_ = server.OverlayManager().Leave(bagID)
	}, logger)

	var adnlAddr [32]byte
	copy(adnlAddr[:], server.Gateway().GetID())

	providerIndex := provider.NewProviderIndex(db, adnlAddr, coord, logger)
	persister.SetOnBagIndexed(func(bagID [32]byte) {
		if pErr := providerIndex.Register(bagID); pErr != nil {
			logger.Error("provider register failed", "error", pErr)
		}
		// Auto-join overlay when a bag is indexed.
		if jErr := server.OverlayManager().Join(context.Background(), bagID); jErr != nil {
			logger.Error("overlay join failed", "error", jErr)
		}
	})

	// Start subscriber -- connects to Greenfield websocket.
	sub := index.NewSubscriber(gfClient, persister, coord, greenfield.E2EEnv, logger)
	subCtx, subCancel := context.WithCancel(context.Background())
	var subWg sync.WaitGroup
	subWg.Add(1)
	go func() {
		defer subWg.Done()
		if sErr := sub.Run(subCtx); sErr != nil && subCtx.Err() == nil {
			logger.Error("subscriber failed", "error", sErr)
		}
	}()

	gin.SetMode(gin.ReleaseMode)
	publicEngine := gin.New()
	provider.RegisterRoutes(publicEngine, providerIndex)
	bridge := ionadnl.NewRLDPHTTPBridge(ctx, publicEngine, logger)
	server.SetHTTPBridge(bridge)

	storageHandler := NewHandler(HandlerConfig{
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
	sessionInit := NewSessionInitiator(storageHandler, logger)
	server.OverlayManager().SetSessionCallback(sessionInit.OnNewSession)

	// All handlers wired -- mark server ready for incoming connections.
	server.MarkReady()

	t.Cleanup(func() {
		bridge.Stop()
		subCancel()
		subWg.Wait()
		_ = server.Stop(context.Background())
		db.Close()
		gfClient.Close()
	})

	return &SeederEnv{
		Server:         server,
		SegmentCache:   segmentCache,
		MetadataStore:  metadataStore,
		Persister:      persister,
		ProviderIndex:  providerIndex,
		StorageHandler: storageHandler,
		DB:             db,
		CacheDir:       cacheDir,
		ADNLAddr:       adnlAddr,
		Port:           port,
	}
}

// WaitForBagIndexed polls until a bag appears in the persister index.
func WaitForBagIndexed(t *testing.T, persister *index.Persister, bagID [32]byte, timeout time.Duration) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		_, found, err := persister.LookupBag(bagID)
		if err == nil && found {
			return
		}
		time.Sleep(500 * time.Millisecond)
	}
	t.Fatalf("bag %s not indexed within %s", hex.EncodeToString(bagID[:8]), timeout)
}

// SetupDownloader creates a tonutils-storage downloader client.
func SetupDownloader(t *testing.T, bagID [32]byte, dhtClient *dht.Client) (*tonstorage.Torrent, *tonstorage.Server) {
	t.Helper()

	_, key, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)
	port := AllocatePort(t)
	gate := adnl.NewGateway(key)
	gate.SetAddressList([]*adnladdr.UDP{{
		IP:   net.ParseIP("127.0.0.1"),
		Port: int32(port),
	}})
	require.NoError(t, gate.StartServer(fmt.Sprintf("127.0.0.1:%d", port), 1))
	t.Cleanup(func() { gate.Close() })

	srv := tonstorage.NewServer(dhtClient, gate, key, false, 1)
	downloadDir := t.TempDir()
	ldb, err := leveldb.Open(ldbstorage.NewMemStorage(), nil)
	require.NoError(t, err)
	t.Cleanup(func() { ldb.Close() })

	connector := tonstorage.NewConnector(srv)
	store, err := tondb.NewStorage(ldb, connector, int(boc.PieceSize), false, true, false, nil)
	require.NoError(t, err)
	srv.SetStorage(store)

	torrent := tonstorage.NewTorrent(downloadDir, store, connector)
	torrent.BagID = bagID[:]
	require.NoError(t, store.SetTorrent(torrent))
	return torrent, srv
}

// WaitForDownloadComplete polls until the torrent download finishes or timeout.
func WaitForDownloadComplete(t *testing.T, torrent *tonstorage.Torrent, timeout time.Duration) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if torrent.IsCompleted() {
			return
		}
		time.Sleep(100 * time.Millisecond)
	}
	t.Fatalf("download timeout: %d pieces downloaded", torrent.DownloadedPiecesNum())
}

// ConnectDownloaderToNode establishes a tonutils-storage connection.
func ConnectDownloaderToNode(t *testing.T, torrent *tonstorage.Torrent, srv *tonstorage.Server, server *ionadnl.Server) {
	t.Helper()

	bagID := [32]byte(torrent.BagID)
	seedNode, err := tonoverlay.NewNode(bagID[:], server.PrivateKey())
	require.NoError(t, err)
	addrs := server.Gateway().GetAddressList()

	require.NoError(t, torrent.Start(false, true, false))

	connectCtx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	err = srv.ConnectToNode(connectCtx, torrent, seedNode, &addrs)
	require.NoError(t, err)
}

// AllocatePort finds an available UDP port.
func AllocatePort(t *testing.T) int {
	t.Helper()
	conn, err := net.ListenPacket("udp4", ":0")
	require.NoError(t, err)
	port := conn.LocalAddr().(*net.UDPAddr).Port
	_ = conn.Close()
	return port
}

// E2EGlobalConfigURL returns the TON global config URL for e2e tests.
func E2EGlobalConfigURL() string {
	if u := os.Getenv("GLOBAL_CONFIG_URL"); u != "" {
		return u
	}
	return "https://ton.org/testnet-global.config.json"
}

// E2ELogger creates a debug-level logger for e2e tests.
func E2ELogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))
}

// GenerateE2EPayload creates a deterministic payload of the given size.
func GenerateE2EPayload(size int) []byte {
	buf := make([]byte, size)
	for i := range buf {
		buf[i] = byte((i*31 + 17) % 251)
	}
	return buf
}

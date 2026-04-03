//go:build e2e

package storage_test

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/cockroachdb/pebble/v2"
	ionadnl "github.com/ice-blockchain/ion/services/ion-connect-storage/internal/adnl"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/cache"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/cluster"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/greenfield"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/index"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/storage"
	"github.com/stretchr/testify/require"
	"github.com/syndtr/goleveldb/leveldb"
	ldbstorage "github.com/syndtr/goleveldb/leveldb/storage"
	"github.com/xssnick/tonutils-go/adnl"
	adnladdr "github.com/xssnick/tonutils-go/adnl/address"
	"github.com/xssnick/tonutils-go/adnl/dht"
	"github.com/xssnick/tonutils-go/adnl/overlay"
	tondb "github.com/xssnick/tonutils-storage/db"
	tonstorage "github.com/xssnick/tonutils-storage/storage"
)

type seederEnv struct {
	server        *ionadnl.Server
	segmentCache  *cache.SegmentCache
	metadataStore *cache.MetadataStore
	persister     *index.Persister
	cacheDir      string
}

func globalConfigURL() string {
	if u := os.Getenv("GLOBAL_CONFIG_URL"); u != "" {
		return u
	}
	return "https://ton.org/testnet-global.config.json"
}

// TestE2E_DownloadViaTonutils uploads data to Greenfield, then verifies that
// a tonutils-storage client can download the bag over real ADNL/RLDP.
func TestE2E_DownloadViaTonutils(t *testing.T) {
	privKey := os.Getenv("GREENFIELD_E2E_PRIVATE_KEY")
	if privKey == "" {
		t.Skip("GREENFIELD_E2E_PRIVATE_KEY not set")
	}

	ctx := context.Background()
	logger := e2eLogger()
	payload := generateE2EPayload(t, 64*1024+137)

	bucketName := fmt.Sprintf("e2e-storage-%d", time.Now().UnixMilli())
	objectName := fmt.Sprintf("payload-%d", time.Now().UnixMilli())

	header := boc.SingleFileHeader(objectName, uint64(len(payload)))
	bagID, ionStorageData := boc.MustBuildIonStorageBoC(t, payload, boc.PieceSize, header)
	t.Logf("bag ID: %s", hex.EncodeToString(bagID[:]))

	meta, err := boc.ParseIonStorageBoC(ionStorageData, logger)
	require.NoError(t, err)

	greenfield.UploadToGreenfield(t, ctx, privKey, bucketName, objectName, payload, ionStorageData, bagID)

	env := setupSeederServer(t, privKey, bucketName, objectName, bagID, ionStorageData, logger)
	defer env.server.Stop(context.Background())

	downTorrent, downSrv := setupDownloader(t, bagID, env.server.DHTClient())

	seedNode, err := overlay.NewNode(bagID[:], env.server.PrivateKey())
	require.NoError(t, err)
	addrs := env.server.Gateway().GetAddressList()

	err = downTorrent.Start(false, true, false)
	require.NoError(t, err)

	connectCtx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()
	err = downSrv.ConnectToNode(connectCtx, downTorrent, seedNode, &addrs)
	require.NoError(t, err)

	waitForDownloadComplete(t, downTorrent, 60*time.Second)
	verifyDownloadedContent(t, downTorrent, meta, payload)
	verifySegmentCache(t, env, bagID, objectName, payload)
	verifyMetadataStore(t, ctx, env, bagID, meta)
	verifyGreenFieldNotRefetched(t, env, bagID)

	downTorrent.Stop()
	downTorrent.Wait()
	downSrv.Stop()
}

func verifyDownloadedContent(t *testing.T, torrent *tonstorage.Torrent, meta *boc.BagMetadata, payload []byte) {
	t.Helper()
	require.NotNil(t, torrent.Header, "header should be resolved")
	require.NotNil(t, torrent.Info, "info should be resolved")

	nameEnd := torrent.Header.NameIndex[0]
	fileName := string(torrent.Header.Names[:nameEnd])
	downloadedPath := filepath.Join(torrent.Path, string(torrent.Header.DirName), fileName)
	got, err := os.ReadFile(downloadedPath)
	require.NoError(t, err)
	require.True(t, bytes.Equal(got, payload), "payload mismatch: got %d bytes, want %d", len(got), len(payload))
	_ = meta
}

func verifySegmentCache(t *testing.T, env *seederEnv, bagID [32]byte, objectName string, payload []byte) {
	t.Helper()

	segmentCount := (len(payload) + boc.SegmentSize - 1) / boc.SegmentSize
	for i := range segmentCount {
		require.True(t, env.segmentCache.HasSegment(bagID, i), "segment %d should be cached", i)

		data, ok, err := env.segmentCache.GetSegment(bagID, i)
		require.NoError(t, err)
		require.True(t, ok, "segment %d should be readable", i)

		start := i * boc.SegmentSize
		end := min(start+boc.SegmentSize, len(payload))
		require.Equal(t, payload[start:end], data, "segment %d data mismatch", i)
	}

	bagDir := filepath.Join(env.cacheDir, hex.EncodeToString(bagID[:]))
	_, err := os.Stat(filepath.Join(bagDir, objectName))
	require.NoError(t, err, "cached file should exist on disk")

	info, err := os.Stat(filepath.Join(bagDir, objectName))
	require.NoError(t, err)
	require.Equal(t, int64(len(payload)), info.Size(), "cached file size mismatch")
}

func verifyMetadataStore(t *testing.T, ctx context.Context, env *seederEnv, bagID [32]byte, meta *boc.BagMetadata) {
	t.Helper()

	hasMeta, err := env.metadataStore.HasBagMetadata(bagID)
	require.NoError(t, err)
	require.True(t, hasMeta, "metadata should exist in store")

	storedMeta, err := env.metadataStore.GetBagMetadata(ctx, bagID)
	require.NoError(t, err)
	require.Equal(t, bagID, storedMeta.BagID)
	require.Equal(t, meta.FileSize, storedMeta.FileSize)
	require.Equal(t, meta.HeaderSize+meta.FileSize-meta.HeaderSize, storedMeta.FileSize)
	require.Equal(t, meta.PieceSize, storedMeta.PieceSize)
	require.Equal(t, meta.PieceCount, storedMeta.PieceCount)
	require.Equal(t, meta.RootHash, storedMeta.RootHash)
	require.Equal(t, meta.HeaderHash, storedMeta.HeaderHash)
	require.NotNil(t, storedMeta.Header)
	require.Equal(t, len(meta.Header.Files), len(storedMeta.Header.Files))
	require.Equal(t, meta.Header.Files[0].Name, storedMeta.Header.Files[0].Name)
	require.Equal(t, meta.Header.Files[0].Size, storedMeta.Header.Files[0].Size)
	require.NotNil(t, storedMeta.MerkleTree, "merkle tree should be persisted")
	require.Equal(t, meta.MerkleTree.Hash(), storedMeta.MerkleTree.Hash(), "merkle tree root hash mismatch")

	loc, found, err := env.persister.LookupBag(bagID)
	require.NoError(t, err)
	require.True(t, found, "bag should be in index")
	require.NotEmpty(t, loc.BucketName)
	require.NotEmpty(t, loc.ObjectName)
}

func verifyGreenFieldNotRefetched(t *testing.T, env *seederEnv, bagID [32]byte) {
	t.Helper()

	segmentCount := 0
	for i := 0; env.segmentCache.HasSegment(bagID, i); i++ {
		segmentCount++
	}
	require.True(t, segmentCount > 0, "at least one segment should be cached")
}

func setupSeederServer(
	t *testing.T, greenfieldPrivKey, bucketName, objectName string,
	bagID [32]byte, ionStorageData []byte, logger *slog.Logger,
) *seederEnv {
	t.Helper()

	_, key, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)
	port := randomPort()
	externalAddr := fmt.Sprintf("127.0.0.1:%d", port)

	ctx := context.Background()
	server, err := ionadnl.NewServer(ctx, ionadnl.ServerConfig{
		AdnlPrivateKey:  hex.EncodeToString(key.Seed()),
		GlobalConfigURL: globalConfigURL(),
		Port:            port,
		ExternalAddr:    externalAddr,
		ActiveDHTLimit:  100,
	}, logger)
	require.NoError(t, err)
	require.NoError(t, server.Start(ctx))

	db, err := pebble.Open(t.TempDir(), &pebble.Options{})
	require.NoError(t, err)
	t.Cleanup(func() { db.Close() })

	gfClient := greenfield.CreateE2EClient(t, greenfieldPrivKey)
	t.Cleanup(func() { gfClient.Close() })

	persister := index.NewPersister(db)
	fetcher := greenfield.NewFetcher(gfClient, logger)
	metadataStore := cache.NewMetadataStore(db, fetcher, persister, logger)
	cacheDir := t.TempDir()
	segmentCache := cache.NewSegmentCache(cacheDir, time.Hour, nil, logger)

	require.NoError(t, persister.PersistBagsAndHeight([]index.BagEntry{
		{BagID: bagID, Location: index.BagLocation{BucketName: bucketName, ObjectName: objectName}},
	}, 1))
	require.NoError(t, metadataStore.PutBagMetadata(bagID, ionStorageData))

	singleNode := cluster.NewSingleNodeCoordinator("test-node", [32]byte{}, "127.0.0.1", 0)
	storageHandler := storage.NewHandler(storage.HandlerConfig{
		MetadataStore:    metadataStore,
		SegmentCache:     segmentCache,
		Fetcher:          fetcher,
		Index:            persister,
		OwnershipChecker: singleNode,
		PieceForwarder:   singleNode,
		PrivateKey:       server.PrivateKey(),
		Logger:           logger,
	})
	server.OverlayManager().SetQueryHandler(storageHandler.HandleOverlayQuery)
	sessionInit := storage.NewSessionInitiator(storageHandler, logger)
	server.OverlayManager().SetSessionCallback(sessionInit.OnNewSession)
	require.NoError(t, server.OverlayManager().Join(ctx, bagID))

	return &seederEnv{
		server:        server,
		segmentCache:  segmentCache,
		metadataStore: metadataStore,
		persister:     persister,
		cacheDir:      cacheDir,
	}
}

func setupDownloader(
	t *testing.T, bagID [32]byte, dhtClient *dht.Client,
) (*tonstorage.Torrent, *tonstorage.Server) {
	t.Helper()

	_, key, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)
	port := randomPort()
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

func waitForDownloadComplete(t *testing.T, torrent *tonstorage.Torrent, timeout time.Duration) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if torrent.IsCompleted() {
			return
		}
		time.Sleep(100 * time.Millisecond)
	}
	t.Fatalf("timeout: downloaded %d pieces", torrent.DownloadedPiecesNum())
}

func randomPort() int {
	return 10000 + int(time.Now().UnixNano()%50000)
}

func generateE2EPayload(t *testing.T, size int) []byte {
	t.Helper()
	buf := make([]byte, size)
	for i := range buf {
		buf[i] = byte((i*31 + 17) % 251)
	}
	return buf
}

func e2eLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))
}

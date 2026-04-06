package cache

import (
	"context"
	"io"
	"log/slog"
	"os"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/cockroachdb/pebble/v2"
	greenfieldclient "github.com/ice-blockchain/ion/packages/greenfield-client"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/greenfield"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/index"
	"github.com/stretchr/testify/require"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))
}

func openTestDB(t *testing.T) *pebble.DB {
	t.Helper()
	db, err := pebble.Open(t.TempDir(), &pebble.Options{})
	require.NoError(t, err)
	t.Cleanup(func() { db.Close() })
	return db
}

func buildTestBoC(t *testing.T) ([]byte, [32]byte) {
	t.Helper()
	payload := make([]byte, 1024)
	bagID, rawBoC := boc.MustBuildIonStorageBoC(t, payload, boc.PieceSize, boc.SingleFileHeader("test-object", uint64(len(payload))))
	return rawBoC, bagID
}

func TestMetadataStorePutAndGet(t *testing.T) {
	db := openTestDB(t)
	store := NewMetadataStore(db, nil, nil, testLogger())

	rawBoC, bagID := buildTestBoC(t)
	require.NoError(t, store.PutBagMetadata(bagID, rawBoC))

	meta, err := store.GetBagMetadata(context.Background(), bagID)
	require.NoError(t, err)
	require.Equal(t, bagID, meta.BagID)
	require.NotNil(t, meta.Header)
	require.Equal(t, "test-object", meta.Header.Files[0].Name)
}

func TestMetadataStoreGetNotFoundInIndexReturnsError(t *testing.T) {
	db := openTestDB(t)
	persister := index.NewPersister(db)
	fetcher := greenfield.NewFetcher(&noopGreenfieldClient{}, testLogger())
	store := NewMetadataStore(db, fetcher, persister, testLogger())

	var bagID [32]byte
	bagID[0] = 0xAA
	_, err := store.GetBagMetadata(context.Background(), bagID)
	require.Error(t, err)
	require.Contains(t, err.Error(), "bag not found in index")
}

func TestMetadataStoreGetFetchesOnCacheMiss(t *testing.T) {
	db := openTestDB(t)
	rawBoC, bagID := buildTestBoC(t)
	persister := index.NewPersister(db)
	require.NoError(t, persister.PersistBagsAndHeight([]index.BagEntry{
		{BagID: bagID, Location: index.BagLocation{BucketName: "b", ObjectName: "o"}},
	}, 1))

	mock := &mockFetcherClient{metadataBoC: rawBoC}
	fetcher := greenfield.NewFetcher(mock, testLogger())
	store := NewMetadataStore(db, fetcher, persister, testLogger())

	meta, err := store.GetBagMetadata(context.Background(), bagID)
	require.NoError(t, err)
	require.Equal(t, bagID, meta.BagID)
	require.True(t, mock.getObjectCalls.Load() > 0)

	callsBefore := mock.getObjectCalls.Load()
	meta2, err := store.GetBagMetadata(context.Background(), bagID)
	require.NoError(t, err)
	require.Equal(t, bagID, meta2.BagID)
	require.Equal(t, callsBefore, mock.getObjectCalls.Load())
}

func TestMetadataStoreDelete(t *testing.T) {
	db := openTestDB(t)
	store := NewMetadataStore(db, nil, nil, testLogger())

	rawBoC, bagID := buildTestBoC(t)
	require.NoError(t, store.PutBagMetadata(bagID, rawBoC))

	has, err := store.HasBagMetadata(bagID)
	require.NoError(t, err)
	require.True(t, has)

	require.NoError(t, store.DeleteBagMetadata(bagID))
	has, err = store.HasBagMetadata(bagID)
	require.NoError(t, err)
	require.False(t, has)
}

func TestMetadataStoreHas(t *testing.T) {
	db := openTestDB(t)
	store := NewMetadataStore(db, nil, nil, testLogger())

	var emptyID [32]byte
	has, err := store.HasBagMetadata(emptyID)
	require.NoError(t, err)
	require.False(t, has)

	rawBoC, bagID := buildTestBoC(t)
	require.NoError(t, store.PutBagMetadata(bagID, rawBoC))
	has, err = store.HasBagMetadata(bagID)
	require.NoError(t, err)
	require.True(t, has)
}

func TestMetadataStoreKeyIsolation(t *testing.T) {
	db := openTestDB(t)
	store := NewMetadataStore(db, nil, nil, testLogger())

	var bagID [32]byte
	bagID[0] = 0xBB
	idxKey := make([]byte, len("idx/bag/")+32)
	copy(idxKey, "idx/bag/")
	copy(idxKey[len("idx/bag/"):], bagID[:])
	require.NoError(t, db.Set(idxKey, []byte(`{"bucket":"b","object":"o"}`), pebble.Sync))

	has, err := store.HasBagMetadata(bagID)
	require.NoError(t, err)
	require.False(t, has)
}

func TestValidateBagMetadataRejectsMismatchedBagID(t *testing.T) {
	meta := &boc.BagMetadata{
		BagID:      [32]byte{0x01},
		PieceSize:  boc.PieceSize,
		FileSize:   1024,
		PieceCount: 1,
	}
	err := validateBagMetadata([32]byte{0x02}, meta)
	require.Error(t, err)
	require.Contains(t, err.Error(), "bag ID mismatch")
}

func TestValidateBagMetadataRejectsZeroPieceSize(t *testing.T) {
	id := [32]byte{0x01}
	meta := &boc.BagMetadata{
		BagID:      id,
		PieceSize:  0,
		FileSize:   1024,
		PieceCount: 1,
	}
	err := validateBagMetadata(id, meta)
	require.Error(t, err)
	require.Contains(t, err.Error(), "piece size is zero")
}

func TestValidateBagMetadataRejectsZeroPieceCount(t *testing.T) {
	id := [32]byte{0x01}
	meta := &boc.BagMetadata{
		BagID:      id,
		PieceSize:  boc.PieceSize,
		FileSize:   1024,
		PieceCount: 0,
	}
	err := validateBagMetadata(id, meta)
	require.Error(t, err)
	require.Contains(t, err.Error(), "piece count")
}

func TestValidateBagMetadataRejectsHeaderExceedingFile(t *testing.T) {
	id := [32]byte{0x01}
	meta := &boc.BagMetadata{
		BagID:      id,
		PieceSize:  boc.PieceSize,
		FileSize:   100,
		HeaderSize: 200,
		PieceCount: 1,
	}
	err := validateBagMetadata(id, meta)
	require.Error(t, err)
	require.Contains(t, err.Error(), "header size")
}

func TestValidateBagMetadataAcceptsValid(t *testing.T) {
	id := [32]byte{0x01}
	meta := &boc.BagMetadata{
		BagID:      id,
		PieceSize:  boc.PieceSize,
		FileSize:   1024,
		HeaderSize: 100,
		PieceCount: 1,
	}
	require.NoError(t, validateBagMetadata(id, meta))
}

type noopGreenfieldClient struct{}

func (c *noopGreenfieldClient) Subscribe(_ context.Context, _ greenfieldclient.SubscribeOpts) (<-chan *greenfieldclient.TxEvent, error) {
	return nil, nil
}
func (c *noopGreenfieldClient) IsSubscribed() bool { return false }
func (c *noopGreenfieldClient) GetObject(_ context.Context, _, _ string, _ greenfieldclient.GetObjectOpts) (io.ReadCloser, greenfieldclient.ObjectStat, error) {
	return io.NopCloser(strings.NewReader("")), greenfieldclient.ObjectStat{}, nil
}
func (c *noopGreenfieldClient) FGetObject(_ context.Context, _, _, _ string, _ greenfieldclient.GetObjectOpts) error {
	return nil
}
func (c *noopGreenfieldClient) FGetObjectResumable(_ context.Context, _, _, _ string, _ greenfieldclient.GetObjectOpts) error {
	return nil
}
func (c *noopGreenfieldClient) Close() error { return nil }

type mockFetcherClient struct {
	noopGreenfieldClient
	metadataBoC    []byte
	getObjectCalls atomic.Int64
}

func (m *mockFetcherClient) GetObject(_ context.Context, _, objectName string, _ greenfieldclient.GetObjectOpts) (io.ReadCloser, greenfieldclient.ObjectStat, error) {
	m.getObjectCalls.Add(1)
	if strings.HasSuffix(objectName, ".ionstorage") {
		return io.NopCloser(strings.NewReader(string(m.metadataBoC))), greenfieldclient.ObjectStat{Size: int64(len(m.metadataBoC))}, nil
	}
	return io.NopCloser(strings.NewReader("")), greenfieldclient.ObjectStat{}, nil
}

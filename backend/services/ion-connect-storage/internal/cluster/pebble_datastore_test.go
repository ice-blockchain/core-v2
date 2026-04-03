package cluster

import (
	"context"
	"testing"

	"github.com/cockroachdb/pebble/v2"
	ds "github.com/ipfs/go-datastore"
	dsq "github.com/ipfs/go-datastore/query"
	"github.com/stretchr/testify/require"
)

func openTestDB(t *testing.T) *pebble.DB {
	t.Helper()
	db, err := pebble.Open(t.TempDir(), &pebble.Options{})
	require.NoError(t, err)
	t.Cleanup(func() { db.Close() })
	return db
}

func TestPebbleDatastorePutGet(t *testing.T) {
	store := NewPebbleDatastore(openTestDB(t), "crdt/")
	ctx := context.Background()
	key := ds.NewKey("/test/key1")

	err := store.Put(ctx, key, []byte("value1"))
	require.NoError(t, err)

	val, err := store.Get(ctx, key)
	require.NoError(t, err)
	require.Equal(t, []byte("value1"), val)
}

func TestPebbleDatastoreNotFound(t *testing.T) {
	store := NewPebbleDatastore(openTestDB(t), "crdt/")
	ctx := context.Background()

	_, err := store.Get(ctx, ds.NewKey("/missing"))
	require.ErrorIs(t, err, ds.ErrNotFound)
}

func TestPebbleDatastoreHas(t *testing.T) {
	store := NewPebbleDatastore(openTestDB(t), "crdt/")
	ctx := context.Background()
	key := ds.NewKey("/test/exists")

	has, err := store.Has(ctx, key)
	require.NoError(t, err)
	require.False(t, has)

	require.NoError(t, store.Put(ctx, key, []byte("v")))

	has, err = store.Has(ctx, key)
	require.NoError(t, err)
	require.True(t, has)
}

func TestPebbleDatastoreGetSize(t *testing.T) {
	store := NewPebbleDatastore(openTestDB(t), "crdt/")
	ctx := context.Background()
	key := ds.NewKey("/test/sized")

	_, err := store.GetSize(ctx, key)
	require.ErrorIs(t, err, ds.ErrNotFound)

	require.NoError(t, store.Put(ctx, key, []byte("12345")))

	size, err := store.GetSize(ctx, key)
	require.NoError(t, err)
	require.Equal(t, 5, size)
}

func TestPebbleDatastoreDelete(t *testing.T) {
	store := NewPebbleDatastore(openTestDB(t), "crdt/")
	ctx := context.Background()
	key := ds.NewKey("/test/deleteme")

	require.NoError(t, store.Put(ctx, key, []byte("gone")))
	require.NoError(t, store.Delete(ctx, key))

	_, err := store.Get(ctx, key)
	require.ErrorIs(t, err, ds.ErrNotFound)
}

func TestPebbleDatastoreQueryPrefix(t *testing.T) {
	store := NewPebbleDatastore(openTestDB(t), "crdt/")
	ctx := context.Background()

	require.NoError(t, store.Put(ctx, ds.NewKey("/own/bag1"), []byte("nodeA")))
	require.NoError(t, store.Put(ctx, ds.NewKey("/own/bag2"), []byte("nodeB")))
	require.NoError(t, store.Put(ctx, ds.NewKey("/heartbeat/nodeA"), []byte("123")))

	results, err := store.Query(ctx, dsq.Query{Prefix: "/own/"})
	require.NoError(t, err)

	var entries []dsq.Entry
	for r := range results.Next() {
		require.NoError(t, r.Error)
		entries = append(entries, r.Entry)
	}
	require.Len(t, entries, 2)
	require.Equal(t, []byte("nodeA"), entries[0].Value)
	require.Equal(t, []byte("nodeB"), entries[1].Value)
}

func TestPebbleDatastoreQueryKeysOnly(t *testing.T) {
	store := NewPebbleDatastore(openTestDB(t), "crdt/")
	ctx := context.Background()

	require.NoError(t, store.Put(ctx, ds.NewKey("/x/a"), []byte("val")))

	results, err := store.Query(ctx, dsq.Query{Prefix: "/x/", KeysOnly: true})
	require.NoError(t, err)

	for r := range results.Next() {
		require.NoError(t, r.Error)
		require.Nil(t, r.Value)
		require.Contains(t, r.Key, "/x/a")
	}
}

func TestPebbleDatastoreBatch(t *testing.T) {
	store := NewPebbleDatastore(openTestDB(t), "crdt/")
	ctx := context.Background()

	batch, err := store.Batch(ctx)
	require.NoError(t, err)

	require.NoError(t, batch.Put(ctx, ds.NewKey("/b/1"), []byte("one")))
	require.NoError(t, batch.Put(ctx, ds.NewKey("/b/2"), []byte("two")))
	require.NoError(t, batch.Commit(ctx))

	val, err := store.Get(ctx, ds.NewKey("/b/1"))
	require.NoError(t, err)
	require.Equal(t, []byte("one"), val)

	val, err = store.Get(ctx, ds.NewKey("/b/2"))
	require.NoError(t, err)
	require.Equal(t, []byte("two"), val)
}

func TestPebbleDatastorePrefixIsolation(t *testing.T) {
	db := openTestDB(t)
	storeA := NewPebbleDatastore(db, "a/")
	storeB := NewPebbleDatastore(db, "b/")
	ctx := context.Background()

	require.NoError(t, storeA.Put(ctx, ds.NewKey("/key"), []byte("from-a")))
	require.NoError(t, storeB.Put(ctx, ds.NewKey("/key"), []byte("from-b")))

	valA, err := storeA.Get(ctx, ds.NewKey("/key"))
	require.NoError(t, err)
	require.Equal(t, []byte("from-a"), valA)

	valB, err := storeB.Get(ctx, ds.NewKey("/key"))
	require.NoError(t, err)
	require.Equal(t, []byte("from-b"), valB)
}

func TestPrefixUpperBound(t *testing.T) {
	require.Equal(t, []byte{0x62}, prefixUpperBound([]byte{0x61}))
	require.Equal(t, []byte{0x62, 0x00}, prefixUpperBound([]byte{0x61, 0xff}))
	require.Nil(t, prefixUpperBound([]byte{0xff}))
	require.Nil(t, prefixUpperBound([]byte{}))
}

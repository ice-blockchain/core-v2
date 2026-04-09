package index

import (
	"testing"

	"github.com/cockroachdb/pebble/v2"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/stretchr/testify/require"
)

func openTestDB(t *testing.T) *pebble.DB {
	t.Helper()
	db, err := pebble.Open(t.TempDir(), &pebble.Options{})
	require.NoError(t, err)
	t.Cleanup(func() { db.Close() })
	return db
}

func TestPersistBagsAndHeight_SingleEntry(t *testing.T) {
	db := openTestDB(t)
	p := NewPersister(db)

	bagID := boc.BagID{1, 2, 3}
	loc := BagLocation{BucketName: "bucket-a", ObjectName: "object-a"}

	err := p.PersistBagsAndHeight([]BagEntry{{BagID: bagID, Location: loc}}, 100)
	require.NoError(t, err)

	h, err := p.LoadLastHeight()
	require.NoError(t, err)
	require.Equal(t, int64(100), h)

	got, found, err := p.LookupBag(bagID)
	require.NoError(t, err)
	require.True(t, found)
	require.Equal(t, loc, got)
}

func TestPersistBagsAndHeight_MultipleEntries(t *testing.T) {
	db := openTestDB(t)
	p := NewPersister(db)

	entries := []BagEntry{
		{BagID: boc.BagID{1}, Location: BagLocation{"b1", "o1"}},
		{BagID: boc.BagID{2}, Location: BagLocation{"b2", "o2"}},
		{BagID: boc.BagID{3}, Location: BagLocation{"b3", "o3"}},
	}

	err := p.PersistBagsAndHeight(entries, 500)
	require.NoError(t, err)

	h, err := p.LoadLastHeight()
	require.NoError(t, err)
	require.Equal(t, int64(500), h)

	for _, e := range entries {
		got, found, err := p.LookupBag(e.BagID)
		require.NoError(t, err)
		require.True(t, found)
		require.Equal(t, e.Location, got)
	}
}

func TestLoadHeight_Empty(t *testing.T) {
	db := openTestDB(t)
	p := NewPersister(db)

	h, err := p.LoadLastHeight()
	require.NoError(t, err)
	require.Equal(t, int64(0), h)
}

func TestLookupBag_NotFound(t *testing.T) {
	db := openTestDB(t)
	p := NewPersister(db)

	_, found, err := p.LookupBag(boc.BagID{99})
	require.NoError(t, err)
	require.False(t, found)
}

func TestPersistBagsAndHeight_OverwritesBag(t *testing.T) {
	db := openTestDB(t)
	p := NewPersister(db)

	bagID := boc.BagID{42}
	loc1 := BagLocation{"bucket-old", "object-old"}
	loc2 := BagLocation{"bucket-new", "object-new"}

	err := p.PersistBagsAndHeight([]BagEntry{{bagID, loc1}}, 10)
	require.NoError(t, err)

	err = p.PersistBagsAndHeight([]BagEntry{{bagID, loc2}}, 20)
	require.NoError(t, err)

	got, found, err := p.LookupBag(bagID)
	require.NoError(t, err)
	require.True(t, found)
	require.Equal(t, loc2, got)

	h, err := p.LoadLastHeight()
	require.NoError(t, err)
	require.Equal(t, int64(20), h)
}

package cluster

import (
	"context"
	"strings"

	"github.com/cockroachdb/pebble/v2"
	ds "github.com/ipfs/go-datastore"
	dsq "github.com/ipfs/go-datastore/query"
)

// PebbleDatastore adapts PebbleDB to the go-datastore Batching interface.
// All keys are prefixed with a configurable prefix for isolation.
// Does NOT own the *pebble.DB -- caller manages its lifecycle.
type PebbleDatastore struct {
	db     *pebble.DB
	prefix string
}

// NewPebbleDatastore creates a datastore adapter with the given key prefix.
func NewPebbleDatastore(db *pebble.DB, prefix string) *PebbleDatastore {
	return &PebbleDatastore{db: db, prefix: prefix}
}

func (d *PebbleDatastore) pebbleKey(key ds.Key) []byte {
	return []byte(d.prefix + key.String())
}

func (d *PebbleDatastore) dsKey(pebbleKey []byte) ds.Key {
	return ds.NewKey(strings.TrimPrefix(string(pebbleKey), d.prefix))
}

// Get retrieves the value for the given key.
func (d *PebbleDatastore) Get(_ context.Context, key ds.Key) ([]byte, error) {
	val, closer, err := d.db.Get(d.pebbleKey(key))
	if err == pebble.ErrNotFound {
		return nil, ds.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	defer closer.Close()
	result := make([]byte, len(val))
	copy(result, val)
	return result, nil
}

// Has checks if the key exists.
func (d *PebbleDatastore) Has(_ context.Context, key ds.Key) (bool, error) {
	_, closer, err := d.db.Get(d.pebbleKey(key))
	if err == pebble.ErrNotFound {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	closer.Close()
	return true, nil
}

// GetSize returns the size of the value for the given key.
func (d *PebbleDatastore) GetSize(_ context.Context, key ds.Key) (int, error) {
	val, closer, err := d.db.Get(d.pebbleKey(key))
	if err == pebble.ErrNotFound {
		return -1, ds.ErrNotFound
	}
	if err != nil {
		return -1, err
	}
	size := len(val)
	closer.Close()
	return size, nil
}

// Put stores a key-value pair.
func (d *PebbleDatastore) Put(_ context.Context, key ds.Key, value []byte) error {
	return d.db.Set(d.pebbleKey(key), value, pebble.Sync)
}

// Delete removes a key.
func (d *PebbleDatastore) Delete(_ context.Context, key ds.Key) error {
	return d.db.Delete(d.pebbleKey(key), pebble.Sync)
}

// Sync flushes writes. PebbleDB uses Sync on each write, so this is a no-op.
func (d *PebbleDatastore) Sync(_ context.Context, _ ds.Key) error {
	return nil
}

// Close is a no-op -- this adapter does not own the database.
func (d *PebbleDatastore) Close() error {
	return nil
}

// Query searches the datastore with prefix matching and optional filters.
func (d *PebbleDatastore) Query(_ context.Context, q dsq.Query) (dsq.Results, error) {
	prefix := d.prefix + q.Prefix
	return dsq.ResultsFromIterator(q, dsq.Iterator{
		Next:  d.makeIteratorNext(prefix, q.KeysOnly),
		Close: nil,
	}), nil
}

func (d *PebbleDatastore) makeIteratorNext(prefix string, keysOnly bool) func() (dsq.Result, bool) {
	var iter *pebble.Iterator
	var started bool

	return func() (dsq.Result, bool) {
		if !started {
			started = true
			var err error
			iter, err = d.db.NewIter(&pebble.IterOptions{
				LowerBound: []byte(prefix),
				UpperBound: prefixUpperBound([]byte(prefix)),
			})
			if err != nil {
				return dsq.Result{Error: err}, false
			}
			if !iter.First() {
				iter.Close()
				return dsq.Result{}, false
			}
		} else {
			if iter == nil || !iter.Next() {
				if iter != nil {
					iter.Close()
				}
				return dsq.Result{}, false
			}
		}

		entry := dsq.Entry{
			Key:  d.dsKey(iter.Key()).String(),
			Size: len(iter.Value()),
		}
		if !keysOnly {
			val := make([]byte, len(iter.Value()))
			copy(val, iter.Value())
			entry.Value = val
		}
		return dsq.Result{Entry: entry}, true
	}
}

// Batch creates a new batch for atomic writes.
func (d *PebbleDatastore) Batch(_ context.Context) (ds.Batch, error) {
	return &pebbleBatch{
		batch:  d.db.NewBatch(),
		prefix: d.prefix,
	}, nil
}

type pebbleBatch struct {
	batch  *pebble.Batch
	prefix string
}

func (b *pebbleBatch) Put(_ context.Context, key ds.Key, value []byte) error {
	return b.batch.Set([]byte(b.prefix+key.String()), value, nil)
}

func (b *pebbleBatch) Delete(_ context.Context, key ds.Key) error {
	return b.batch.Delete([]byte(b.prefix+key.String()), nil)
}

func (b *pebbleBatch) Commit(_ context.Context) error {
	return b.batch.Commit(pebble.Sync)
}

// prefixUpperBound returns the upper bound for a prefix scan.
// Increments the last byte. Returns nil if prefix is all 0xFF.
func prefixUpperBound(prefix []byte) []byte {
	if len(prefix) == 0 {
		return nil
	}
	upper := make([]byte, len(prefix))
	copy(upper, prefix)
	for i := len(upper) - 1; i >= 0; i-- {
		upper[i]++
		if upper[i] != 0 {
			return upper
		}
	}
	return nil
}

package cluster

import (
	"context"
	"fmt"
	"log/slog"
	"sync"

	"github.com/cockroachdb/pebble/v2"
	dag "github.com/ipfs/boxo/ipld/merkledag"
	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	ipld "github.com/ipfs/go-ipld-format"
)

const maxBlockSize = 1 << 20 // 1 MB — prevent OOM from rogue peers

// BlockFetcher fetches IPLD blocks from cluster peers.
// Implemented by the Coordinator using ADNL overlay queries.
type BlockFetcher interface {
	FetchBlockFromPeers(ctx context.Context, cidBytes []byte) ([]byte, error)
}

// ADNLDAGService implements ipld.DAGService over ADNL.
// Stores blocks locally in PebbleDB. On cache miss, fetches from cluster peers.
type ADNLDAGService struct {
	db      *pebble.DB
	fetcher BlockFetcher
	logger  *slog.Logger
}

// NewADNLDAGService creates a DAG service backed by PebbleDB and peer fetching.
func NewADNLDAGService(db *pebble.DB, fetcher BlockFetcher, logger *slog.Logger) *ADNLDAGService {
	return &ADNLDAGService{db: db, fetcher: fetcher, logger: logger}
}

// Get retrieves an IPLD node by CID. Checks local store first, then peers.
func (s *ADNLDAGService) Get(ctx context.Context, c cid.Cid) (ipld.Node, error) {
	data, err := s.getLocal(c)
	if err == nil {
		return decodeBlock(c, data)
	}

	if s.fetcher == nil {
		s.logger.Debug("dag get: no fetcher, returning not found", "cid", c.String())
		return nil, ipld.ErrNotFound{Cid: c}
	}

	s.logger.Debug("dag get: fetching from peers", "cid", c.String())
	remote, err := s.fetcher.FetchBlockFromPeers(ctx, c.Bytes())
	if err != nil {
		s.logger.Debug("dag get: peer fetch failed", "cid", c.String(), "error", err)
		return nil, fmt.Errorf("fetch block %s from peers: %w", c, err)
	}

	if len(remote) > maxBlockSize {
		return nil, fmt.Errorf("block %s too large from peer: %d bytes (max %d)", c, len(remote), maxBlockSize)
	}

	if storeErr := s.storeLocal(c, remote); storeErr != nil {
		s.logger.Warn("cache fetched block", "cid", c, "error", storeErr)
	}

	return decodeBlock(c, remote)
}

// GetMany retrieves multiple IPLD nodes with bounded parallelism.
func (s *ADNLDAGService) GetMany(ctx context.Context, cids []cid.Cid) <-chan *ipld.NodeOption {
	out := make(chan *ipld.NodeOption, len(cids))
	go s.getManyAsync(ctx, cids, out)
	return out
}

func (s *ADNLDAGService) getManyAsync(ctx context.Context, cids []cid.Cid, out chan<- *ipld.NodeOption) {
	sem := make(chan struct{}, 8)
	var wg sync.WaitGroup

	for _, c := range cids {
		select {
		case <-ctx.Done():
		case sem <- struct{}{}:
		}
		if ctx.Err() != nil {
			break
		}

		wg.Add(1)
		go func(c cid.Cid) {
			defer wg.Done()
			defer func() { <-sem }()

			node, err := s.Get(ctx, c)
			select {
			case out <- &ipld.NodeOption{Node: node, Err: err}:
			case <-ctx.Done():
			}
		}(c)
	}
	wg.Wait()
	close(out)
}

// Add stores an IPLD node locally.
func (s *ADNLDAGService) Add(ctx context.Context, node ipld.Node) error {
	s.logger.Debug("dag add", "cid", node.Cid().String(), "data_len", len(node.RawData()))
	return s.storeLocal(node.Cid(), node.RawData())
}

// AddMany stores multiple IPLD nodes in a batch.
func (s *ADNLDAGService) AddMany(ctx context.Context, nodes []ipld.Node) error {
	batch := s.db.NewBatch()
	for _, node := range nodes {
		key := []byte(BlockKey(node.Cid().Bytes()))
		if err := batch.Set(key, node.RawData(), nil); err != nil {
			batch.Close()
			return fmt.Errorf("batch set block: %w", err)
		}
	}
	return batch.Commit(pebble.Sync)
}

// Remove deletes an IPLD block from local store.
func (s *ADNLDAGService) Remove(ctx context.Context, c cid.Cid) error {
	return s.db.Delete([]byte(BlockKey(c.Bytes())), pebble.Sync)
}

// RemoveMany deletes multiple IPLD blocks.
func (s *ADNLDAGService) RemoveMany(ctx context.Context, cids []cid.Cid) error {
	batch := s.db.NewBatch()
	for _, c := range cids {
		if err := batch.Delete([]byte(BlockKey(c.Bytes())), nil); err != nil {
			batch.Close()
			return err
		}
	}
	return batch.Commit(pebble.Sync)
}

// HandleGetBlock processes a cluster.getBlock request from a peer.
// Returns the serialized response (block or not-found).
func (s *ADNLDAGService) HandleGetBlock(cidBytes []byte) []byte {
	c, err := cid.Cast(cidBytes)
	if err != nil {
		s.logger.Debug("handle get block: invalid cid", "len", len(cidBytes), "error", err)
		return SerializeBlockNotFound()
	}
	data, err := s.getLocal(c)
	if err != nil {
		s.logger.Debug("handle get block: not found locally", "cid", c.String(), "key", BlockKey(c.Bytes()))
		return SerializeBlockNotFound()
	}
	s.logger.Debug("handle get block: found", "cid", c.String(), "data_len", len(data))
	return SerializeBlock(data)
}

func (s *ADNLDAGService) getLocal(c cid.Cid) ([]byte, error) {
	val, closer, err := s.db.Get([]byte(BlockKey(c.Bytes())))
	if err != nil {
		return nil, err
	}
	defer closer.Close()
	data := make([]byte, len(val))
	copy(data, val)
	return data, nil
}

func (s *ADNLDAGService) storeLocal(c cid.Cid, data []byte) error {
	return s.db.Set([]byte(BlockKey(c.Bytes())), data, pebble.Sync)
}

func decodeBlock(c cid.Cid, data []byte) (ipld.Node, error) {
	blk, err := blocks.NewBlockWithCid(data, c)
	if err != nil {
		return nil, fmt.Errorf("create block: %w", err)
	}
	// go-ds-crdt uses dag-protobuf codec for CRDT operation nodes.
	return dag.DecodeProtobufBlock(blk)
}

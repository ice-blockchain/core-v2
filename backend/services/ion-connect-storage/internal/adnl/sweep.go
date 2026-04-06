package adnl

import (
	"context"
	"crypto/ed25519"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/xssnick/tonutils-go/adnl"
	"github.com/xssnick/tonutils-go/adnl/dht"
	"github.com/xssnick/tonutils-go/adnl/keys"
	"github.com/xssnick/tonutils-go/adnl/overlay"
	"github.com/xssnick/tonutils-go/tl"
)

const (
	kClosest                     = 7
	queryTimeout                 = 3 * time.Second
	maxConcurrentKademliaQueries = 20
)

type seedNode struct {
	addr      string
	serverKey ed25519.PublicKey
}

type sweeper struct {
	gateway   *adnl.Gateway
	ownerKey  ed25519.PrivateKey
	seedNodes []seedNode
	logger    *slog.Logger
}

func newSweeper(
	gateway *adnl.Gateway,
	ownerKey ed25519.PrivateKey,
	seeds []seedNode,
	logger *slog.Logger,
) *sweeper {
	return &sweeper{
		gateway:   gateway,
		ownerKey:  ownerKey,
		seedNodes: seeds,
		logger:    logger,
	}
}

// walkToClosest performs one iterative Kademlia walk to find the K=7
// closest DHT nodes to targetKey. Returns their ADNL peers for reuse
// across multiple Store operations in the same keyspace region.
func (s *sweeper) walkToClosest(ctx context.Context, targetKey []byte) ([]adnl.Peer, error) {
	checked := &sync.Map{}
	var best []foundNode
	var bestMu sync.Mutex

	initial := s.querySeeds(ctx, targetKey, checked)
	bestMu.Lock()
	best = mergeClosest(best, initial, targetKey, kClosest)
	bestMu.Unlock()

	for {
		bestMu.Lock()
		candidates := uncheckedNodes(best, checked)
		bestMu.Unlock()

		if len(candidates) == 0 {
			break
		}

		discovered := s.queryNodes(ctx, candidates, targetKey, checked)

		bestMu.Lock()
		prevBest := bestAffinity(best)
		best = mergeClosest(best, discovered, targetKey, kClosest)
		newBest := bestAffinity(best)
		bestMu.Unlock()

		if newBest <= prevBest {
			break
		}
	}

	peers := make([]adnl.Peer, 0, len(best))
	for _, n := range best {
		if n.peer != nil {
			peers = append(peers, n.peer)
		}
	}

	if len(peers) == 0 {
		return nil, fmt.Errorf("no reachable DHT nodes found near target key")
	}
	return peers, nil
}

const maxConcurrentStores = 50

// batchStore sends dht.Store for each value to each peer concurrently.
// Limits concurrency to maxConcurrentStores to prevent goroutine exhaustion.
func (s *sweeper) batchStore(ctx context.Context, peers []adnl.Peer, values []*dht.Value) error {
	var wg sync.WaitGroup
	var stored int32
	var storedMu sync.Mutex
	sem := make(chan struct{}, maxConcurrentStores)

	for _, peer := range peers {
		for _, val := range values {
			select {
			case <-ctx.Done():
				wg.Wait()
				if stored == 0 {
					return fmt.Errorf("no values stored: %w", ctx.Err())
				}
				return nil
			case sem <- struct{}{}:
			}
			wg.Add(1)
			go func(p adnl.Peer, v *dht.Value) {
				defer func() { <-sem; wg.Done() }()
				if err := storeSingleValue(ctx, p, v); err == nil {
					storedMu.Lock()
					stored++
					storedMu.Unlock()
				}
			}(peer, val)
		}
	}
	wg.Wait()

	if stored == 0 {
		return fmt.Errorf("no values stored on any peer")
	}
	return nil
}

// buildOverlayValue constructs a dht.Value for announcing overlay nodes.
func (s *sweeper) buildOverlayValue(
	overlayKey []byte,
	nodesList *overlay.NodesList,
	ttl time.Duration,
) (*dht.Value, []byte, error) {
	data, err := tl.Serialize(nodesList, true)
	if err != nil {
		return nil, nil, fmt.Errorf("serialize overlay nodes: %w", err)
	}

	id := keys.PublicKeyOverlay{Key: overlayKey}
	idKey, err := tl.Hash(id)
	if err != nil {
		return nil, nil, fmt.Errorf("hash overlay key: %w", err)
	}

	val := &dht.Value{
		KeyDescription: dht.KeyDescription{
			Key: dht.Key{
				ID:    idKey,
				Name:  []byte("nodes"),
				Index: 0,
			},
			ID:         id,
			UpdateRule: dht.UpdateRuleOverlayNodes{},
		},
		Data: data,
		TTL:  int32(time.Now().Add(ttl).Unix()),
	}

	return val, idKey, nil
}

func (s *sweeper) querySeeds(ctx context.Context, targetKey []byte, checked *sync.Map) []foundNode {
	var result []foundNode
	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, maxConcurrentKademliaQueries)

	for _, seed := range s.seedNodes {
		select {
		case sem <- struct{}{}:
		case <-ctx.Done():
			break
		}
		wg.Add(1)
		go func(sn seedNode) {
			defer func() { <-sem; wg.Done() }()
			nodes := s.findNodesVia(ctx, sn.addr, sn.serverKey, targetKey, checked)
			mu.Lock()
			result = append(result, nodes...)
			mu.Unlock()
		}(seed)
	}
	wg.Wait()
	return result
}

func (s *sweeper) queryNodes(ctx context.Context, nodes []foundNode, targetKey []byte, checked *sync.Map) []foundNode {
	var result []foundNode
	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, maxConcurrentKademliaQueries)

	for _, n := range nodes {
		select {
		case sem <- struct{}{}:
		case <-ctx.Done():
			break
		}
		wg.Add(1)
		go func(fn foundNode) {
			defer func() { <-sem; wg.Done() }()
			addr := fn.peer.RemoteAddr()
			key := fn.peer.GetPubKey()
			discovered := s.findNodesVia(ctx, addr, key, targetKey, checked)
			mu.Lock()
			result = append(result, discovered...)
			mu.Unlock()
		}(n)
	}
	wg.Wait()
	return result
}

func (s *sweeper) findNodesVia(ctx context.Context, addr string, serverKey ed25519.PublicKey, targetKey []byte, checked *sync.Map) []foundNode {
	if _, loaded := checked.LoadOrStore(addr, true); loaded {
		return nil
	}

	peer, err := s.gateway.RegisterClient(addr, serverKey)
	if err != nil {
		return nil
	}

	queryCtx, cancel := context.WithTimeout(ctx, queryTimeout)
	defer cancel()

	raw, err := tl.Serialize(dht.FindNode{Key: targetKey, K: kClosest}, true)
	if err != nil {
		return nil
	}

	var res any
	if err := peer.Query(queryCtx, tl.Raw(raw), &res); err != nil {
		return nil
	}

	nodesList, ok := res.(dht.NodesList)
	if !ok {
		return nil
	}

	result := parseDHTNodes(nodesList, s.gateway, targetKey)
	result = append(result, foundNode{
		peer:     peer,
		id:       peer.GetID(),
		affinity: xorAffinity(peer.GetID(), targetKey),
	})
	return result
}

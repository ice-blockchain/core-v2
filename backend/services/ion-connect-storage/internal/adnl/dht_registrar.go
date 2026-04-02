package adnl

import (
	"context"
	"crypto/ed25519"
	"log/slog"
	"sync"
	"time"

	lru "github.com/hashicorp/golang-lru/v2"
	"github.com/xssnick/tonutils-go/adnl/dht"
	"github.com/xssnick/tonutils-go/adnl/keys"
	"github.com/xssnick/tonutils-go/adnl/overlay"
	"github.com/xssnick/tonutils-go/tl"
)

type dhtStorer interface {
	StoreOverlayNodes(
		ctx context.Context,
		overlayKey []byte,
		nodes *overlay.NodesList,
		ttl time.Duration,
		replicas int,
	) (int, []byte, error)
}

type DHTRegistrar struct {
	storer          dhtStorer
	sw              *sweeper
	registered      *lru.Cache[[32]byte, struct{}]
	regionIndex     map[uint8]map[[32]byte]struct{}
	ownerKey        ed25519.PrivateKey
	refreshInterval time.Duration
	logger          *slog.Logger

	mu     sync.Mutex
	cancel context.CancelFunc
	done   chan struct{}
}

func newDHTRegistrar(
	storer dhtStorer,
	sw *sweeper,
	limit int,
	ownerKey ed25519.PrivateKey,
	logger *slog.Logger,
) *DHTRegistrar {
	r := &DHTRegistrar{
		storer:          storer,
		sw:              sw,
		regionIndex:     make(map[uint8]map[[32]byte]struct{}),
		ownerKey:        ownerKey,
		refreshInterval: 1 * time.Hour,
		logger:          logger,
		done:            make(chan struct{}),
	}
	cache, _ := lru.NewWithEvict[[32]byte, struct{}](limit, func(bagID [32]byte, _ struct{}) {
		r.removeFromRegionIndex(bagID)
	})
	r.registered = cache
	return r
}

func (r *DHTRegistrar) Start(ctx context.Context) {
	sweepCtx, cancel := context.WithCancel(ctx)
	r.cancel = cancel
	go r.runSweep(sweepCtx)
}

func (r *DHTRegistrar) Stop() {
	if r.cancel != nil {
		r.cancel()
	}
	<-r.done
}

func (r *DHTRegistrar) Register(ctx context.Context, bagID [32]byte) error {
	r.registered.Add(bagID, struct{}{})
	r.addToRegionIndex(bagID)
	r.logger.Info("bag registered in DHT", "bag_id_prefix", bagID[:4], "count", r.registered.Len())

	overlayKey := computeOverlayKey(bagID)
	node, err := overlay.NewNode(overlayKey, r.ownerKey)
	if err != nil {
		return err
	}

	storeCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	_, _, err = r.storer.StoreOverlayNodes(storeCtx, overlayKey, &overlay.NodesList{List: []overlay.Node{*node}}, r.refreshInterval, 5)
	if err != nil {
		r.logger.Warn("immediate DHT store failed", "error", err)
		return err
	}
	return nil
}

func (r *DHTRegistrar) Deregister(bagID [32]byte) {
	r.registered.Remove(bagID)
	r.removeFromRegionIndex(bagID)
	r.logger.Info("bag deregistered from DHT", "bag_id_prefix", bagID[:4], "count", r.registered.Len())
}

func (r *DHTRegistrar) Count() int {
	return r.registered.Len()
}

func (r *DHTRegistrar) addToRegionIndex(bagID [32]byte) {
	region := overlayRegion(bagID)
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.regionIndex[region] == nil {
		r.regionIndex[region] = make(map[[32]byte]struct{})
	}
	r.regionIndex[region][bagID] = struct{}{}
}

func (r *DHTRegistrar) removeFromRegionIndex(bagID [32]byte) {
	region := overlayRegion(bagID)
	r.mu.Lock()
	defer r.mu.Unlock()
	if m := r.regionIndex[region]; m != nil {
		delete(m, bagID)
		if len(m) == 0 {
			delete(r.regionIndex, region)
		}
	}
}

func (r *DHTRegistrar) bagsInRegion(region uint8) [][32]byte {
	r.mu.Lock()
	m := r.regionIndex[region]
	if len(m) == 0 {
		r.mu.Unlock()
		return nil
	}
	result := make([][32]byte, 0, len(m))
	for bagID := range m {
		result = append(result, bagID)
	}
	r.mu.Unlock()
	return result
}

func (r *DHTRegistrar) runSweep(ctx context.Context) {
	defer close(r.done)

	const regionCount = 256
	tickInterval := r.refreshInterval / regionCount
	if tickInterval < time.Second {
		tickInterval = time.Second
	}

	ticker := time.NewTicker(tickInterval)
	defer ticker.Stop()

	currentRegion := 0
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			r.sweepRegion(ctx, uint8(currentRegion))
			currentRegion = (currentRegion + 1) % regionCount
		}
	}
}

func (r *DHTRegistrar) sweepRegion(ctx context.Context, region uint8) {
	bags := r.bagsInRegion(region)
	if len(bags) == 0 {
		return
	}

	peers, err := r.sw.walkToClosest(ctx, regionCenterKey(region))
	if err != nil {
		r.logger.Warn("sweep walk failed", "region", region, "error", err)
		return
	}

	values, err := r.buildRegionValues(bags)
	if err != nil {
		r.logger.Warn("sweep value build failed", "region", region, "error", err)
		return
	}

	if err := r.sw.batchStore(ctx, peers, values); err != nil {
		r.logger.Warn("sweep batch store failed", "region", region, "bags", len(bags), "error", err)
		return
	}

	r.logger.Debug("sweep region complete", "region", region, "bags", len(bags), "peers", len(peers))
}

func (r *DHTRegistrar) buildRegionValues(bags [][32]byte) ([]*dht.Value, error) {
	values := make([]*dht.Value, 0, len(bags))
	for _, bagID := range bags {
		overlayKey := computeOverlayKey(bagID)
		node, err := overlay.NewNode(overlayKey, r.ownerKey)
		if err != nil {
			return nil, err
		}
		val, _, err := r.sw.buildOverlayValue(overlayKey, &overlay.NodesList{List: []overlay.Node{*node}}, r.refreshInterval)
		if err != nil {
			return nil, err
		}
		values = append(values, val)
	}
	return values, nil
}

// computeOverlayKey returns the raw overlay key (bagID) for DHT registration.
// This is passed to buildOverlayValue which computes the DHT address from it.
func computeOverlayKey(bagID [32]byte) []byte {
	return bagID[:]
}

func overlayRegion(bagID [32]byte) uint8 {
	dhtKey := overlayDHTKey(bagID)
	return dhtKey[0]
}

func overlayDHTKey(bagID [32]byte) []byte {
	id := keys.PublicKeyOverlay{Key: bagID[:]}
	idKey, _ := tl.Hash(id)
	return idKey
}

func regionCenterKey(region uint8) []byte {
	key := make([]byte, 32)
	key[0] = region
	return key
}

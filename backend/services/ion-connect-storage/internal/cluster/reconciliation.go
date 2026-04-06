package cluster

import (
	"context"
	"log/slog"
	"strings"
	"time"

	ds "github.com/ipfs/go-datastore"
	dsq "github.com/ipfs/go-datastore/query"
	crdt "github.com/ipfs/go-ds-crdt"
)

const reconcileInterval = 5 * time.Minute

// countActiveNodes scans heartbeat/* keys and counts fresh ones.
// O(nodes) -- never O(bags).
func countActiveNodes(store *crdt.Datastore, staleTimeout time.Duration, logger *slog.Logger) int {
	nodes, _ := listActiveNodes(store, staleTimeout, logger)
	return len(nodes)
}

// listActiveNodes returns nodeIDs with fresh heartbeats.
func listActiveNodes(store *crdt.Datastore, staleTimeout time.Duration, logger *slog.Logger) ([]string, []string) {
	ctx := context.Background()
	results, err := store.Query(ctx, dsq.Query{Prefix: prefixHeartbeat})
	if err != nil {
		logger.Warn("query heartbeats", "error", err)
		return nil, nil
	}
	defer results.Close()

	now := time.Now().Unix()
	threshold := now - int64(staleTimeout.Seconds())
	var active, dead []string

	for r := range results.Next() {
		if r.Error != nil {
			continue
		}
		nodeID := extractNodeIDFromHeartbeatKey(r.Key)
		ts, err := ParseHeartbeat(r.Value)
		if err != nil {
			continue
		}
		if ts >= threshold {
			active = append(active, nodeID)
		} else {
			dead = append(dead, nodeID)
		}
	}
	return active, dead
}

func extractNodeIDFromHeartbeatKey(key string) string {
	// Key format: /heartbeat/<nodeID> (ds.Key adds leading /)
	return strings.TrimPrefix(key, "/"+prefixHeartbeat)
}

// reconcileOwnedCountLoop periodically scans bynode/<nodeID>/ keys to correct
// the atomic ownedCount counter, which can drift due to CRDT race conditions.
func (c *Coordinator) reconcileOwnedCountLoop(ctx context.Context) {
	ticker := time.NewTicker(reconcileInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			c.reconcileOwnedCount(ctx)
		}
	}
}

// reconcileOwnedCount scans bynode/<self>/ keys and verifies each bag is
// still owned by this node. Removes stale bynode keys where ownership was
// lost to another node (e.g. due to CRDT race resolution).
func (c *Coordinator) reconcileOwnedCount(ctx context.Context) {
	prefix := ByNodePrefix(c.nodeID)
	results, err := c.crdt.Query(ctx, dsq.Query{Prefix: prefix, KeysOnly: true})
	if err != nil {
		c.logger.Warn("reconcile: query failed", "error", err)
		return
	}
	defer results.Close()

	var validCount int64
	for r := range results.Next() {
		if r.Error != nil {
			continue
		}
		bagID := extractBagIDFromByNodeKey(r.Key, c.nodeID)
		if bagID == ([32]byte{}) {
			continue
		}
		if c.Owner(bagID) == c.nodeID {
			validCount++
			continue
		}
		_ = c.crdt.Delete(ctx, ds.NewKey(r.Key))
		c.logger.Info("reconcile: removed stale bynode key", "bag", r.Key)
	}

	old := c.ownedCount.Swap(validCount)
	if old != validCount {
		c.logger.Info("reconciled owned count", "old", old, "new", validCount)
		if c.metrics != nil {
			c.metrics.BagsOwned.Set(float64(validCount))
		}
	}
}

package adnl

import (
	"cmp"
	"context"
	"fmt"
	"math/bits"
	"slices"
	"sync"
	"time"

	"github.com/xssnick/tonutils-go/adnl"
	"github.com/xssnick/tonutils-go/adnl/dht"
	"github.com/xssnick/tonutils-go/adnl/keys"
	"github.com/xssnick/tonutils-go/tl"
)

type foundNode struct {
	peer     adnl.Peer
	id       []byte
	affinity uint
}

// xorAffinity computes the common prefix length in bits between two 32-byte keys.
// Higher affinity = closer in Kademlia keyspace.
func xorAffinity(x, y []byte) uint {
	var result uint
	for i := 0; i < 32 && i < len(x) && i < len(y); i++ {
		k := x[i] ^ y[i]
		result += uint(bits.LeadingZeros8(k))
		if k != 0 {
			break
		}
	}
	return result
}

func mergeClosest(existing, incoming []foundNode, targetKey []byte, k int) []foundNode {
	seen := make(map[string]bool)
	var all []foundNode

	for _, n := range existing {
		key := string(n.id)
		if !seen[key] {
			seen[key] = true
			all = append(all, n)
		}
	}
	for _, n := range incoming {
		key := string(n.id)
		if !seen[key] {
			seen[key] = true
			n.affinity = xorAffinity(n.id, targetKey)
			all = append(all, n)
		}
	}

	slices.SortStableFunc(all, func(a, b foundNode) int {
		return cmp.Compare(b.affinity, a.affinity)
	})

	if len(all) > k {
		all = all[:k]
	}
	return all
}

func uncheckedNodes(nodes []foundNode, checked *sync.Map) []foundNode {
	var result []foundNode
	for _, n := range nodes {
		addr := n.peer.RemoteAddr()
		if _, loaded := checked.Load(addr); !loaded {
			result = append(result, n)
		}
	}
	return result
}

func bestAffinity(nodes []foundNode) uint {
	if len(nodes) == 0 {
		return 0
	}
	return nodes[0].affinity
}

func parseDHTNodes(nodesList dht.NodesList, gateway *adnl.Gateway, targetKey []byte) []foundNode {
	var result []foundNode
	for _, node := range nodesList.List {
		pub, ok := node.ID.(keys.PublicKeyED25519)
		if !ok || len(node.AddrList.Addresses) == 0 {
			continue
		}

		nodeID, err := tl.Hash(pub)
		if err != nil {
			continue
		}

		addr := fmt.Sprintf("%s:%d", node.AddrList.Addresses[0].IP.String(), node.AddrList.Addresses[0].Port)
		nodePeer, err := gateway.RegisterClient(addr, pub.Key)
		if err != nil {
			continue
		}

		result = append(result, foundNode{
			peer:     nodePeer,
			id:       nodeID,
			affinity: xorAffinity(nodeID, targetKey),
		})
	}
	return result
}

func storeSingleValue(ctx context.Context, peer adnl.Peer, val *dht.Value) error {
	storeCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	raw, err := tl.Serialize(dht.Store{Value: val}, true)
	if err != nil {
		return err
	}

	var res any
	return peer.Query(storeCtx, tl.Raw(raw), &res)
}

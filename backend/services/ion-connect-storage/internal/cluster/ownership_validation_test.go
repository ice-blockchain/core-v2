package cluster

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"testing"
	"time"

	ds "github.com/ipfs/go-datastore"
	"github.com/stretchr/testify/require"
)

func TestValidatedOwnerReturnsSelfWithoutHeartbeatCheck(t *testing.T) {
	coord := newTestCoordinator(t, "self-node")
	ctx := context.Background()
	bagID := [32]byte{0xaa, 0xbb}

	require.NoError(t, coord.ClaimBag(ctx, bagID))

	owner := coord.ValidatedOwner(bagID)
	require.Equal(t, "self-node", owner)
}

func TestValidatedOwnerRejectsNodeWithoutHeartbeat(t *testing.T) {
	coord := newTestCoordinator(t, "local-node")
	bagID := [32]byte{0xcc, 0xdd}

	// Foreign node claims ownership but has no heartbeat.
	writeSignedOwnershipAsNode(t, coord, "foreign-node", bagID)

	owner := coord.ValidatedOwner(bagID)
	require.Equal(t, "", owner, "should reject owner without heartbeat")
}

func TestValidatedOwnerAcceptsAliveNode(t *testing.T) {
	coord := newTestCoordinator(t, "local-node")
	ctx := context.Background()
	bagID := [32]byte{0xee, 0xff}

	// Foreign node claims ownership and has a fresh signed heartbeat.
	// writeSignedOwnershipAsNode registers the key and ownership; use returned key for heartbeat.
	foreignPriv := writeSignedOwnershipAsNode(t, coord, "alive-node", bagID)
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(HeartbeatKey("alive-node")),
		FormatSignedHeartbeat(time.Now().Unix(), "alive-node", foreignPriv)))

	owner := coord.ValidatedOwner(bagID)
	require.Equal(t, "alive-node", owner)
}

func TestValidatedOwnerRejectsStaleHeartbeat(t *testing.T) {
	coord := newTestCoordinator(t, "local-node")
	ctx := context.Background()
	bagID := [32]byte{0x11, 0x22}

	// Foreign node with stale signed heartbeat.
	staleTimestamp := time.Now().Unix() - int64(coord.cfg.StaleHeartbeatTimeout.Seconds()) - 10
	foreignPriv := writeSignedOwnershipAsNode(t, coord, "stale-node", bagID)
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(HeartbeatKey("stale-node")),
		FormatSignedHeartbeat(staleTimestamp, "stale-node", foreignPriv)))

	owner := coord.ValidatedOwner(bagID)
	require.Equal(t, "", owner, "should reject owner with stale heartbeat")
}

func TestSignedHeartbeatAcceptsValid(t *testing.T) {
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)

	ts := time.Now().Unix()
	data := FormatSignedHeartbeat(ts, "test-node", priv)
	parsed, err := ParseSignedHeartbeat(data, "test-node", pub)
	require.NoError(t, err)
	require.Equal(t, ts, parsed)
}

func TestSignedHeartbeatRejectsWrongKey(t *testing.T) {
	_, priv1, _ := ed25519.GenerateKey(rand.Reader)
	pub2, _, _ := ed25519.GenerateKey(rand.Reader)

	data := FormatSignedHeartbeat(time.Now().Unix(), "test-node", priv1)
	_, err := ParseSignedHeartbeat(data, "test-node", pub2)
	require.Error(t, err)
	require.Contains(t, err.Error(), "signature verification failed")
}

func TestSignedHeartbeatRejectsWrongNodeID(t *testing.T) {
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)

	data := FormatSignedHeartbeat(time.Now().Unix(), "node-a", priv)
	_, err := ParseSignedHeartbeat(data, "node-b", pub)
	require.Error(t, err)
}

func TestIsNodeAliveVerifiesSignedHeartbeat(t *testing.T) {
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)

	coord := newTestCoordinator(t, "local")
	ctx := context.Background()

	// Write signed heartbeat for foreign node.
	ts := time.Now().Unix()
	hb := FormatSignedHeartbeat(ts, "foreign-node", priv)
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(HeartbeatKey("foreign-node")), hb))

	// Write nodeinfo with public key.
	info := NodeInfo{PublicKey: hex.EncodeToString(pub)}
	data, _ := MarshalNodeInfo(info)
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(NodeInfoKey("foreign-node")), data))

	require.True(t, coord.isNodeAlive("foreign-node"))
}

func TestIsNodeAliveRejectsSpoofedHeartbeat(t *testing.T) {
	pub, _, _ := ed25519.GenerateKey(rand.Reader)
	_, attackerPriv, _ := ed25519.GenerateKey(rand.Reader)

	coord := newTestCoordinator(t, "local")
	ctx := context.Background()

	// Attacker writes heartbeat for victim signed with wrong key.
	hb := FormatSignedHeartbeat(time.Now().Unix(), "victim-node", attackerPriv)
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(HeartbeatKey("victim-node")), hb))

	// Write victim's nodeinfo with their real public key.
	info := NodeInfo{PublicKey: hex.EncodeToString(pub)}
	data, _ := MarshalNodeInfo(info)
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(NodeInfoKey("victim-node")), data))

	require.False(t, coord.isNodeAlive("victim-node"))
}

func TestIsNodeAliveRejectsNodeWithoutPublicKey(t *testing.T) {
	coord := newTestCoordinator(t, "local")
	ctx := context.Background()

	// Write heartbeat but no nodeinfo (no public key).
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(HeartbeatKey("no-key-node")),
		FormatHeartbeat(time.Now().Unix())))

	require.False(t, coord.isNodeAlive("no-key-node"))
}

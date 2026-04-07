package cluster

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
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
	_, priv, _ := ed25519.GenerateKey(rand.Reader)

	coord := newTestCoordinator(t, "local")
	ctx := context.Background()

	// Write signed heartbeat for foreign node.
	ts := time.Now().Unix()
	hb := FormatSignedHeartbeat(ts, "foreign-node", priv)
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(HeartbeatKey("foreign-node")), hb))

	// Write self-certifying nodeinfo.
	infoBytes, err := MarshalSignedNodeInfo(NodeInfo{}, priv)
	require.NoError(t, err)
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(NodeInfoKey("foreign-node")), infoBytes))

	require.True(t, coord.isNodeAlive("foreign-node"))
}

func TestIsNodeAliveRejectsSpoofedHeartbeat(t *testing.T) {
	_, victimPriv, _ := ed25519.GenerateKey(rand.Reader)
	_, attackerPriv, _ := ed25519.GenerateKey(rand.Reader)

	coord := newTestCoordinator(t, "local")
	ctx := context.Background()

	// Attacker writes heartbeat for victim signed with wrong key.
	hb := FormatSignedHeartbeat(time.Now().Unix(), "victim-node", attackerPriv)
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(HeartbeatKey("victim-node")), hb))

	// Write victim's self-certifying nodeinfo (signed with victim's key).
	infoBytes, err := MarshalSignedNodeInfo(NodeInfo{}, victimPriv)
	require.NoError(t, err)
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(NodeInfoKey("victim-node")), infoBytes))

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

func TestIsNodeAliveRejectsFutureTimestamp(t *testing.T) {
	_, priv, _ := ed25519.GenerateKey(rand.Reader)

	coord := newTestCoordinator(t, "local")
	ctx := context.Background()

	// Write heartbeat with far-future timestamp.
	futureTS := time.Now().Unix() + maxClockSkew + 100
	hb := FormatSignedHeartbeat(futureTS, "future-node", priv)
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(HeartbeatKey("future-node")), hb))

	infoBytes, err := MarshalSignedNodeInfo(NodeInfo{}, priv)
	require.NoError(t, err)
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(NodeInfoKey("future-node")), infoBytes))

	require.False(t, coord.isNodeAlive("future-node"))
}

func TestOwnerRejectsFutureTimestampOwnership(t *testing.T) {
	coord := newTestCoordinator(t, "local")
	ctx := context.Background()
	bagID := [32]byte{0xfa, 0xce}

	// Write ownership claim with far-future timestamp.
	futureTS := time.Now().Unix() + maxClockSkew + 100
	bagHex := hexEncode(bagID[:])
	val := FormatSignedOwnership(bagHex, coord.nodeID, futureTS, coord.cfg.PrivateKey)
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(OwnershipKey(bagID)), val))

	require.Equal(t, "", coord.Owner(bagID))
}

func TestNodeADNLAddressRejectsForgedNodeInfo(t *testing.T) {
	coord := newTestCoordinator(t, "local")
	ctx := context.Background()

	// Write unsigned/forged nodeinfo for a victim node.
	forgedInfo := NodeInfo{ADNLAddress: "aaaa", IP: "6.6.6.6", Port: 9999}
	raw, err := MarshalNodeInfo(forgedInfo)
	require.NoError(t, err)
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(NodeInfoKey("victim")), raw))

	// NodeADNLAddress must reject forged (unsigned) nodeinfo.
	_, _, _, found := coord.NodeADNLAddress("victim")
	require.False(t, found, "forged nodeinfo must be rejected")
}

func TestIsRegisteredNodeRejectsForgedNodeInfo(t *testing.T) {
	coord := newTestCoordinator(t, "local")
	ctx := context.Background()

	// Write unsigned nodeinfo with attacker's ADNL address.
	forgedInfo := NodeInfo{ADNLAddress: hexEncode([]byte{0xde, 0xad}), IP: "6.6.6.6"}
	raw, err := MarshalNodeInfo(forgedInfo)
	require.NoError(t, err)
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(NodeInfoKey("attacker")), raw))

	var adnlAddr [32]byte
	copy(adnlAddr[:2], []byte{0xde, 0xad})
	require.False(t, coord.IsRegisteredNode(adnlAddr), "forged nodeinfo must not pass membership check")
}

func TestNodeInfoRejectsOverwrittenPublicKey(t *testing.T) {
	_, victimPriv, _ := ed25519.GenerateKey(rand.Reader)
	_, attackerPriv, _ := ed25519.GenerateKey(rand.Reader)

	coord := newTestCoordinator(t, "local")
	ctx := context.Background()

	// Victim publishes self-certifying nodeinfo.
	victimInfo, err := MarshalSignedNodeInfo(NodeInfo{IP: "1.2.3.4"}, victimPriv)
	require.NoError(t, err)
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(NodeInfoKey("victim")), victimInfo))

	// Attacker overwrites with their own key (different signature).
	attackerInfo, err := MarshalSignedNodeInfo(NodeInfo{IP: "6.6.6.6"}, attackerPriv)
	require.NoError(t, err)
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(NodeInfoKey("victim")), attackerInfo))

	// Write heartbeat signed with victim's real key.
	hb := FormatSignedHeartbeat(time.Now().Unix(), "victim", victimPriv)
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(HeartbeatKey("victim")), hb))

	// isNodeAlive should fail because nodeinfo now has attacker's key,
	// which doesn't match the heartbeat signed by victim's key.
	require.False(t, coord.isNodeAlive("victim"))
}

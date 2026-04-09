package cluster

import (
	"crypto/ed25519"
	"testing"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/stretchr/testify/require"
)

func TestNodeInfoRoundTrip(t *testing.T) {
	original := NodeInfo{
		ADNLAddress: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
		IP:          "192.168.1.100",
		Port:        3278,
	}
	data, err := MarshalNodeInfo(original)
	require.NoError(t, err)

	decoded, err := UnmarshalNodeInfo(data)
	require.NoError(t, err)
	require.Equal(t, original, decoded)
}

func TestCRDTKeyFormats(t *testing.T) {
	bagID := boc.BagID{0xAB, 0xCD}
	nodeID := "node-alpha"

	require.Equal(t, "own/abcd000000000000000000000000000000000000000000000000000000000000", OwnershipKey(bagID))
	require.Contains(t, ByNodeKey(nodeID, bagID), "bynode/node-alpha/abcd")
	require.Equal(t, "bynode/node-alpha/", ByNodePrefix(nodeID))
	require.Equal(t, "heartbeat/node-alpha", HeartbeatKey(nodeID))
	require.Equal(t, "nodeinfo/node-alpha", NodeInfoKey(nodeID))
}

func TestBlockKeyUsesHexEncoding(t *testing.T) {
	// CID bytes containing the string "block/" should not collide with other keys.
	cidA := []byte("block/something")
	cidB := []byte("other-cid")
	keyA := BlockKey(cidA)
	keyB := BlockKey(cidB)
	require.True(t, len(keyA) > len("block/"))
	require.NotEqual(t, keyA, keyB)
	// Key must start with prefix and use hex, not raw bytes.
	require.Contains(t, keyA, "block/")
	require.NotContains(t, keyA, "block/block/")
}

func TestValidateNodeID(t *testing.T) {
	// Valid: 64 hex characters (hex-encoded ed25519 public key)
	require.NoError(t, ValidateNodeID("abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"))
	require.NoError(t, ValidateNodeID("0000000000000000000000000000000000000000000000000000000000000000"))
	// Invalid: empty
	require.Error(t, ValidateNodeID(""))
	// Invalid: wrong length
	require.Error(t, ValidateNodeID("node-alpha"))
	require.Error(t, ValidateNodeID("abcdef"))
	// Invalid: right length but not hex
	require.Error(t, ValidateNodeID("zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"))
	// Invalid: injection attempts
	require.Error(t, ValidateNodeID("node/injected"))
	require.Error(t, ValidateNodeID("../own/target"))
}

func TestSignedOwnershipRejectsForgedClaim(t *testing.T) {
	_, realPriv, _ := ed25519.GenerateKey(nil)
	realPub := realPriv.Public().(ed25519.PublicKey)
	_, attackerPriv, _ := ed25519.GenerateKey(nil)

	bagHex := "abcd000000000000000000000000000000000000000000000000000000000000"

	// Attacker signs as "victim" with wrong key.
	forged := FormatSignedOwnership(bagHex, "victim", 1700000000, attackerPriv)
	_, _, err := ParseSignedOwnership(forged, bagHex, func(nid string) ed25519.PublicKey {
		if nid == "victim" {
			return realPub
		}
		return nil
	})
	require.Error(t, err)
	require.Contains(t, err.Error(), "signature verification failed")
}

func TestSignedOwnershipRejectsUnsignedClaim(t *testing.T) {
	_, _, err := ParseSignedOwnership([]byte("plain-node-id"), "baghex", func(string) ed25519.PublicKey {
		return nil
	})
	require.Error(t, err)
}

func TestSignedOwnershipRoundTrip(t *testing.T) {
	_, priv, _ := ed25519.GenerateKey(nil)
	pub := priv.Public().(ed25519.PublicKey)
	bagHex := "abcd000000000000000000000000000000000000000000000000000000000000"

	val := FormatSignedOwnership(bagHex, "mynode", 1700000000, priv)
	nodeID, ts, err := ParseSignedOwnership(val, bagHex, func(nid string) ed25519.PublicKey {
		if nid == "mynode" {
			return pub
		}
		return nil
	})
	require.NoError(t, err)
	require.Equal(t, "mynode", nodeID)
	require.Equal(t, int64(1700000000), ts)
}

func TestHeartbeatRoundTrip(t *testing.T) {
	ts := int64(1700000000)
	encoded := FormatHeartbeat(ts)
	decoded, err := ParseHeartbeat(encoded)
	require.NoError(t, err)
	require.Equal(t, ts, decoded)
}

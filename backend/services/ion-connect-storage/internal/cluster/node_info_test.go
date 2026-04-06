package cluster

import (
	"testing"

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
	bagID := [32]byte{0xAB, 0xCD}
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
	require.NoError(t, ValidateNodeID("node-alpha"))
	require.NoError(t, ValidateNodeID("Node_123"))
	require.Error(t, ValidateNodeID(""))
	require.Error(t, ValidateNodeID("node/injected"))
	require.Error(t, ValidateNodeID("../own/target"))
	require.Error(t, ValidateNodeID("node\x00id"))
	require.Error(t, ValidateNodeID("node id"))
}

func TestHeartbeatRoundTrip(t *testing.T) {
	ts := int64(1700000000)
	encoded := FormatHeartbeat(ts)
	decoded, err := ParseHeartbeat(encoded)
	require.NoError(t, err)
	require.Equal(t, ts, decoded)
}

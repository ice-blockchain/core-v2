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

func TestHeartbeatRoundTrip(t *testing.T) {
	ts := int64(1700000000)
	encoded := FormatHeartbeat(ts)
	decoded, err := ParseHeartbeat(encoded)
	require.NoError(t, err)
	require.Equal(t, ts, decoded)
}

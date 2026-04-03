package cluster

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"strconv"
)

// NodeInfo holds a cluster node's network address for direct ADNL dialing.
// Stored in CRDT under key `nodeinfo/<nodeID>`.
type NodeInfo struct {
	ADNLAddress string `json:"adnlAddr"`
	IP          string `json:"ip"`
	Port        int    `json:"port"`
}

// MarshalNodeInfo serializes NodeInfo to JSON bytes.
func MarshalNodeInfo(info NodeInfo) ([]byte, error) {
	return json.Marshal(info)
}

// UnmarshalNodeInfo deserializes NodeInfo from JSON bytes.
func UnmarshalNodeInfo(data []byte) (NodeInfo, error) {
	var info NodeInfo
	if err := json.Unmarshal(data, &info); err != nil {
		return NodeInfo{}, fmt.Errorf("unmarshal node info: %w", err)
	}
	return info, nil
}

// CRDT key helpers.

const (
	prefixOwnership = "own/"
	prefixByNode    = "bynode/"
	prefixHeartbeat = "heartbeat/"
	prefixNodeInfo  = "nodeinfo/"
	prefixBlock     = "block/"
)

// OwnershipKey returns the CRDT key for bag ownership lookup.
func OwnershipKey(bagID [32]byte) string {
	return prefixOwnership + hexEncode(bagID[:])
}

// ByNodeKey returns the CRDT key for per-node bag enumeration.
func ByNodeKey(nodeID string, bagID [32]byte) string {
	return prefixByNode + nodeID + "/" + hexEncode(bagID[:])
}

// ByNodePrefix returns the CRDT key prefix for scanning a node's bags.
func ByNodePrefix(nodeID string) string {
	return prefixByNode + nodeID + "/"
}

// HeartbeatKey returns the CRDT key for a node's heartbeat.
func HeartbeatKey(nodeID string) string {
	return prefixHeartbeat + nodeID
}

// NodeInfoKey returns the CRDT key for a node's network info.
func NodeInfoKey(nodeID string) string {
	return prefixNodeInfo + nodeID
}

// BlockKey returns the PebbleDB key for an IPLD block by CID bytes.
func BlockKey(cidBytes []byte) string {
	return prefixBlock + string(cidBytes)
}

// FormatHeartbeat encodes a unix timestamp as a heartbeat value.
func FormatHeartbeat(unixSeconds int64) []byte {
	return []byte(strconv.FormatInt(unixSeconds, 10))
}

// ParseHeartbeat decodes a heartbeat value to a unix timestamp.
func ParseHeartbeat(data []byte) (int64, error) {
	return strconv.ParseInt(string(data), 10, 64)
}

// ComputeClusterOverlayID derives a 32-byte overlay ID from the cluster config string.
func ComputeClusterOverlayID(clusterID string) [32]byte {
	return sha256.Sum256([]byte("ion-cluster-overlay:" + clusterID))
}

// hexEncode is a minimal hex encoder to avoid importing encoding/hex.
func hexEncode(b []byte) string {
	const hex = "0123456789abcdef"
	out := make([]byte, len(b)*2)
	for i, v := range b {
		out[i*2] = hex[v>>4]
		out[i*2+1] = hex[v&0x0f]
	}
	return string(out)
}

package cluster

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

// maxClockSkew is the maximum allowed difference between a timestamp and
// the current time. Prevents future-dated heartbeats and ownership claims.
const maxClockSkew = 60 // seconds

// NodeInfo holds a cluster node's network address for direct ADNL dialing.
// Stored in CRDT under key `nodeinfo/<nodeID>`.
// Self-certifying: the Signature field covers the payload, signed by
// the private key corresponding to PublicKey. This prevents other nodes
// from overwriting a node's public key in CRDT.
type NodeInfo struct {
	ADNLAddress string `json:"adnlAddr"`
	IP          string `json:"ip"`
	Port        int    `json:"port"`
	PublicKey   string `json:"publicKey,omitempty"`
	Signature   string `json:"signature,omitempty"`
}

// MarshalNodeInfo serializes NodeInfo to JSON bytes.
func MarshalNodeInfo(info NodeInfo) ([]byte, error) {
	return json.Marshal(info)
}

// MarshalSignedNodeInfo serializes NodeInfo with a self-certifying signature.
// The signature covers the canonical payload (all fields except Signature),
// preventing other nodes from forging nodeinfo entries.
func MarshalSignedNodeInfo(info NodeInfo, privKey ed25519.PrivateKey) ([]byte, error) {
	pubKey := privKey.Public().(ed25519.PublicKey)
	info.PublicKey = hex.EncodeToString(pubKey)
	info.Signature = "" // clear before signing
	payload, err := json.Marshal(info)
	if err != nil {
		return nil, fmt.Errorf("marshal nodeinfo payload: %w", err)
	}
	sig := ed25519.Sign(privKey, payload)
	info.Signature = hex.EncodeToString(sig)
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

// VerifyNodeInfo checks the self-certifying signature on a NodeInfo entry.
// Returns the verified public key, or an error if verification fails.
func VerifyNodeInfo(data []byte) (ed25519.PublicKey, error) {
	info, err := UnmarshalNodeInfo(data)
	if err != nil {
		return nil, err
	}
	if info.PublicKey == "" || info.Signature == "" {
		return nil, fmt.Errorf("nodeinfo missing public key or signature")
	}
	pubKeyBytes, err := hex.DecodeString(info.PublicKey)
	if err != nil || len(pubKeyBytes) != ed25519.PublicKeySize {
		return nil, fmt.Errorf("invalid public key in nodeinfo")
	}
	sig, err := hex.DecodeString(info.Signature)
	if err != nil {
		return nil, fmt.Errorf("invalid signature in nodeinfo")
	}
	// Reconstruct the signed payload (all fields except Signature).
	info.Signature = ""
	payload, err := json.Marshal(info)
	if err != nil {
		return nil, fmt.Errorf("re-marshal nodeinfo for verification: %w", err)
	}
	if !ed25519.Verify(pubKeyBytes, payload, sig) {
		return nil, fmt.Errorf("nodeinfo signature verification failed")
	}
	return ed25519.PublicKey(pubKeyBytes), nil
}

// ValidateNodeID rejects node IDs that could cause CRDT key injection.
// Only alphanumeric characters, hyphens, and underscores are allowed.
func ValidateNodeID(id string) error {
	if id == "" {
		return fmt.Errorf("node ID must not be empty")
	}
	for _, c := range id {
		if !((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-' || c == '_') {
			return fmt.Errorf("node ID contains invalid character: %c", c)
		}
	}
	return nil
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
	return prefixBlock + hexEncode(cidBytes)
}

// FormatHeartbeat encodes a unix timestamp as a heartbeat value (unsigned).
func FormatHeartbeat(unixSeconds int64) []byte {
	return []byte(strconv.FormatInt(unixSeconds, 10))
}

// ParseHeartbeat decodes an unsigned heartbeat value to a unix timestamp.
func ParseHeartbeat(data []byte) (int64, error) {
	return strconv.ParseInt(string(data), 10, 64)
}

// FormatSignedHeartbeat encodes a heartbeat with an ed25519 signature.
// Format: "<timestamp>:<hex_signature>" where the signed message is
// "heartbeat:<nodeID>:<timestamp>".
func FormatSignedHeartbeat(unixSeconds int64, nodeID string, privKey ed25519.PrivateKey) []byte {
	tsStr := strconv.FormatInt(unixSeconds, 10)
	msg := []byte("heartbeat:" + nodeID + ":" + tsStr)
	sig := ed25519.Sign(privKey, msg)
	return []byte(tsStr + ":" + hex.EncodeToString(sig))
}

// ParseSignedHeartbeat decodes a signed heartbeat, verifying the ed25519 signature.
func ParseSignedHeartbeat(data []byte, nodeID string, pubKey ed25519.PublicKey) (int64, error) {
	parts := strings.SplitN(string(data), ":", 2)
	if len(parts) != 2 {
		return 0, fmt.Errorf("invalid signed heartbeat format")
	}
	ts, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return 0, fmt.Errorf("parse timestamp: %w", err)
	}
	sig, err := hex.DecodeString(parts[1])
	if err != nil {
		return 0, fmt.Errorf("decode signature: %w", err)
	}
	msg := []byte("heartbeat:" + nodeID + ":" + parts[0])
	if !ed25519.Verify(pubKey, msg, sig) {
		return 0, fmt.Errorf("heartbeat signature verification failed")
	}
	return ts, nil
}

// FormatSignedOwnership creates a signed ownership claim.
// Format: "<nodeID>:<timestamp>:<hex_signature>"
// Signed message: "own:<bagIDHex>:<nodeID>:<timestamp>"
func FormatSignedOwnership(bagIDHex, nodeID string, ts int64, privKey ed25519.PrivateKey) []byte {
	tsStr := strconv.FormatInt(ts, 10)
	msg := []byte("own:" + bagIDHex + ":" + nodeID + ":" + tsStr)
	sig := ed25519.Sign(privKey, msg)
	return []byte(nodeID + ":" + tsStr + ":" + hex.EncodeToString(sig))
}

// ParseSignedOwnership verifies and extracts the nodeID from a signed ownership claim.
// getPubKey resolves a nodeID to its ed25519 public key from CRDT nodeinfo.
func ParseSignedOwnership(data []byte, bagIDHex string, getPubKey func(string) ed25519.PublicKey) (string, int64, error) {
	parts := strings.SplitN(string(data), ":", 3)
	if len(parts) != 3 {
		return "", 0, fmt.Errorf("invalid signed ownership format")
	}
	nodeID := parts[0]
	ts, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return "", 0, fmt.Errorf("parse ownership timestamp: %w", err)
	}
	sig, err := hex.DecodeString(parts[2])
	if err != nil {
		return "", 0, fmt.Errorf("decode ownership signature: %w", err)
	}
	pubKey := getPubKey(nodeID)
	if pubKey == nil {
		return "", 0, fmt.Errorf("no public key for node %s", nodeID)
	}
	msg := []byte("own:" + bagIDHex + ":" + nodeID + ":" + parts[1])
	if !ed25519.Verify(pubKey, msg, sig) {
		return "", 0, fmt.Errorf("ownership signature verification failed")
	}
	return nodeID, ts, nil
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

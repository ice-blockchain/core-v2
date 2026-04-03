package cluster

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
)

type mockPeerForwarder struct {
	data  []byte
	proof []byte
	err   error
}

func (m *mockPeerForwarder) ForwardPieceViaPeer(_ context.Context, _ [32]byte, _ [32]byte, _ int) ([]byte, []byte, error) {
	return m.data, m.proof, m.err
}

func (m *mockPeerForwarder) ForwardRawQuery(_ context.Context, _ [32]byte, _ [32]byte, _ []byte) ([]byte, error) {
	return nil, nil
}

type mockOwnerLookup struct {
	ownerNodeID string
	adnlAddr    [32]byte
}

func (m *mockOwnerLookup) Owner(_ [32]byte) string {
	return m.ownerNodeID
}

func (m *mockOwnerLookup) NodeADNLAddress(_ string) ([32]byte, string, int, bool) {
	if m.ownerNodeID == "" {
		return [32]byte{}, "", 0, false
	}
	return m.adnlAddr, "10.0.0.1", 3278, true
}

func TestForwardGetPieceSuccess(t *testing.T) {
	transport := &mockPeerForwarder{
		data:  []byte("piece-payload"),
		proof: []byte("merkle-proof"),
	}
	lookup := &mockOwnerLookup{ownerNodeID: "owner-1", adnlAddr: [32]byte{0x01}}

	forwarder := NewPieceForwarder(transport, lookup, nil, nil)
	data, proof, err := forwarder.ForwardGetPiece(context.Background(), [32]byte{0xAA}, 5)
	require.NoError(t, err)
	require.Equal(t, []byte("piece-payload"), data)
	require.Equal(t, []byte("merkle-proof"), proof)
}

func TestForwardGetPieceNoOwner(t *testing.T) {
	transport := &mockPeerForwarder{}
	lookup := &mockOwnerLookup{ownerNodeID: ""}

	forwarder := NewPieceForwarder(transport, lookup, nil, nil)
	_, _, err := forwarder.ForwardGetPiece(context.Background(), [32]byte{0xCC}, 0)
	require.Error(t, err)
	require.Contains(t, err.Error(), "no owner")
}

func TestForwardGetPieceNetworkError(t *testing.T) {
	transport := &mockPeerForwarder{err: fmt.Errorf("connection refused")}
	lookup := &mockOwnerLookup{ownerNodeID: "owner-1", adnlAddr: [32]byte{0x01}}

	forwarder := NewPieceForwarder(transport, lookup, nil, nil)
	_, _, err := forwarder.ForwardGetPiece(context.Background(), [32]byte{0xDD}, 0)
	require.Error(t, err)
	require.Contains(t, err.Error(), "forward to owner")
}

package cluster

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

type mockGatewayDialer struct {
	response []byte
	err      error
}

func (m *mockGatewayDialer) QueryRemoteNode(_ context.Context, _ [32]byte, _ string, _ int, _ []byte) ([]byte, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.response, nil
}

type mockOwnerLookup struct {
	ownerNodeID string
	adnlAddr    [32]byte
	ip          string
	port        int
}

func (m *mockOwnerLookup) Owner(_ [32]byte) string {
	return m.ownerNodeID
}

func (m *mockOwnerLookup) NodeADNLAddress(_ string) ([32]byte, string, int, bool) {
	if m.ownerNodeID == "" {
		return [32]byte{}, "", 0, false
	}
	return m.adnlAddr, m.ip, m.port, true
}

func TestForwardGetPieceSuccess(t *testing.T) {
	expectedData := []byte("piece-payload")
	expectedProof := []byte("merkle-proof")

	gateway := &mockGatewayDialer{
		response: SerializePieceResponse(expectedData, expectedProof),
	}
	lookup := &mockOwnerLookup{
		ownerNodeID: "owner-1",
		adnlAddr:    [32]byte{0x01},
		ip:          "10.0.0.1",
		port:        3278,
	}

	forwarder := NewPieceForwarder(gateway, lookup, nil, nil)
	data, proof, err := forwarder.ForwardGetPiece(context.Background(), [32]byte{0xAA}, 5)
	require.NoError(t, err)
	require.Equal(t, expectedData, data)
	require.Equal(t, expectedProof, proof)
}

func TestForwardGetPieceNotFound(t *testing.T) {
	gateway := &mockGatewayDialer{
		response: SerializePieceNotFound(),
	}
	lookup := &mockOwnerLookup{ownerNodeID: "owner-1", adnlAddr: [32]byte{0x01}}

	forwarder := NewPieceForwarder(gateway, lookup, nil, nil)
	_, _, err := forwarder.ForwardGetPiece(context.Background(), [32]byte{0xBB}, 0)
	require.Error(t, err)
	require.Contains(t, err.Error(), "not found")
}

func TestForwardGetPieceNoOwner(t *testing.T) {
	gateway := &mockGatewayDialer{}
	lookup := &mockOwnerLookup{ownerNodeID: ""}

	forwarder := NewPieceForwarder(gateway, lookup, nil, nil)
	_, _, err := forwarder.ForwardGetPiece(context.Background(), [32]byte{0xCC}, 0)
	require.Error(t, err)
	require.Contains(t, err.Error(), "no owner")
}

func TestForwardGetPieceNetworkError(t *testing.T) {
	gateway := &mockGatewayDialer{err: context.DeadlineExceeded}
	lookup := &mockOwnerLookup{ownerNodeID: "owner-1", adnlAddr: [32]byte{0x01}}

	forwarder := NewPieceForwarder(gateway, lookup, nil, nil)
	_, _, err := forwarder.ForwardGetPiece(context.Background(), [32]byte{0xDD}, 0)
	require.Error(t, err)
	require.Contains(t, err.Error(), "query owner")
}

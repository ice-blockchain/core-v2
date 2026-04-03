package cluster

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestCRDTHeadRoundTrip(t *testing.T) {
	original := []byte("QmSomeHeadCID12345")
	encoded := SerializeCRDTHead(original)
	decoded, err := ParseCRDTHead(encoded)
	require.NoError(t, err)
	require.Equal(t, original, decoded)
}

func TestGetBlockRoundTrip(t *testing.T) {
	cid := []byte("bafy2bzaceblockid")
	encoded := SerializeGetBlock(cid)
	decoded, err := ParseGetBlock(encoded)
	require.NoError(t, err)
	require.Equal(t, cid, decoded)
}

func TestBlockResponseRoundTrip(t *testing.T) {
	data := []byte("block-content-here")
	encoded := SerializeBlock(data)
	decoded, found, err := ParseBlockResponse(encoded)
	require.NoError(t, err)
	require.True(t, found)
	require.Equal(t, data, decoded)
}

func TestBlockNotFoundResponse(t *testing.T) {
	encoded := SerializeBlockNotFound()
	_, found, err := ParseBlockResponse(encoded)
	require.NoError(t, err)
	require.False(t, found)
}

func TestForwardPieceRequestRoundTrip(t *testing.T) {
	req := ForwardPieceRequest{
		BagID:   [32]byte{0xDE, 0xAD, 0xBE, 0xEF},
		PieceID: 42,
	}
	encoded := SerializeForwardPieceRequest(req)
	decoded, err := ParseForwardPieceRequest(encoded)
	require.NoError(t, err)
	require.Equal(t, req, decoded)
}

func TestPieceResponseRoundTrip(t *testing.T) {
	pieceData := []byte("piece-payload-512kb")
	proof := []byte("merkle-proof-bytes")
	encoded := SerializePieceResponse(pieceData, proof)
	decodedData, decodedProof, found, err := ParsePieceResponse(encoded)
	require.NoError(t, err)
	require.True(t, found)
	require.Equal(t, pieceData, decodedData)
	require.Equal(t, proof, decodedProof)
}

func TestPieceNotFoundResponse(t *testing.T) {
	encoded := SerializePieceNotFound()
	_, _, found, err := ParsePieceResponse(encoded)
	require.NoError(t, err)
	require.False(t, found)
}

func TestConstructorID(t *testing.T) {
	data := SerializeCRDTHead([]byte("test"))
	id, err := ConstructorID(data)
	require.NoError(t, err)
	require.Equal(t, tlCRDTHead, id)
}

func TestParseTruncatedData(t *testing.T) {
	_, err := ParseCRDTHead([]byte{0x01})
	require.Error(t, err)

	_, err = ParseGetBlock([]byte{0x01, 0x02})
	require.Error(t, err)

	_, err = ParseForwardPieceRequest(make([]byte, 10))
	require.Error(t, err)
}

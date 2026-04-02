//go:build e2e

package storage_test

import (
	"encoding/binary"
	"testing"

	"github.com/stretchr/testify/require"
)

// TL encoding helpers for test requests.

func appendUint32(buf []byte, v uint32) []byte {
	b := [4]byte{}
	binary.LittleEndian.PutUint32(b[:], v)
	return append(buf, b[:]...)
}

func buildGetPieceRequest(pieceID int32) []byte {
	buf := appendUint32(nil, 0x807ae660) // tlGetPiece
	return appendUint32(buf, uint32(pieceID))
}

func buildAddUpdateRequest() []byte {
	buf := appendUint32(nil, 0x4d3135d2)  // tlAddUpdate
	buf = append(buf, make([]byte, 8)...) // session_id = 0
	buf = appendUint32(buf, 0)            // seqno = 0
	buf = appendUint32(buf, 0xce33e0b6)   // tlUpdateInit
	buf = appendTLBytes(buf, []byte{})    // empty bitfield
	buf = appendUint32(buf, 0)            // have_pieces_offset = 0
	buf = appendUint32(buf, 0x3313708a)   // tlState
	buf = appendUint32(buf, 0xbc799737)   // BoolFalse (will_upload)
	buf = appendUint32(buf, 0x997275b5)   // BoolTrue (want_download)
	return buf
}

func appendTLBytes(buf, data []byte) []byte {
	if len(data) < 254 {
		buf = append(buf, byte(len(data)))
		buf = append(buf, data...)
		padding := (4 - (len(data)+1)%4) % 4
		for range padding {
			buf = append(buf, 0)
		}
		return buf
	}
	return buf
}

func parsePieceResponse(t *testing.T, data []byte) (proof, pieceData []byte) {
	t.Helper()
	require.True(t, len(data) >= 4)
	data = data[4:] // skip constructor ID
	proof, data = readTLBytes(t, data)
	pieceData, _ = readTLBytes(t, data)
	return proof, pieceData
}

func readTLBytes(t *testing.T, data []byte) ([]byte, []byte) {
	t.Helper()
	require.True(t, len(data) >= 1)
	firstByte := data[0]
	if firstByte < 254 {
		length := int(firstByte)
		data = data[1:]
		require.True(t, len(data) >= length)
		result := data[:length]
		totalRead := 1 + length
		padding := (4 - totalRead%4) % 4
		return result, data[length+padding:]
	}
	require.True(t, len(data) >= 4)
	length := int(data[1]) | int(data[2])<<8 | int(data[3])<<16
	data = data[4:]
	require.True(t, len(data) >= length)
	result := data[:length]
	padding := (4 - length%4) % 4
	return result, data[length+padding:]
}

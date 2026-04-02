package storage

import (
	"encoding/binary"
	"fmt"
)

// TL constructor IDs for TON Storage protocol.
// Computed via tl.CRC of the TL schema definitions.
// NOT registered via tl.Register to avoid conflicts with tonutils-storage in tests.
const (
	tlGetTorrentInfo   uint32 = 0x91c4962a
	tlTorrentInfoData  uint32 = 0x14ced0ee
	tlGetPiece         uint32 = 0x807ae660
	tlPieceResponse    uint32 = 0x80b4fa0d
	tlPing             uint32 = 0x44f3f211
	tlPong             uint32 = 0x6cf5c6a5
	tlAddUpdate        uint32 = 0x4d3135d2
	tlUpdateInit       uint32 = 0xce33e0b6
	tlState            uint32 = 0x3313708a
	tlOk               uint32 = 0xc32b1c05
	tlGetRandomPeers   uint32 = 0x48ee64ab
	tlBoolTrue         uint32 = 0x997275b5
	tlBoolFalse        uint32 = 0xbc799737
	tlUpdateHavePieces uint32 = 0x3bf82049
	tlUpdateState      uint32 = 0x05b034b5
)

func parseTLConstructorID(data []byte) (uint32, []byte, error) {
	if len(data) < 4 {
		return 0, nil, fmt.Errorf("TL data too short: %d bytes", len(data))
	}
	id := binary.LittleEndian.Uint32(data[:4])
	return id, data[4:], nil
}

// serializeTorrentInfoResponse encodes storage.torrentInfo { data:bytes }.
func serializeTorrentInfoResponse(bocData []byte) []byte {
	return appendTLBytes(appendUint32(nil, tlTorrentInfoData), bocData)
}

// serializePieceResponse encodes storage.piece { proof:bytes data:bytes }.
func serializePieceResponse(proof, data []byte) []byte {
	buf := appendUint32(nil, tlPieceResponse)
	buf = appendTLBytes(buf, proof)
	buf = appendTLBytes(buf, data)
	return buf
}

// serializeUpdateInitResponse encodes storage.updateInit { have_pieces:bytes have_pieces_offset:int state:storage.State }.
func serializeUpdateInitResponse(bitfield []byte) []byte {
	buf := appendUint32(nil, tlUpdateInit)
	buf = appendTLBytes(buf, bitfield)
	buf = appendInt32(buf, 0) // have_pieces_offset = 0
	buf = serializeState(buf, true, false)
	return buf
}

// serializePongResponse encodes storage.pong.
func serializePongResponse() []byte {
	return appendUint32(nil, tlPong)
}

func serializeState(buf []byte, willUpload, wantDownload bool) []byte {
	buf = appendUint32(buf, tlState)
	buf = appendBool(buf, willUpload)
	buf = appendBool(buf, wantDownload)
	return buf
}

// buildFullBitfield creates a bitfield with all bits set to 1.
func buildFullBitfield(pieceCount int) []byte {
	byteCount := (pieceCount + 7) / 8
	bf := make([]byte, byteCount)
	for i := range bf {
		bf[i] = 0xff
	}
	if remainder := pieceCount % 8; remainder != 0 {
		bf[byteCount-1] = (1 << remainder) - 1
	}
	return bf
}

// parseGetPieceRequest reads piece_id:int from TL payload.
func parseGetPieceRequest(data []byte) (int32, error) {
	if len(data) < 4 {
		return 0, fmt.Errorf("getPiece payload too short")
	}
	return int32(binary.LittleEndian.Uint32(data[:4])), nil
}

// parseAddUpdateRequest reads session_id:long seqno:int from TL payload.
func parseAddUpdateRequest(data []byte) (sessionID int64, seqno int32, updateData []byte, err error) {
	if len(data) < 12 {
		return 0, 0, nil, fmt.Errorf("addUpdate payload too short")
	}
	sessionID = int64(binary.LittleEndian.Uint64(data[:8]))
	seqno = int32(binary.LittleEndian.Uint32(data[8:12]))
	return sessionID, seqno, data[12:], nil
}

// parsePingRequest reads session_id:long from TL payload.
func parsePingRequest(data []byte) (int64, error) {
	if len(data) < 8 {
		return 0, fmt.Errorf("ping payload too short")
	}
	return int64(binary.LittleEndian.Uint64(data[:8])), nil
}

func appendUint32(buf []byte, v uint32) []byte {
	b := make([]byte, 4)
	binary.LittleEndian.PutUint32(b, v)
	return append(buf, b...)
}

func appendInt32(buf []byte, v int32) []byte {
	return appendUint32(buf, uint32(v))
}

func appendBool(buf []byte, v bool) []byte {
	if v {
		return appendUint32(buf, tlBoolTrue)
	}
	return appendUint32(buf, tlBoolFalse)
}

// appendTLBytes encodes a TL bytes field (length-prefixed with padding).
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
	buf = append(buf, 254)
	lenBytes := make([]byte, 4)
	binary.LittleEndian.PutUint32(lenBytes, uint32(len(data)))
	buf = append(buf, lenBytes[:3]...)
	buf = append(buf, data...)
	padding := (4 - len(data)%4) % 4
	for range padding {
		buf = append(buf, 0)
	}
	return buf
}

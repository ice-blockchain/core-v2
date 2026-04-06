package cluster

import (
	"encoding/binary"
	"fmt"
)

// TL constructor IDs for cluster protocols.
// Each ID is unique across both storage and cluster message types.
const (
	// CRDT head CID notification (cluster overlay).
	tlCRDTHead uint32 = 0xC0D70001

	// IPLD block exchange (cluster overlay).
	tlGetBlock      uint32 = 0xC0D70010
	tlBlock         uint32 = 0xC0D70011
	tlBlockNotFound uint32 = 0xC0D70012

	// Max size for any TL variable-length field. Prevents OOM from crafted messages.
	maxTLFieldSize uint32 = 4 << 20 // 4 MB

	// Piece forwarding (direct ADNL).
	tlForwardPieceRequest uint32 = 0xC0D70020
	tlPieceResponse       uint32 = 0xC0D70021
	tlPieceNotFound       uint32 = 0xC0D70022
)

// SerializeCRDTHead encodes a CRDT head CID notification.
func SerializeCRDTHead(headCID []byte) []byte {
	buf := make([]byte, 4+4+len(headCID))
	binary.LittleEndian.PutUint32(buf[0:4], tlCRDTHead)
	binary.LittleEndian.PutUint32(buf[4:8], uint32(len(headCID)))
	copy(buf[8:], headCID)
	return buf
}

// ParseCRDTHead decodes a CRDT head CID notification.
func ParseCRDTHead(data []byte) ([]byte, error) {
	if len(data) < 8 {
		return nil, fmt.Errorf("crdt head too short: %d bytes", len(data))
	}
	id := binary.LittleEndian.Uint32(data[0:4])
	if id != tlCRDTHead {
		return nil, fmt.Errorf("unexpected constructor: 0x%08x", id)
	}
	length := binary.LittleEndian.Uint32(data[4:8])
	if length > maxTLFieldSize {
		return nil, fmt.Errorf("crdt head length %d exceeds max %d", length, maxTLFieldSize)
	}
	if uint32(len(data)-8) < length {
		return nil, fmt.Errorf("crdt head truncated: need %d, have %d", length, len(data)-8)
	}
	return data[8 : 8+length], nil
}

// SerializeGetBlock encodes a block fetch request.
func SerializeGetBlock(cid []byte) []byte {
	buf := make([]byte, 4+4+len(cid))
	binary.LittleEndian.PutUint32(buf[0:4], tlGetBlock)
	binary.LittleEndian.PutUint32(buf[4:8], uint32(len(cid)))
	copy(buf[8:], cid)
	return buf
}

// ParseGetBlock decodes a block fetch request, returning the CID bytes.
func ParseGetBlock(data []byte) ([]byte, error) {
	if len(data) < 8 {
		return nil, fmt.Errorf("get block too short: %d bytes", len(data))
	}
	id := binary.LittleEndian.Uint32(data[0:4])
	if id != tlGetBlock {
		return nil, fmt.Errorf("unexpected constructor: 0x%08x", id)
	}
	length := binary.LittleEndian.Uint32(data[4:8])
	if length > maxTLFieldSize {
		return nil, fmt.Errorf("get block length %d exceeds max %d", length, maxTLFieldSize)
	}
	if uint32(len(data)-8) < length {
		return nil, fmt.Errorf("get block truncated")
	}
	return data[8 : 8+length], nil
}

// SerializeBlock encodes a block response with data.
func SerializeBlock(blockData []byte) []byte {
	buf := make([]byte, 4+4+len(blockData))
	binary.LittleEndian.PutUint32(buf[0:4], tlBlock)
	binary.LittleEndian.PutUint32(buf[4:8], uint32(len(blockData)))
	copy(buf[8:], blockData)
	return buf
}

// SerializeBlockNotFound encodes a block-not-found response.
func SerializeBlockNotFound() []byte {
	buf := make([]byte, 4)
	binary.LittleEndian.PutUint32(buf[0:4], tlBlockNotFound)
	return buf
}

// ParseBlockResponse decodes a block response. Returns (data, found, error).
func ParseBlockResponse(data []byte) ([]byte, bool, error) {
	if len(data) < 4 {
		return nil, false, fmt.Errorf("block response too short")
	}
	id := binary.LittleEndian.Uint32(data[0:4])
	switch id {
	case tlBlock:
		if len(data) < 8 {
			return nil, false, fmt.Errorf("block data truncated")
		}
		length := binary.LittleEndian.Uint32(data[4:8])
		if length > maxTLFieldSize {
			return nil, false, fmt.Errorf("block length %d exceeds max %d", length, maxTLFieldSize)
		}
		if uint32(len(data)-8) < length {
			return nil, false, fmt.Errorf("block data truncated")
		}
		return data[8 : 8+length], true, nil
	case tlBlockNotFound:
		return nil, false, nil
	default:
		return nil, false, fmt.Errorf("unexpected block response constructor: 0x%08x", id)
	}
}

// ForwardPieceRequest holds a piece forwarding request.
type ForwardPieceRequest struct {
	BagID   [32]byte
	PieceID int32
}

// SerializeForwardPieceRequest encodes a piece forwarding request.
func SerializeForwardPieceRequest(req ForwardPieceRequest) []byte {
	buf := make([]byte, 4+32+4)
	binary.LittleEndian.PutUint32(buf[0:4], tlForwardPieceRequest)
	copy(buf[4:36], req.BagID[:])
	binary.LittleEndian.PutUint32(buf[36:40], uint32(req.PieceID))
	return buf
}

// ParseForwardPieceRequest decodes a piece forwarding request.
func ParseForwardPieceRequest(data []byte) (ForwardPieceRequest, error) {
	if len(data) < 40 {
		return ForwardPieceRequest{}, fmt.Errorf("forward piece request too short: %d", len(data))
	}
	id := binary.LittleEndian.Uint32(data[0:4])
	if id != tlForwardPieceRequest {
		return ForwardPieceRequest{}, fmt.Errorf("unexpected constructor: 0x%08x", id)
	}
	var req ForwardPieceRequest
	copy(req.BagID[:], data[4:36])
	req.PieceID = int32(binary.LittleEndian.Uint32(data[36:40]))
	return req, nil
}

// SerializePieceResponse encodes a piece forwarding response.
func SerializePieceResponse(pieceData []byte, proof []byte) []byte {
	buf := make([]byte, 4+4+len(pieceData)+4+len(proof))
	binary.LittleEndian.PutUint32(buf[0:4], tlPieceResponse)
	binary.LittleEndian.PutUint32(buf[4:8], uint32(len(pieceData)))
	copy(buf[8:8+len(pieceData)], pieceData)
	off := 8 + len(pieceData)
	binary.LittleEndian.PutUint32(buf[off:off+4], uint32(len(proof)))
	copy(buf[off+4:], proof)
	return buf
}

// SerializePieceNotFound encodes a piece-not-found response.
func SerializePieceNotFound() []byte {
	buf := make([]byte, 4)
	binary.LittleEndian.PutUint32(buf[0:4], tlPieceNotFound)
	return buf
}

// ParsePieceResponse decodes a piece forwarding response.
// Returns (pieceData, proof, found, error).
func ParsePieceResponse(data []byte) ([]byte, []byte, bool, error) {
	if len(data) < 4 {
		return nil, nil, false, fmt.Errorf("piece response too short")
	}
	id := binary.LittleEndian.Uint32(data[0:4])
	switch id {
	case tlPieceResponse:
		return parsePieceResponsePayload(data)
	case tlPieceNotFound:
		return nil, nil, false, nil
	default:
		return nil, nil, false, fmt.Errorf("unexpected piece response constructor: 0x%08x", id)
	}
}

func parsePieceResponsePayload(data []byte) ([]byte, []byte, bool, error) {
	if len(data) < 8 {
		return nil, nil, false, fmt.Errorf("piece response truncated")
	}
	dataLen := binary.LittleEndian.Uint32(data[4:8])
	if dataLen > maxTLFieldSize {
		return nil, nil, false, fmt.Errorf("piece data length %d exceeds max %d", dataLen, maxTLFieldSize)
	}
	if uint64(dataLen) > uint64(len(data)-8) {
		return nil, nil, false, fmt.Errorf("piece data length %d exceeds available %d", dataLen, len(data)-8)
	}
	dataEnd := 8 + int(dataLen) // safe: dataLen <= len(data)-8, len(data) fits in int
	if len(data) < dataEnd+4 {
		return nil, nil, false, fmt.Errorf("piece response proof length truncated")
	}
	proofLen := binary.LittleEndian.Uint32(data[dataEnd : dataEnd+4])
	if proofLen > maxTLFieldSize {
		return nil, nil, false, fmt.Errorf("proof length %d exceeds max %d", proofLen, maxTLFieldSize)
	}
	if uint64(proofLen) > uint64(len(data)-dataEnd-4) {
		return nil, nil, false, fmt.Errorf("proof length %d exceeds available %d", proofLen, len(data)-dataEnd-4)
	}
	pieceData := data[8:dataEnd]
	proof := data[dataEnd+4 : dataEnd+4+int(proofLen)]
	return pieceData, proof, true, nil
}

// ConstructorID extracts the TL constructor ID from raw data.
func ConstructorID(data []byte) (uint32, error) {
	if len(data) < 4 {
		return 0, fmt.Errorf("data too short for constructor ID")
	}
	return binary.LittleEndian.Uint32(data[0:4]), nil
}

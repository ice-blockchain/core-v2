package stun

import (
	"encoding/binary"
	"fmt"
	"math/rand/v2"
	"net"
	"time"
)

// STUN message types and attributes (RFC 5389).
const (
	bindingRequest  = 0x0001
	bindingResponse = 0x0101
	magicCookie     = 0x2112A442
	attrMappedAddr  = 0x0001
	attrXORMapped   = 0x0020
	headerSize      = 20
)

// Default public STUN servers.
var defaultServers = []string{
	"stun.l.google.com:19302",
	"stun1.l.google.com:19302",
	"stun2.l.google.com:19302",
}

// DetectExternalIP sends a STUN Binding Request to public servers and
// returns the reflexive IPv4 address observed by the server. The timeout applies to the entire operation.
func DetectExternalIP(timeout time.Duration) (net.IP, error) {
	conn, err := net.ListenPacket("udp4", ":0")
	if err != nil {
		return nil, fmt.Errorf("stun: listen: %w", err)
	}
	defer conn.Close()
	conn.SetDeadline(time.Now().Add(timeout))

	txID := make([]byte, 12)
	for i := range txID {
		txID[i] = byte(rand.IntN(256))
	}

	req := buildRequest(txID)
	sent := false
	var sendErr error

	for _, server := range defaultServers {
		addr, err := net.ResolveUDPAddr("udp4", server)
		if err != nil {
			sendErr = err
			continue
		}
		if _, err := conn.WriteTo(req, addr); err != nil {
			sendErr = err
			continue
		}
		sent = true
	}
	if !sent {
		if sendErr != nil {
			return nil, fmt.Errorf("stun: send binding request: %w", sendErr)
		}
		return nil, fmt.Errorf("stun: no STUN servers configured")
	}

	buf := make([]byte, 512)
	n, _, err := conn.ReadFrom(buf)
	if err != nil {
		return nil, fmt.Errorf("stun: no response: %w", err)
	}

	return parseResponse(buf[:n], txID)
}

func buildRequest(txID []byte) []byte {
	buf := make([]byte, headerSize)
	binary.BigEndian.PutUint16(buf[0:2], bindingRequest)
	binary.BigEndian.PutUint16(buf[2:4], 0)
	binary.BigEndian.PutUint32(buf[4:8], magicCookie)
	copy(buf[8:20], txID)
	return buf
}

func parseResponse(data []byte, txID []byte) (net.IP, error) {
	if len(data) < headerSize {
		return nil, fmt.Errorf("stun: response too short")
	}

	msgType := binary.BigEndian.Uint16(data[0:2])
	if msgType != bindingResponse {
		return nil, fmt.Errorf("stun: unexpected message type 0x%04x", msgType)
	}

	for i := 0; i < 12; i++ {
		if data[8+i] != txID[i] {
			return nil, fmt.Errorf("stun: transaction ID mismatch")
		}
	}

	msgLen := int(binary.BigEndian.Uint16(data[2:4]))
	attrs := data[headerSize:]
	if len(attrs) < msgLen {
		return nil, fmt.Errorf("stun: truncated attributes")
	}
	attrs = attrs[:msgLen]

	for len(attrs) >= 4 {
		attrType := binary.BigEndian.Uint16(attrs[0:2])
		attrLen := int(binary.BigEndian.Uint16(attrs[2:4]))
		attrVal := attrs[4:]
		if len(attrVal) < attrLen {
			break
		}

		switch attrType {
		case attrXORMapped:
			return parseXORMappedAddress(attrVal[:attrLen], data[4:8])
		case attrMappedAddr:
			return parseMappedAddress(attrVal[:attrLen])
		}

		padded := attrLen + (4-attrLen%4)%4
		attrs = attrs[4+padded:]
	}

	return nil, fmt.Errorf("stun: no mapped address in response")
}

func parseXORMappedAddress(data, cookie []byte) (net.IP, error) {
	if len(data) < 8 {
		return nil, fmt.Errorf("stun: xor-mapped too short")
	}

	family := data[1]
	if family == 0x01 {
		ip := make(net.IP, 4)
		for i := 0; i < 4; i++ {
			ip[i] = data[4+i] ^ cookie[i]
		}
		return ip, nil
	}
	return nil, fmt.Errorf("stun: unsupported address family %#02x", family)
}

func parseMappedAddress(data []byte) (net.IP, error) {
	if len(data) < 8 {
		return nil, fmt.Errorf("stun: mapped-address too short")
	}
	family := data[1]
	if family == 0x01 {
		return net.IP(data[4:8]), nil
	}
	return nil, fmt.Errorf("stun: unsupported address family %#02x", family)
}

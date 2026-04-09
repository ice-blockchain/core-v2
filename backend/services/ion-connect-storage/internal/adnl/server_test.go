package adnl

import (
	"crypto/ed25519"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDecodePrivateKey_Valid(t *testing.T) {
	hexKey := "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
	key, err := decodePrivateKey(hexKey)
	require.NoError(t, err)
	require.Len(t, key, ed25519.PrivateKeySize)
	require.Len(t, key.Seed(), 32)
}

func TestDecodePrivateKey_InvalidHex(t *testing.T) {
	hexKey := "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"
	_, err := decodePrivateKey(hexKey)
	require.ErrorContains(t, err, "invalid hex")
}

func TestDecodePrivateKey_WrongLength(t *testing.T) {
	_, err := decodePrivateKey("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4")
	require.ErrorContains(t, err, "64 hex characters")
}

func TestDecodePrivateKey_Empty(t *testing.T) {
	_, err := decodePrivateKey("")
	require.ErrorContains(t, err, "64 hex characters")
}

func TestParseExternalAddr_Valid(t *testing.T) {
	ip, port, err := parseExternalAddr("1.2.3.4:3278")
	require.NoError(t, err)
	require.Equal(t, "1.2.3.4", ip.String())
	require.Equal(t, 3278, port)
}

func TestParseExternalAddr_Empty(t *testing.T) {
	_, _, err := parseExternalAddr("")
	require.ErrorContains(t, err, "required")
}

func TestParseExternalAddr_InvalidIP(t *testing.T) {
	_, _, err := parseExternalAddr("not-an-ip:3278")
	require.ErrorContains(t, err, "invalid IP")
}

func TestParseExternalAddr_MissingPort(t *testing.T) {
	_, _, err := parseExternalAddr("1.2.3.4")
	require.ErrorContains(t, err, "host:port")
}

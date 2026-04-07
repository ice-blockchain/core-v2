package adnl

import (
	"crypto/ed25519"
	"encoding/hex"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/xssnick/tonutils-go/adnl/keys"
	"github.com/xssnick/tonutils-go/tl"
)

func TestLoadKey_valid32ByteSeed(t *testing.T) {
	t.Parallel()
	seed := make([]byte, ed25519.SeedSize)
	seed[0] = 1

	key, err := LoadKey(hex.EncodeToString(seed))
	require.NoError(t, err)
	require.Len(t, key.Private, ed25519.PrivateKeySize)
	require.Len(t, key.Public, ed25519.PublicKeySize)
	require.NotEmpty(t, key.Address)
}

func TestLoadKey_strips0xPrefix(t *testing.T) {
	t.Parallel()
	seed := make([]byte, ed25519.SeedSize)
	seed[0] = 2

	key, err := LoadKey("0x" + hex.EncodeToString(seed))
	require.NoError(t, err)
	require.NotEmpty(t, key.Address)
}

func TestLoadKey_rejectsInvalidHex(t *testing.T) {
	t.Parallel()
	_, err := LoadKey("not-hex")
	require.Error(t, err)
}

func TestLoadKey_rejectsWrongLength(t *testing.T) {
	t.Parallel()
	_, err := LoadKey(hex.EncodeToString([]byte{1, 2, 3}))
	require.Error(t, err)
}

func TestLoadKey_addressMatchesTonutilsHash(t *testing.T) {
	t.Parallel()
	seed := make([]byte, ed25519.SeedSize)
	seed[0] = 0xAB
	priv := ed25519.NewKeyFromSeed(seed)
	pub := priv.Public().(ed25519.PublicKey)

	expected, err := tl.Hash(keys.PublicKeyED25519{Key: pub})
	require.NoError(t, err)

	key, err := LoadKey(hex.EncodeToString(seed))
	require.NoError(t, err)
	require.Equal(t, hex.EncodeToString(expected), key.Address)
}

func TestLoadKey_deterministic(t *testing.T) {
	t.Parallel()
	seed := hex.EncodeToString(make([]byte, ed25519.SeedSize))
	k1, err1 := LoadKey(seed)
	k2, err2 := LoadKey(seed)
	require.NoError(t, err1)
	require.NoError(t, err2)
	require.Equal(t, k1.Address, k2.Address)
}

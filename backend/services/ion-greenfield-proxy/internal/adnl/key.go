package adnl

import (
	"crypto/ed25519"
	"encoding/hex"
	"fmt"
	"strings"

	"ion-greenfield-proxy/internal/config"

	"github.com/xssnick/tonutils-go/adnl/keys"
	"github.com/xssnick/tonutils-go/tl"
)

// Key holds the Ed25519 key pair and the derived ADNL address.
type Key struct {
	Address string // hex-encoded ADNL address
	Private ed25519.PrivateKey
	Public  ed25519.PublicKey
}

// LoadKey parses a hex-encoded Ed25519 private key (32-byte seed)
// and derives the public key and ADNL address.
func LoadKey(hexKey string) (*Key, error) {
	hexKey = strings.TrimPrefix(hexKey, "0x")
	seed, err := hex.DecodeString(hexKey)
	if err != nil {
		return nil, fmt.Errorf("adnl key: invalid hex: %w", err)
	}
	if len(seed) != ed25519.SeedSize {
		return nil, fmt.Errorf("adnl key: expected %d bytes, got %d", ed25519.SeedSize, len(seed))
	}

	private := ed25519.NewKeyFromSeed(seed)
	public := private.Public().(ed25519.PublicKey)

	adnlAddr, err := tl.Hash(keys.PublicKeyED25519{Key: public})
	if err != nil {
		return nil, fmt.Errorf("adnl key: derive address: %w", err)
	}

	return &Key{
		Private: private,
		Public:  public,
		Address: hex.EncodeToString(adnlAddr),
	}, nil
}

// NewKey is the fx provider that loads the ADNL key from config.
func NewKey(cfg *config.Config) (*Key, error) {
	return LoadKey(cfg.ADNLPrivateKey)
}

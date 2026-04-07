package greenfield

import (
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"

	gnfdhttp "github.com/bnb-chain/greenfield-common/go/http"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

// RecoverAddress recovers the signer's Greenfield address from a
// GNFD1-ECDSA Authorization header by reconstructing the canonical
// request and performing secp256k1 ecrecover.
func RecoverAddress(req *http.Request) (common.Address, error) {
	sig, err := parseGNFD1Signature(req.Header.Get("Authorization"))
	if err != nil {
		return common.Address{}, err
	}

	msgToSign := gnfdhttp.GetMsgToSignInGNFD1Auth(req)

	pubkey, err := crypto.SigToPub(msgToSign, sig)
	if err != nil {
		return common.Address{}, fmt.Errorf("ecrecover: %w", err)
	}

	return crypto.PubkeyToAddress(*pubkey), nil
}

func parseGNFD1Signature(auth string) ([]byte, error) {
	if !strings.HasPrefix(auth, gnfdhttp.Gnfd1Ecdsa) {
		return nil, fmt.Errorf("not GNFD1-ECDSA auth: %q", auth)
	}

	idx := strings.Index(auth, "Signature=")
	if idx < 0 {
		return nil, fmt.Errorf("no Signature= in auth header")
	}

	sig, err := hex.DecodeString(auth[idx+len("Signature="):])
	if err != nil {
		return nil, fmt.Errorf("invalid signature hex: %w", err)
	}
	if len(sig) != 65 {
		return nil, fmt.Errorf("expected 65-byte signature, got %d", len(sig))
	}

	return sig, nil
}

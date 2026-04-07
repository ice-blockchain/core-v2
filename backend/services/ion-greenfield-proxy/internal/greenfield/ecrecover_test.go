package greenfield

import (
	"encoding/hex"
	"net/http"
	"testing"

	gnfdhttp "github.com/bnb-chain/greenfield-common/go/http"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/stretchr/testify/require"
)

func signRequest(t *testing.T, req *http.Request, privKeyHex string) {
	t.Helper()

	keyBytes, err := hex.DecodeString(privKeyHex)
	require.NoError(t, err)
	key, err := crypto.ToECDSA(keyBytes)
	require.NoError(t, err)

	msgToSign := gnfdhttp.GetMsgToSignInGNFD1Auth(req)
	sig, err := crypto.Sign(msgToSign, key)
	require.NoError(t, err)

	req.Header.Set("Authorization", "GNFD1-ECDSA, Signature="+hex.EncodeToString(sig))
}

func newSPRequest(t *testing.T, method, url string) *http.Request {
	t.Helper()
	req, err := http.NewRequest(method, url, nil)
	require.NoError(t, err)
	req.Header.Set("X-Gnfd-Content-Sha256", "")
	req.Header.Set("X-Gnfd-Date", "2026-04-01T10:00:00Z")
	req.Header.Set("X-Gnfd-Expiry-Timestamp", "2026-04-01T10:15:00Z")
	req.Header.Set("Content-Type", "application/octet-stream")
	return req
}

func TestRecoverAddress_recovers_signer_from_SP_request(t *testing.T) {
	t.Parallel()

	key, err := crypto.GenerateKey()
	require.NoError(t, err)
	expected := crypto.PubkeyToAddress(key.PublicKey)
	privHex := hex.EncodeToString(crypto.FromECDSA(key))

	req := newSPRequest(t, http.MethodGet,
		"http://127.0.0.1:9000/sp/dGVzdA/greenfield/admin/v1/get-recommended-vgf")
	signRequest(t, req, privHex)

	addr, err := RecoverAddress(req)
	require.NoError(t, err)
	require.Equal(t, expected, addr)
}

func TestRecoverAddress_recovers_signer_from_PUT_upload(t *testing.T) {
	t.Parallel()

	key, err := crypto.GenerateKey()
	require.NoError(t, err)
	expected := crypto.PubkeyToAddress(key.PublicKey)
	privHex := hex.EncodeToString(crypto.FromECDSA(key))

	req := newSPRequest(t, http.MethodPut,
		"http://127.0.0.1:9000/sp/dGVzdA/my-object?offset=0&complete=true")
	signRequest(t, req, privHex)

	addr, err := RecoverAddress(req)
	require.NoError(t, err)
	require.Equal(t, expected, addr)
}

func TestRecoverAddress_fails_without_authorization(t *testing.T) {
	t.Parallel()

	req := newSPRequest(t, http.MethodGet, "http://127.0.0.1:9000/sp/dGVzdA/path")

	_, err := RecoverAddress(req)
	require.ErrorContains(t, err, "not GNFD1-ECDSA auth")
}

func TestRecoverAddress_fails_with_wrong_auth_scheme(t *testing.T) {
	t.Parallel()

	req := newSPRequest(t, http.MethodGet, "http://127.0.0.1:9000/sp/dGVzdA/path")
	req.Header.Set("Authorization", "Bearer some-token")

	_, err := RecoverAddress(req)
	require.ErrorContains(t, err, "not GNFD1-ECDSA auth")
}

func TestRecoverAddress_fails_with_truncated_signature(t *testing.T) {
	t.Parallel()

	req := newSPRequest(t, http.MethodGet, "http://127.0.0.1:9000/sp/dGVzdA/path")
	req.Header.Set("Authorization", "GNFD1-ECDSA, Signature=abcd")

	_, err := RecoverAddress(req)
	require.ErrorContains(t, err, "expected 65-byte signature")
}

func TestRecoverAddress_fails_with_invalid_hex(t *testing.T) {
	t.Parallel()

	req := newSPRequest(t, http.MethodGet, "http://127.0.0.1:9000/sp/dGVzdA/path")
	req.Header.Set("Authorization", "GNFD1-ECDSA, Signature=ZZZZ")

	_, err := RecoverAddress(req)
	require.ErrorContains(t, err, "invalid signature hex")
}

func TestRecoverAddress_wrong_address_on_tampered_path(t *testing.T) {
	t.Parallel()

	key, err := crypto.GenerateKey()
	require.NoError(t, err)
	expected := crypto.PubkeyToAddress(key.PublicKey)
	privHex := hex.EncodeToString(crypto.FromECDSA(key))

	req := newSPRequest(t, http.MethodGet, "http://127.0.0.1:9000/sp/dGVzdA/original")
	signRequest(t, req, privHex)

	// Tamper with the path after signing.
	req.URL.Path = "/sp/dGVzdA/tampered"

	addr, err := RecoverAddress(req)
	require.NoError(t, err)
	require.NotEqual(t, expected, addr, "tampered request must recover a different address")
}

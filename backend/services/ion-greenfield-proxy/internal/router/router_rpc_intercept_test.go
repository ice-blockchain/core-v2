package router_test

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

// TestRPCIntercept_RejectsSignerCreatorMismatch sends a broadcast_tx_sync
// containing a MsgCreateBucket where Creator=addrB but the tx is signed
// by keyA. The proxy must reject it because the recovered signer does
// not match the Creator field.
func TestRPCIntercept_RejectsSignerCreatorMismatch(t *testing.T) {
	t.Parallel()

	privA, _, addrA := generateKey(t)
	_, _, addrB := generateKey(t)

	const accountNumber = 42
	body := broadcastCreateBucket(t, privA, addrB, accountNumber)

	signerHex := strings.ToLower(strings.TrimPrefix(addrA, "0x"))
	proxy := newTestProxyWithMock(t, newMockClient(t,
		[]string{"https://sp.example.com"},
		map[string]uint64{signerHex: accountNumber},
	))
	defer proxy.Close()

	rpcResp := postRPC(t, proxy.URL, body)
	require.NotNil(t, rpcResp.Error, "expected JSON-RPC error for signer mismatch")
	require.Contains(t, rpcResp.Error.Message, "signature verification failed")
}

// TestRPCIntercept_AcceptsMatchingSigner sends a broadcast_tx_sync where
// the signer matches the Creator field and verifies the request is accepted
// (bucket creation is attempted, not rejected at signature check).
func TestRPCIntercept_AcceptsMatchingSigner(t *testing.T) {
	t.Parallel()

	priv, _, addr := generateKey(t)

	const accountNumber = 10
	body := broadcastCreateBucket(t, priv, addr, accountNumber)

	signerHex := strings.ToLower(strings.TrimPrefix(addr, "0x"))
	proxy := newTestProxyWithMock(t, newMockClient(t,
		[]string{"https://sp.example.com"},
		map[string]uint64{signerHex: accountNumber},
	))
	defer proxy.Close()

	rpcResp := postRPC(t, proxy.URL, body)

	// When the signer matches, the proxy proceeds to EnsureBucket via
	// the mock client. The important thing is no "signature verification
	// failed" error — that proves the sig check passed.
	if rpcResp.Error != nil {
		require.NotContains(t, rpcResp.Error.Message, "signature verification failed",
			"signer matches Creator — sig check must pass")
	}
}

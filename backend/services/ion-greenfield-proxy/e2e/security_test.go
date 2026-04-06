package e2e

import (
	"bytes"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"

	gnfdcommon "github.com/bnb-chain/greenfield/types/common"
	storageTypes "github.com/bnb-chain/greenfield/x/storage/types"
	"github.com/cosmos/cosmos-sdk/codec"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	"github.com/cosmos/cosmos-sdk/crypto/keys/eth/ethsecp256k1"
	"github.com/cosmos/cosmos-sdk/std"
	sdk "github.com/cosmos/cosmos-sdk/types"
	signingtypes "github.com/cosmos/cosmos-sdk/types/tx/signing"
	"github.com/cosmos/cosmos-sdk/x/auth/signing"
	authtx "github.com/cosmos/cosmos-sdk/x/auth/tx"
	"github.com/cosmos/cosmos-sdk/x/feegrant"
	ethcrypto "github.com/ethereum/go-ethereum/crypto"
	"github.com/stretchr/testify/require"

	gnfdtypes "github.com/bnb-chain/greenfield-go-sdk/types"
)

// ---------------------------------------------------------------------------
// Security-test helpers (tx signing, raw RPC)
// ---------------------------------------------------------------------------

// helperNewKeyPairWithFunds creates a funded account and returns both
// the SDK Account and the raw ethsecp256k1 private key for manual signing.
func helperNewKeyPairWithFunds(t *testing.T) (*gnfdtypes.Account, *ethsecp256k1.PrivKey) {
	t.Helper()

	key, err := ethcrypto.GenerateKey()
	require.NoError(t, err)

	privHex := hex.EncodeToString(ethcrypto.FromECDSA(key))
	account, err := gnfdtypes.NewAccountFromPrivateKey("test", privHex)
	require.NoError(t, err)

	helperFundAccount(t, account.GetAddress().String())

	priv := &ethsecp256k1.PrivKey{Key: ethcrypto.FromECDSA(key)}
	return account, priv
}

// helperSignedTxBytes builds an EIP-712 signed TxRaw for a single message.
// Pass a non-nil feeGranter to set the Fee.Granter field.
func helperSignedTxBytes(
	t *testing.T,
	priv *ethsecp256k1.PrivKey,
	msg sdk.Msg,
	accountNumber, sequence uint64,
	feeGranter sdk.AccAddress,
) []byte {
	t.Helper()

	ir := codectypes.NewInterfaceRegistry()
	std.RegisterInterfaces(ir)
	storageTypes.RegisterInterfaces(ir)
	feegrant.RegisterInterfaces(ir)
	cdc := codec.NewProtoCodec(ir)
	txCfg := authtx.NewTxConfig(cdc, []signingtypes.SignMode{
		signingtypes.SignMode_SIGN_MODE_EIP_712,
	})

	txBuilder := txCfg.NewTxBuilder()
	require.NoError(t, txBuilder.SetMsgs(msg))
	txBuilder.SetGasLimit(200000)
	txBuilder.SetFeeAmount(sdk.NewCoins(sdk.NewInt64Coin("BNB", 1000000)))
	if feeGranter != nil {
		txBuilder.SetFeeGranter(feeGranter)
	}

	sigV2 := signingtypes.SignatureV2{
		PubKey: priv.PubKey(),
		Data: &signingtypes.SingleSignatureData{
			SignMode: signingtypes.SignMode_SIGN_MODE_EIP_712,
		},
		Sequence: sequence,
	}
	require.NoError(t, txBuilder.SetSignatures(sigV2))

	signBytes, err := txCfg.SignModeHandler().GetSignBytes(
		signingtypes.SignMode_SIGN_MODE_EIP_712,
		signing.SignerData{
			ChainID:       testChainID,
			AccountNumber: accountNumber,
			Sequence:      sequence,
		},
		txBuilder.GetTx(),
	)
	require.NoError(t, err)

	sig, err := priv.Sign(signBytes)
	require.NoError(t, err)

	sigV2.Data = &signingtypes.SingleSignatureData{
		SignMode:  signingtypes.SignMode_SIGN_MODE_EIP_712,
		Signature: sig,
	}
	require.NoError(t, txBuilder.SetSignatures(sigV2))

	txBytes, err := txCfg.TxEncoder()(txBuilder.GetTx())
	require.NoError(t, err)
	return txBytes
}

type jsonRPCResp struct {
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
	Result json.RawMessage `json:"result"`
}

func helperPostRPC(t *testing.T, body []byte) jsonRPCResp {
	t.Helper()
	resp, err := http.Post(testProxy.URL, "application/json", bytes.NewReader(body))
	require.NoError(t, err)
	defer resp.Body.Close()
	var rpc jsonRPCResp
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&rpc))
	return rpc
}

func helperBroadcastBody(txBytes []byte) []byte {
	encoded := base64.StdEncoding.EncodeToString(txBytes)
	return []byte(fmt.Sprintf(
		`{"jsonrpc":"2.0","id":1,"method":"broadcast_tx_sync","params":{"tx":"%s"}}`,
		encoded,
	))
}

func helperAccountNumber(t *testing.T, hexAddr string) uint64 {
	t.Helper()
	acct, err := testProxySDK.GetAccount(t.Context(), hexAddr)
	require.NoError(t, err, "GetAccount %s", hexAddr)
	return acct.GetAccountNumber()
}

// ---------------------------------------------------------------------------
// F1: SSRF — SP proxy rejects arbitrary HTTPS targets
// ---------------------------------------------------------------------------

func TestE2E_SPProxy_RejectsArbitraryTarget(t *testing.T) {
	t.Parallel()
	helperSkipWithoutKey(t)

	encoded := base64.RawURLEncoding.EncodeToString([]byte("https://httpbin.org/get"))
	resp, err := http.Get(testProxy.URL + "/sp/" + encoded)
	require.NoError(t, err)
	defer resp.Body.Close()

	require.Equal(t, http.StatusForbidden, resp.StatusCode,
		"arbitrary HTTPS target must be rejected by the SP allowlist")
}

// ---------------------------------------------------------------------------
// F2: Signer-Creator mismatch — bucket creation rejected
// ---------------------------------------------------------------------------

func TestE2E_CreateBucket_RejectsSignerMismatch(t *testing.T) {
	t.Parallel()
	helperSkipWithoutKey(t)

	signerAccount, signerPriv := helperNewKeyPairWithFunds(t)
	signerHex := helperAddrHex(signerAccount.GetAddress())

	creatorAccount := helperNewAccount(t)
	creatorHex := helperAddrHex(creatorAccount.GetAddress())

	t.Logf("signer:  0x%s", signerHex)
	t.Logf("creator: 0x%s (different — expect rejection)", creatorHex)

	accountNumber := helperAccountNumber(t, signerHex)

	msg := &storageTypes.MsgCreateBucket{
		Creator:           "0x" + creatorHex,
		BucketName:        creatorHex,
		PrimarySpApproval: &gnfdcommon.Approval{Sig: []byte{}},
	}

	txBytes := helperSignedTxBytes(t, signerPriv, msg, accountNumber, 0, nil)
	rpcResp := helperPostRPC(t, helperBroadcastBody(txBytes))

	require.NotNil(t, rpcResp.Error, "expected JSON-RPC error for signer mismatch")
	require.Contains(t, rpcResp.Error.Message, "signature verification failed")
}

// ---------------------------------------------------------------------------
// F3: Fee grant scoped to storage message types
// ---------------------------------------------------------------------------

func TestE2E_FeeGrant_ScopedToStorageMessages(t *testing.T) {
	t.Parallel()
	helperSkipWithoutKey(t)

	account, priv := helperNewKeyPairWithFunds(t)
	userHex := helperAddrHex(account.GetAddress())

	// Step 1: Create bucket (intercepted by proxy — no fee grant yet).
	client := helperNewClient(t, testProxy.URL, account)
	sps, err := client.ListStorageProviders(t.Context(), true)
	require.NoError(t, err)
	require.NotEmpty(t, sps)

	txHash, err := client.CreateBucket(
		t.Context(), userHex, sps[0].OperatorAddress,
		gnfdtypes.CreateBucketOptions{},
	)
	require.NoError(t, err, "CreateBucket")
	t.Logf("CreateBucket tx: %s", txHash)

	// Step 2: Send a raw broadcast_tx_sync with MsgDeleteBucket +
	// FeeGranter = proxyAddr. The proxy intercepts the broadcast,
	// verifies the real signature, and grants an AllowedMsgAllowance
	// BEFORE forwarding the tx to the chain.
	accountNumber := helperAccountNumber(t, userHex)
	acct, err := testProxySDK.GetAccount(t.Context(), userHex)
	require.NoError(t, err)

	msg := &storageTypes.MsgDeleteBucket{
		Operator:   "0x" + userHex,
		BucketName: userHex,
	}

	txBytes := helperSignedTxBytes(t, priv, msg, accountNumber, acct.GetSequence(), testProxyAddr)
	rpcResp := helperPostRPC(t, helperBroadcastBody(txBytes))
	t.Logf("DeleteBucket broadcast response: error=%v", rpcResp.Error)

	// Step 3: Query the fee allowance on-chain.
	granterHex := helperAddrHex(testProxyAddr)
	grant, err := testProxySDK.QueryAllowance(t.Context(), granterHex, userHex)
	require.NoError(t, err, "QueryAllowance")
	require.NotNil(t, grant, "fee grant must exist on-chain")
	require.NotNil(t, grant.Allowance)

	// Step 4: Assert the grant is AllowedMsgAllowance with the correct whitelist.
	require.Contains(t, grant.Allowance.TypeUrl, "AllowedMsgAllowance",
		"fee grant must be AllowedMsgAllowance, got %s", grant.Allowance.TypeUrl)

	var allowed feegrant.AllowedMsgAllowance
	require.NoError(t, allowed.Unmarshal(grant.Allowance.Value))

	expectedMsgs := []string{
		"/greenfield.storage.MsgCreateObject",
		"/greenfield.storage.MsgDelegateCreateObject",
		"/greenfield.storage.MsgUpdateObjectContent",
		"/greenfield.storage.MsgDeleteObject",
		"/greenfield.storage.MsgDeleteBucket",
	}
	require.ElementsMatch(t, expectedMsgs, allowed.AllowedMessages,
		"on-chain AllowedMessages must match the proxy's whitelist")

	t.Logf("fee grant type: %s", grant.Allowance.TypeUrl)
	t.Logf("allowed messages: %s", strings.Join(allowed.AllowedMessages, ", "))
}

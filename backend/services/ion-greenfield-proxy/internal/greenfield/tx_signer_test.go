package greenfield

import (
	"testing"

	gnfdcommon "github.com/bnb-chain/greenfield/types/common"
	storageTypes "github.com/bnb-chain/greenfield/x/storage/types"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/codec"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	"github.com/cosmos/cosmos-sdk/crypto/keys/eth/ethsecp256k1"
	cryptotypes "github.com/cosmos/cosmos-sdk/crypto/types"
	"github.com/cosmos/cosmos-sdk/std"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdktx "github.com/cosmos/cosmos-sdk/types/tx"
	signingtypes "github.com/cosmos/cosmos-sdk/types/tx/signing"
	"github.com/cosmos/cosmos-sdk/x/auth/signing"
	authtx "github.com/cosmos/cosmos-sdk/x/auth/tx"
	"github.com/cosmos/cosmos-sdk/x/feegrant"
	ethcrypto "github.com/ethereum/go-ethereum/crypto"
	"github.com/stretchr/testify/require"
)

const testChainID = "greenfield_5600-1"

// testKey generates an ethsecp256k1 key pair for testing.
func testKey(t *testing.T) (*ethsecp256k1.PrivKey, cryptotypes.PubKey, string) {
	t.Helper()
	key, err := ethcrypto.GenerateKey()
	require.NoError(t, err)

	privBytes := ethcrypto.FromECDSA(key)
	priv := &ethsecp256k1.PrivKey{Key: privBytes}
	pub := priv.PubKey()
	addr := ethcrypto.PubkeyToAddress(key.PublicKey).Hex()
	return priv, pub, addr
}

// testTxConfig creates a TxConfig with the same codec setup as the proxy.
func testTxConfig(t *testing.T) client.TxConfig {
	t.Helper()
	ir := codectypes.NewInterfaceRegistry()
	std.RegisterInterfaces(ir)
	storageTypes.RegisterInterfaces(ir)
	feegrant.RegisterInterfaces(ir)
	cdc := codec.NewProtoCodec(ir)

	return authtx.NewTxConfig(cdc, []signingtypes.SignMode{
		signingtypes.SignMode_SIGN_MODE_EIP_712,
	})
}

// signedTxBytes builds a signed TxRaw containing the given message,
// signed with the given private key using EIP-712.
func signedTxBytes(
	t *testing.T,
	priv *ethsecp256k1.PrivKey,
	msg sdk.Msg,
	accountNumber, sequence uint64,
) []byte {
	t.Helper()

	txCfg := testTxConfig(t)
	txBuilder := txCfg.NewTxBuilder()

	require.NoError(t, txBuilder.SetMsgs(msg))
	txBuilder.SetGasLimit(200000)
	txBuilder.SetFeeAmount(sdk.NewCoins(sdk.NewInt64Coin("BNB", 1000000)))

	// Set empty signature first so sign bytes use the correct AuthInfo.
	sigV2 := signingtypes.SignatureV2{
		PubKey: priv.PubKey(),
		Data: &signingtypes.SingleSignatureData{
			SignMode: signingtypes.SignMode_SIGN_MODE_EIP_712,
		},
		Sequence: sequence,
	}
	require.NoError(t, txBuilder.SetSignatures(sigV2))

	signerData := signing.SignerData{
		ChainID:       testChainID,
		AccountNumber: accountNumber,
		Sequence:      sequence,
	}
	signBytes, err := txCfg.SignModeHandler().GetSignBytes(
		signingtypes.SignMode_SIGN_MODE_EIP_712, signerData, txBuilder.GetTx(),
	)
	require.NoError(t, err)

	sig, err := priv.Sign(signBytes)
	require.NoError(t, err)

	sigV2.Data = &signingtypes.SingleSignatureData{
		SignMode:  signingtypes.SignMode_SIGN_MODE_EIP_712,
		Signature: sig,
	}
	require.NoError(t, txBuilder.SetSignatures(sigV2))

	encoder := txCfg.TxEncoder()
	txBytes, err := encoder(txBuilder.GetTx())
	require.NoError(t, err)
	return txBytes
}

// --- RecoverTxSigner tests ---

func TestRecoverTxSigner_valid_DeleteBucket(t *testing.T) {
	t.Parallel()

	priv, _, addr := testKey(t)
	msg := &storageTypes.MsgDeleteBucket{
		Operator:   addr,
		BucketName: "test-bucket",
	}

	txBytes := signedTxBytes(t, priv, msg, 42, 0)

	recovered, err := RecoverTxSigner(txBytes, testChainID, 42)
	require.NoError(t, err)
	require.Equal(t, addr, recovered)
}

func TestRecoverTxSigner_valid_CreateBucket(t *testing.T) {
	t.Parallel()

	priv, _, addr := testKey(t)
	msg := &storageTypes.MsgCreateBucket{
		Creator:          addr,
		BucketName:       "test-bucket",
		PrimarySpApproval: &gnfdcommon.Approval{Sig: []byte{}},
	}

	txBytes := signedTxBytes(t, priv, msg, 10, 0)

	recovered, err := RecoverTxSigner(txBytes, testChainID, 10)
	require.NoError(t, err)
	require.Equal(t, addr, recovered)
}

func TestRecoverTxSigner_wrong_account_number_fails(t *testing.T) {
	t.Parallel()

	priv, _, addr := testKey(t)
	msg := &storageTypes.MsgDeleteBucket{
		Operator:   addr,
		BucketName: "test-bucket",
	}

	txBytes := signedTxBytes(t, priv, msg, 42, 0)

	_, err := RecoverTxSigner(txBytes, testChainID, 999)
	require.Error(t, err)
	require.Contains(t, err.Error(), "signature verification failed")
}

func TestRecoverTxSigner_wrong_chain_id_fails(t *testing.T) {
	t.Parallel()

	priv, _, addr := testKey(t)
	msg := &storageTypes.MsgDeleteBucket{
		Operator:   addr,
		BucketName: "test-bucket",
	}

	txBytes := signedTxBytes(t, priv, msg, 42, 0)

	_, err := RecoverTxSigner(txBytes, "greenfield_9999-1", 42)
	require.Error(t, err)
	require.Contains(t, err.Error(), "signature verification failed")
}

func TestRecoverTxSigner_garbage_bytes_fails(t *testing.T) {
	t.Parallel()

	_, err := RecoverTxSigner([]byte("not a transaction"), testChainID, 0)
	require.Error(t, err)
	require.Contains(t, err.Error(), "decode tx")
}

func TestRecoverTxSigner_with_nonzero_sequence(t *testing.T) {
	t.Parallel()

	priv, _, addr := testKey(t)
	msg := &storageTypes.MsgDeleteBucket{
		Operator:   addr,
		BucketName: "test-bucket",
	}

	txBytes := signedTxBytes(t, priv, msg, 10, 7)

	recovered, err := RecoverTxSigner(txBytes, testChainID, 10)
	require.NoError(t, err)
	require.Equal(t, addr, recovered)
}

func TestRecoverTxSigner_different_signers_produce_different_addresses(t *testing.T) {
	t.Parallel()

	privA, _, addrA := testKey(t)
	privB, _, addrB := testKey(t)
	require.NotEqual(t, addrA, addrB)

	msg := &storageTypes.MsgDeleteBucket{
		Operator:   addrA,
		BucketName: "test-bucket",
	}

	txBytesA := signedTxBytes(t, privA, msg, 1, 0)
	txBytesB := signedTxBytes(t, privB, msg, 2, 0)

	recoveredA, err := RecoverTxSigner(txBytesA, testChainID, 1)
	require.NoError(t, err)
	require.Equal(t, addrA, recoveredA)

	recoveredB, err := RecoverTxSigner(txBytesB, testChainID, 2)
	require.NoError(t, err)
	require.Equal(t, addrB, recoveredB)
}

// --- ExtractSignerAddress tests ---

func TestExtractSignerAddress_derives_correct_address(t *testing.T) {
	t.Parallel()

	_, pub, expectedAddr := testKey(t)

	pkAny, err := codectypes.NewAnyWithValue(pub)
	require.NoError(t, err)

	authInfo := &sdktx.AuthInfo{
		SignerInfos: []*sdktx.SignerInfo{
			{PublicKey: pkAny, Sequence: 0},
		},
	}

	addr, err := ExtractSignerAddress(authInfo)
	require.NoError(t, err)
	require.Equal(t, expectedAddr, addr)
}

func TestExtractSignerAddress_nil_auth_info_fails(t *testing.T) {
	t.Parallel()

	_, err := ExtractSignerAddress(nil)
	require.ErrorContains(t, err, "no signer info")
}

func TestExtractSignerAddress_empty_signer_infos_fails(t *testing.T) {
	t.Parallel()

	_, err := ExtractSignerAddress(&sdktx.AuthInfo{})
	require.ErrorContains(t, err, "no signer info")
}

func TestExtractSignerAddress_nil_pubkey_fails(t *testing.T) {
	t.Parallel()

	authInfo := &sdktx.AuthInfo{
		SignerInfos: []*sdktx.SignerInfo{
			{PublicKey: nil, Sequence: 0},
		},
	}
	_, err := ExtractSignerAddress(authInfo)
	require.ErrorContains(t, err, "no public key")
}

// --- pubkeyToHexAddr tests ---

func TestPubkeyToHexAddr_deterministic(t *testing.T) {
	t.Parallel()

	_, pub, expectedAddr := testKey(t)

	addr1, err := pubkeyToHexAddr(pub)
	require.NoError(t, err)

	addr2, err := pubkeyToHexAddr(pub)
	require.NoError(t, err)

	require.Equal(t, addr1, addr2)
	require.Equal(t, expectedAddr, addr1)
}

func TestPubkeyToHexAddr_matches_go_ethereum(t *testing.T) {
	t.Parallel()

	key, err := ethcrypto.GenerateKey()
	require.NoError(t, err)

	expected := ethcrypto.PubkeyToAddress(key.PublicKey).Hex()

	compressed := ethcrypto.CompressPubkey(&key.PublicKey)
	pub := &ethsecp256k1.PubKey{Key: compressed}

	got, err := pubkeyToHexAddr(pub)
	require.NoError(t, err)
	require.Equal(t, expected, got)
}

// --- ecrecoverVerify tests ---

func TestEcrecoverVerify_valid_signature(t *testing.T) {
	t.Parallel()

	key, err := ethcrypto.GenerateKey()
	require.NoError(t, err)

	msg := ethcrypto.Keccak256([]byte("test message"))
	sig, err := ethcrypto.Sign(msg, key)
	require.NoError(t, err)

	compressed := ethcrypto.CompressPubkey(&key.PublicKey)
	pub := &ethsecp256k1.PubKey{Key: compressed}

	require.NoError(t, ecrecoverVerify(pub, sig, msg))
}

func TestEcrecoverVerify_wrong_pubkey_fails(t *testing.T) {
	t.Parallel()

	keyA, err := ethcrypto.GenerateKey()
	require.NoError(t, err)
	keyB, err := ethcrypto.GenerateKey()
	require.NoError(t, err)

	msg := ethcrypto.Keccak256([]byte("test message"))
	sig, err := ethcrypto.Sign(msg, keyA)
	require.NoError(t, err)

	compressed := ethcrypto.CompressPubkey(&keyB.PublicKey)
	pub := &ethsecp256k1.PubKey{Key: compressed}

	err = ecrecoverVerify(pub, sig, msg)
	require.ErrorContains(t, err, "does not match")
}

func TestEcrecoverVerify_wrong_message_fails(t *testing.T) {
	t.Parallel()

	key, err := ethcrypto.GenerateKey()
	require.NoError(t, err)

	msg := ethcrypto.Keccak256([]byte("original"))
	sig, err := ethcrypto.Sign(msg, key)
	require.NoError(t, err)

	compressed := ethcrypto.CompressPubkey(&key.PublicKey)
	pub := &ethsecp256k1.PubKey{Key: compressed}

	tampered := ethcrypto.Keccak256([]byte("tampered"))
	err = ecrecoverVerify(pub, sig, tampered)
	require.ErrorContains(t, err, "does not match")
}

func TestEcrecoverVerify_handles_metamask_v_offset(t *testing.T) {
	t.Parallel()

	key, err := ethcrypto.GenerateKey()
	require.NoError(t, err)

	msg := ethcrypto.Keccak256([]byte("test"))
	sig, err := ethcrypto.Sign(msg, key)
	require.NoError(t, err)

	// Simulate Metamask adding 27 to V.
	sig[64] += 27

	compressed := ethcrypto.CompressPubkey(&key.PublicKey)
	pub := &ethsecp256k1.PubKey{Key: compressed}

	require.NoError(t, ecrecoverVerify(pub, sig, msg))
}

func TestEcrecoverVerify_short_signature_returns_error(t *testing.T) {
	t.Parallel()

	_, pub, _ := testKey(t)

	err := ecrecoverVerify(pub, []byte{1, 2, 3}, ethcrypto.Keccak256([]byte("x")))
	require.ErrorContains(t, err, "invalid signature length")
}

func TestEcrecoverVerify_empty_signature_returns_error(t *testing.T) {
	t.Parallel()

	_, pub, _ := testKey(t)

	err := ecrecoverVerify(pub, nil, ethcrypto.Keccak256([]byte("x")))
	require.ErrorContains(t, err, "invalid signature length")
}

package greenfield

import (
	"fmt"
	"sync"

	storageTypes "github.com/bnb-chain/greenfield/x/storage/types"
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
	"github.com/ethereum/go-ethereum/common/math"
	ethcrypto "github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/crypto/secp256k1"
	"github.com/ethereum/go-ethereum/signer/core/apitypes"
)

// gnfdVerifyingContract is the Altai verifying contract address.
// Matches the unexported var in the SDK's eip712.go.
const gnfdVerifyingContract = "0x71e835aff094655dEF897fbc85534186DbeaB75d"

var (
	txDecoder     sdk.TxDecoder
	signModeHdl   signing.SignModeHandler
	codecInitOnce sync.Once
)

func initCodec() {
	codecInitOnce.Do(func() {
		ir := codectypes.NewInterfaceRegistry()
		std.RegisterInterfaces(ir)
		storageTypes.RegisterInterfaces(ir)
		feegrant.RegisterInterfaces(ir)
		cdc := codec.NewProtoCodec(ir)

		txDecoder = authtx.DefaultTxDecoder(cdc)
		txCfg := authtx.NewTxConfig(cdc, []signingtypes.SignMode{
			signingtypes.SignMode_SIGN_MODE_EIP_712,
		})
		signModeHdl = txCfg.SignModeHandler()
	})
}

// RecoverTxSigner verifies the EIP-712 signature on raw broadcast tx bytes
// and returns the signer's hex address (with 0x prefix).
//
// Steps:
//  1. Decode TxRaw via SDK TxDecoder (produces sdk.Tx / *wrapper)
//  2. Extract pubkey + signature from SignerInfos[0]
//  3. Compute EIP-712 sign bytes using the SDK's sign mode handler
//  4. Recover the pubkey via secp256k1 ecrecover
//  5. Compare recovered pubkey against the embedded pubkey
//  6. Return the derived Ethereum address
func RecoverTxSigner(txBytes []byte, chainID string, accountNumber uint64) (string, error) {
	initCodec()

	decodedTx, err := txDecoder(txBytes)
	if err != nil {
		return "", fmt.Errorf("decode tx: %w", err)
	}

	sigTx, ok := decodedTx.(signing.SigVerifiableTx)
	if !ok {
		return "", fmt.Errorf("tx does not implement SigVerifiableTx")
	}

	sigs, err := sigTx.GetSignaturesV2()
	if err != nil {
		return "", fmt.Errorf("get signatures: %w", err)
	}
	if len(sigs) == 0 {
		return "", fmt.Errorf("tx has no signatures")
	}

	sig := sigs[0]
	if sig.PubKey == nil {
		return "", fmt.Errorf("signer info has no public key")
	}

	singleSig, ok := sig.Data.(*signingtypes.SingleSignatureData)
	if !ok {
		return "", fmt.Errorf("expected single signature, got %T", sig.Data)
	}
	if len(singleSig.Signature) != ethcrypto.SignatureLength {
		return "", fmt.Errorf("invalid signature length: got %d, want %d", len(singleSig.Signature), ethcrypto.SignatureLength)
	}

	signerData := signing.SignerData{
		ChainID:       chainID,
		AccountNumber: accountNumber,
		Sequence:      sig.Sequence,
	}

	if err := verifyEip712(sig.PubKey, singleSig.Signature, signerData, decodedTx); err != nil {
		return "", fmt.Errorf("signature verification failed: %w", err)
	}

	return pubkeyToHexAddr(sig.PubKey)
}

// verifyEip712 tries both the old and Altai EIP-712 sign schemes.
func verifyEip712(pubKey cryptotypes.PubKey, sig []byte, signerData signing.SignerData, tx sdk.Tx) error {
	// Copy sig to avoid mutating the caller's slice (ecrecover modifies V)
	sigCopy := make([]byte, len(sig))
	copy(sigCopy, sig)

	signBytes, err := signModeHdl.GetSignBytes(signingtypes.SignMode_SIGN_MODE_EIP_712, signerData, tx)
	if err == nil {
		if err := ecrecoverVerify(pubKey, sigCopy, signBytes); err == nil {
			return nil
		}
	}

	// Reset sig copy for second attempt
	copy(sigCopy, sig)

	// Altai scheme: uses gnfdVerifyingContract in the domain
	signBytes, err = getSignBytesAltai(signerData, tx)
	if err != nil {
		return fmt.Errorf("altai sign bytes: %w", err)
	}
	return ecrecoverVerify(pubKey, sigCopy, signBytes)
}

// getSignBytesAltai computes EIP-712 sign bytes with the Altai verifying
// contract. The SDK's GetSignBytesRuntime requires a full sdk.Context with
// upgrade info. Since the proxy doesn't have one, we call the EIP-712
// helpers directly with the Altai domain.
func getSignBytesAltai(signerData signing.SignerData, tx sdk.Tx) ([]byte, error) {
	chainID, err := sdk.ParseChainID(signerData.ChainID)
	if err != nil {
		return nil, fmt.Errorf("parse chain ID: %w", err)
	}

	msgTypes, signDoc, err := authtx.GetMsgTypes(signerData, tx, chainID)
	if err != nil {
		return nil, fmt.Errorf("get msg types: %w", err)
	}

	typedDataDomain := apitypes.TypedDataDomain{
		Name:              "Greenfield Tx",
		Version:           "1.0.0",
		ChainId:           math.NewHexOrDecimal256(chainID.Int64()),
		VerifyingContract: gnfdVerifyingContract,
		Salt:              "0",
	}

	typedData, err := authtx.WrapTxToTypedData(signDoc, msgTypes, typedDataDomain)
	if err != nil {
		return nil, fmt.Errorf("wrap tx to typed data: %w", err)
	}
	return authtx.ComputeTypedDataHash(typedData)
}

// ecrecoverVerify recovers the pubkey from (msg, sig) and compares it
// against the expected pubkey. Mirrors the SDK's verifyEip712Signature.
func ecrecoverVerify(pubKey cryptotypes.PubKey, sig, msg []byte) error {
	if sig[ethcrypto.RecoveryIDOffset] == 27 || sig[ethcrypto.RecoveryIDOffset] == 28 {
		sig[ethcrypto.RecoveryIDOffset] -= 27
	}

	recovered, err := secp256k1.RecoverPubkey(msg, sig)
	if err != nil {
		return fmt.Errorf("ecrecover: %w", err)
	}

	ecPubKey, err := ethcrypto.UnmarshalPubkey(recovered)
	if err != nil {
		return fmt.Errorf("unmarshal recovered pubkey: %w", err)
	}

	pk := &ethsecp256k1.PubKey{Key: ethcrypto.CompressPubkey(ecPubKey)}
	if !pubKey.Equals(pk) {
		return fmt.Errorf("recovered signer does not match embedded pubkey")
	}
	return nil
}

// ExtractSignerAddress extracts the signer's Ethereum address from the
// AuthInfo pubkey without verifying the signature. Used for Simulate
// requests where signatures may be placeholders.
func ExtractSignerAddress(authInfo *sdktx.AuthInfo) (string, error) {
	if authInfo == nil || len(authInfo.SignerInfos) == 0 {
		return "", fmt.Errorf("no signer info in AuthInfo")
	}

	pkAny := authInfo.SignerInfos[0].PublicKey
	if pkAny == nil {
		return "", fmt.Errorf("signer info has no public key")
	}

	var pk ethsecp256k1.PubKey
	if err := pk.Unmarshal(pkAny.Value); err != nil {
		return "", fmt.Errorf("unmarshal ethsecp256k1 pubkey: %w", err)
	}

	return pubkeyToHexAddr(&pk)
}

// pubkeyToHexAddr derives the 0x-prefixed Ethereum address from a
// compressed ethsecp256k1 public key.
func pubkeyToHexAddr(pubKey cryptotypes.PubKey) (string, error) {
	ethPK, ok := pubKey.(*ethsecp256k1.PubKey)
	if !ok {
		return "", fmt.Errorf("expected ethsecp256k1.PubKey, got %T", pubKey)
	}

	uncompressed, err := ethcrypto.DecompressPubkey(ethPK.Key)
	if err != nil {
		return "", fmt.Errorf("decompress pubkey: %w", err)
	}
	return ethcrypto.PubkeyToAddress(*uncompressed).Hex(), nil
}

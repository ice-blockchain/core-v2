package router_test

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	gnfdcommon "github.com/bnb-chain/greenfield/types/common"
	storageTypes "github.com/bnb-chain/greenfield/x/storage/types"
	"github.com/cosmos/cosmos-sdk/codec"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	"github.com/cosmos/cosmos-sdk/crypto/keys/eth/ethsecp256k1"
	cryptotypes "github.com/cosmos/cosmos-sdk/crypto/types"
	"github.com/cosmos/cosmos-sdk/std"
	sdk "github.com/cosmos/cosmos-sdk/types"
	signingtypes "github.com/cosmos/cosmos-sdk/types/tx/signing"
	"github.com/cosmos/cosmos-sdk/x/auth/signing"
	authtx "github.com/cosmos/cosmos-sdk/x/auth/tx"
	"github.com/cosmos/cosmos-sdk/x/feegrant"
	ethcrypto "github.com/ethereum/go-ethereum/crypto"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"ion-greenfield-proxy/internal/adnl"
	"ion-greenfield-proxy/internal/config"
	"ion-greenfield-proxy/internal/router"
)

// --- constants ---

const testADNLAddress = "test-adnl-address"
const testChainID = "greenfield_5600-1"

// --- response types ---

type echoResponse struct {
	Path  string            `json:"path"`
	Query map[string]string `json:"query"`
}

type jsonRPCResponse struct {
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
	Result json.RawMessage `json:"result"`
}

// --- proxy constructors ---

// newTestProxy creates a proxy with NO provisioner (nil).
// Only useful for tests that verify rejection before the provisioner
// is consulted (invalid base64, empty path) or that test the
// nil-provisioner fail-closed behaviour itself.
func newTestProxy(t *testing.T) *httptest.Server {
	t.Helper()
	gin.SetMode(gin.TestMode)
	r, err := router.New(router.Params{
		Config: &config.Config{
			GreenfieldRPCEndpoint: "http://127.0.0.1:1",
			Env:                   "development",
		},
		Key: &adnl.Key{Address: testADNLAddress},
	})
	if err != nil {
		t.Fatalf("failed to create router: %v", err)
	}
	return httptest.NewServer(r)
}

// --- upstream helpers ---

func echoUpstream(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := echoResponse{
			Path:  r.URL.Path,
			Query: make(map[string]string),
		}
		for k, v := range r.URL.Query() {
			resp.Query[k] = v[0]
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
}

func unreachableUpstream(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("upstream should not be reached")
	}))
}

// --- SP proxy helpers ---

// spGet sends a GET to the proxy's /sp/ route with the Host header set,
// simulating how the ADNL transport delivers requests.
func spGet(t *testing.T, proxyURL, host, targetURL, extraPath string) *http.Response {
	t.Helper()
	encoded := base64.RawURLEncoding.EncodeToString([]byte(targetURL))
	req, err := http.NewRequest("GET", proxyURL+"/sp/"+encoded+extraPath, nil)
	require.NoError(t, err)
	req.Host = host
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	return resp
}

// --- tx signing helpers ---

func generateKey(t *testing.T) (*ethsecp256k1.PrivKey, cryptotypes.PubKey, string) {
	t.Helper()
	key, err := ethcrypto.GenerateKey()
	require.NoError(t, err)
	priv := &ethsecp256k1.PrivKey{Key: ethcrypto.FromECDSA(key)}
	return priv, priv.PubKey(), ethcrypto.PubkeyToAddress(key.PublicKey).Hex()
}

func signedTxBytes(
	t *testing.T,
	priv *ethsecp256k1.PrivKey,
	msg sdk.Msg,
	accountNumber, sequence uint64,
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

// broadcastCreateBucket builds a broadcast_tx_sync JSON-RPC body containing
// a MsgCreateBucket with the given creator, signed by priv.
func broadcastCreateBucket(t *testing.T, priv *ethsecp256k1.PrivKey, creator string, accountNumber uint64) []byte {
	t.Helper()
	creatorHex := strings.ToLower(strings.TrimPrefix(creator, "0x"))
	msg := &storageTypes.MsgCreateBucket{
		Creator:           creator,
		BucketName:        creatorHex,
		PrimarySpApproval: &gnfdcommon.Approval{Sig: []byte{}},
	}
	txBytes := signedTxBytes(t, priv, msg, accountNumber, 0)
	encoded := base64.StdEncoding.EncodeToString(txBytes)
	return []byte(fmt.Sprintf(
		`{"jsonrpc":"2.0","id":1,"method":"broadcast_tx_sync","params":{"tx":"%s"}}`,
		encoded,
	))
}

// --- RPC response helpers ---

// postRPC sends a JSON-RPC POST to proxyURL and decodes the response.
func postRPC(t *testing.T, proxyURL string, body []byte) jsonRPCResponse {
	t.Helper()
	resp, err := http.Post(proxyURL, "application/json", bytes.NewReader(body))
	require.NoError(t, err)
	defer resp.Body.Close()
	var rpcResp jsonRPCResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&rpcResp))
	return rpcResp
}

package middleware

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/buger/jsonparser"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	sdktx "github.com/cosmos/cosmos-sdk/types/tx"
	"github.com/gin-gonic/gin"

	"ion-greenfield-proxy/internal/rpcbody"
)

// decodedTx holds the decoded messages, fee granter, and crypto data
// needed for signature verification.
type decodedTx struct {
	Messages   []*codectypes.Any
	FeeGranter string // empty if not set

	// TxBytes is the raw transaction bytes (for broadcast path only).
	// Nil for the Simulate path when simReq.Tx is pre-decoded.
	TxBytes []byte

	// AuthInfo holds signer infos (pubkeys, sequences) and fee info.
	// Nil only when the tx has no AuthInfo bytes.
	AuthInfo *sdktx.AuthInfo

	// Signatures from TxRaw.Signatures (broadcast path only).
	Signatures [][]byte
}

// decodeTx extracts messages and fee granter from a JSON-RPC request
// that carries a cosmos transaction (Simulate ABCI query or broadcast_tx).
func decodeTx(parsed *rpcbody.Body) (*decodedTx, error) {
	switch {
	case parsed.IsABCIQuery("/cosmos.tx.v1beta1.Service/Simulate"):
		return decodeSimulateTx(parsed)
	case parsed.IsBroadcast():
		return decodeBroadcastTx(parsed)
	default:
		return nil, nil
	}
}

func decodeSimulateTx(parsed *rpcbody.Body) (*decodedTx, error) {
	dataHex, err := parsed.ParamString("data")
	if err != nil {
		return nil, fmt.Errorf("param data: %w", err)
	}
	dataBytes, err := hex.DecodeString(dataHex)
	if err != nil {
		return nil, fmt.Errorf("decode hex: %w", err)
	}

	var simReq sdktx.SimulateRequest
	if err := simReq.Unmarshal(dataBytes); err != nil {
		return nil, fmt.Errorf("unmarshal SimulateRequest: %w", err)
	}
	if simReq.Tx != nil && simReq.Tx.Body != nil {
		return &decodedTx{
			Messages:   simReq.Tx.Body.Messages,
			FeeGranter: feeGranterFromAuthInfo(simReq.Tx.AuthInfo),
			AuthInfo:   simReq.Tx.AuthInfo,
			Signatures: simReq.Tx.Signatures,
		}, nil
	}
	if len(simReq.TxBytes) == 0 {
		return nil, fmt.Errorf("SimulateRequest has neither Tx nor TxBytes")
	}
	return decodeTxRaw(simReq.TxBytes)
}

func decodeBroadcastTx(parsed *rpcbody.Body) (*decodedTx, error) {
	txBase64, err := parsed.ParamString("tx")
	if err != nil {
		return nil, fmt.Errorf("param tx: %w", err)
	}
	txBytes, err := base64.StdEncoding.DecodeString(txBase64)
	if err != nil {
		return nil, fmt.Errorf("decode base64 tx: %w", err)
	}
	return decodeTxRaw(txBytes)
}

func decodeTxRaw(txBytes []byte) (*decodedTx, error) {
	var raw sdktx.TxRaw
	if err := raw.Unmarshal(txBytes); err != nil {
		return nil, fmt.Errorf("unmarshal TxRaw: %w", err)
	}
	var body sdktx.TxBody
	if err := body.Unmarshal(raw.BodyBytes); err != nil {
		return nil, fmt.Errorf("unmarshal TxBody: %w", err)
	}

	dt := &decodedTx{
		Messages:   body.Messages,
		TxBytes:    txBytes,
		Signatures: raw.Signatures,
	}

	if len(raw.AuthInfoBytes) > 0 {
		var authInfo sdktx.AuthInfo

		err := authInfo.Unmarshal(raw.AuthInfoBytes)
		if err == nil {
			dt.AuthInfo = &authInfo
			if authInfo.Fee != nil {
				dt.FeeGranter = authInfo.Fee.Granter
			}
		} else {
			slog.Error("cannot decode AuthInfo from TxRaw, proceeding without fee granter info", "error", err)
		}
	}

	return dt, nil
}

func feeGranterFromAuthInfo(authInfo *sdktx.AuthInfo) string {
	if authInfo != nil && authInfo.Fee != nil {
		return authInfo.Fee.Granter
	}
	return ""
}

// --- Response helpers (used by interceptors that abort the request) ---

// abortBroadcastOK writes a fake successful broadcast_tx response and aborts.
func abortBroadcastOK(c *gin.Context, parsed *rpcbody.Body, txHash string) {
	writeJSONRPC(c, parsed.Raw, broadcastTxResult{Hash: txHash})
}

// abortJSONRPCError writes a JSON-RPC error response and aborts.
func abortJSONRPCError(c *gin.Context, raw []byte, message string) {
	resp := rpcRespEnvelope{
		JSONRPC: "2.0",
		ID:      jsonRPCID(raw),
		Error:   &rpcRespError{Code: -32000, Message: message},
	}
	body, _ := json.Marshal(resp)
	c.Data(http.StatusOK, "application/json", body)
	c.Abort()
}

// writeJSONRPC marshals result into a JSON-RPC success envelope and
// writes it using json.NewEncoder (matching CometBFT's server behavior).
func writeJSONRPC(c *gin.Context, raw []byte, result any) {
	resp := rpcRespEnvelope{
		JSONRPC: "2.0",
		ID:      jsonRPCID(raw),
	}
	resp.Result, _ = json.Marshal(result)
	c.Status(http.StatusOK)
	c.Header("Content-Type", "application/json")
	_ = json.NewEncoder(c.Writer).Encode(resp)
	c.Abort()
}

// syntheticTxHash generates a deterministic 64-char hex hash from a seed.
func syntheticTxHash(seed string) string {
	h := sha256.Sum256([]byte("intercepted:" + seed))
	return strings.ToUpper(hex.EncodeToString(h[:]))
}

func jsonRPCID(raw []byte) json.RawMessage {
	value, dataType, _, err := jsonparser.Get(raw, "id")
	if err != nil || dataType == jsonparser.NotExist {
		return json.RawMessage("null")
	}
	return json.RawMessage(value)
}

// --- JSON-RPC response types ---

type rpcRespEnvelope struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id"`
	Result  json.RawMessage `json:"result,omitempty"`
	Error   *rpcRespError   `json:"error,omitempty"`
}

type rpcRespError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type broadcastTxResult struct {
	Code      int32  `json:"code"`
	Data      string `json:"data"`
	Log       string `json:"log"`
	Codespace string `json:"codespace"`
	Hash      string `json:"hash"`
}

package middleware

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	spTypes "github.com/bnb-chain/greenfield/x/sp/types"
	storageTypes "github.com/bnb-chain/greenfield/x/storage/types"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	proto "github.com/cosmos/gogoproto/proto"
	"github.com/gin-gonic/gin"

	gf "ion-greenfield-proxy/internal/greenfield"
	"ion-greenfield-proxy/internal/rpcbody"
)

// RPCIntercept intercepts specific JSON-RPC requests before they reach
// the ProxyRPC handler:
//
//   - StorageProviders ABCI query → forwards to upstream, rewrites SP
//     endpoints to route through the proxy, returns modified response.
//   - CreateBucket broadcast → proxy creates the bucket on behalf of
//     the user and returns the real tx hash.
//
// Both paths abort the request so it never reaches the handler.
func RPCIntercept(logger *slog.Logger, rpcEndpoint string, adnlAddress string, provisioner *gf.BucketProvisioner) gin.HandlerFunc {
	logger = logger.With("middleware", "rpc_intercept")
	return func(c *gin.Context) {
		parsed := rpcbody.FromContext(c)
		if parsed == nil {
			return
		}

		if parsed.IsABCIQuery("/greenfield.sp.Query/StorageProviders") {
			interceptStorageProviders(logger, rpcEndpoint, adnlAddress, c, parsed)
			return
		}

		if parsed.IsBroadcast() && provisioner != nil {
			interceptCreateBucket(logger, provisioner, c, parsed)
		}
	}
}

func interceptStorageProviders(logger *slog.Logger, rpcEndpoint, adnlAddress string, c *gin.Context, parsed *rpcbody.Body) {
	resp, err := http.Post(rpcEndpoint, "application/json", bytes.NewReader(parsed.Raw))
	if err != nil {
		logger.Error("upstream request failed", "error", err)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		logger.Error("failed to read upstream response", "error", err)
		return
	}

	modified := rewriteSPEndpoints(body, adnlAddress, logger)
	c.Data(resp.StatusCode, "application/json", modified)
	c.Abort()
}

func rewriteSPEndpoints(body []byte, adnlAddress string, logger *slog.Logger) []byte {
	var rpcResp spRPCResponse
	if err := json.Unmarshal(body, &rpcResp); err != nil {
		logger.Error("failed to unmarshal RPC response", "error", err)
		return body
	}

	var msg spTypes.QueryStorageProvidersResponse
	if err := proto.Unmarshal(rpcResp.Result.Response.Value, &msg); err != nil {
		logger.Error("failed to unmarshal ABCI response value", "error", err)
		return body
	}

	for i := range msg.Sps {
		var u url.URL
		u.Scheme = "http"
		u.Host = adnlAddress
		msg.Sps[i].Endpoint = u.JoinPath("sp", base64.RawURLEncoding.EncodeToString([]byte(msg.Sps[i].Endpoint))).String()
	}

	newValue, err := proto.Marshal(&msg)
	if err != nil {
		logger.Error("failed to marshal modified ABCI value", "error", err)
		return body
	}

	rpcResp.Result.Response.Value = newValue
	out, err := json.Marshal(rpcResp)
	if err != nil {
		logger.Error("failed to marshal modified RPC response", "error", err)
		return body
	}
	return out
}

type spRPCResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id"`
	Result  spABCIResult    `json:"result"`
}

type spABCIResult struct {
	Response struct {
		Code      int32  `json:"code"`
		Log       string `json:"log"`
		Info      string `json:"info"`
		Index     string `json:"index"`
		Key       []byte `json:"key"`
		Value     []byte `json:"value"`
		ProofOps  []byte `json:"proof_ops,omitempty"`
		Height    string `json:"height"`
		Codespace string `json:"codespace"`
	} `json:"response"`
}

// interceptCreateBucket only intercepts broadcast requests.
// Simulations are forwarded to the chain so the SDK gets real gas estimates.
func interceptCreateBucket(logger *slog.Logger, provisioner *gf.BucketProvisioner, c *gin.Context, parsed *rpcbody.Body) {
	tx, err := decodeTx(parsed)
	if err != nil || tx == nil || len(tx.Messages) == 0 {
		return
	}

	bucket := findCreateBucketMsg(tx.Messages)
	if bucket == nil {
		return
	}

	creatorHex := strings.ToLower(strings.TrimPrefix(bucket.Creator, "0x"))
	if bucket.BucketName != creatorHex {
		return
	}

	creatorAddr := "0x" + creatorHex
	logger.Info("CreateBucket intercepted",
		"bucket", bucket.BucketName,
		"creator", creatorAddr,
	)

	txHash, err := provisioner.EnsureBucket(c.Request.Context(), bucket.BucketName, creatorAddr)
	if err != nil {
		logger.Error("failed to create bucket",
			"bucket", bucket.BucketName,
			"error", err,
		)
		abortJSONRPCError(c, parsed.Raw, "create bucket: "+err.Error())
		return
	}

	if txHash == "" {
		txHash = syntheticTxHash(bucket.BucketName)
	}
	abortBroadcastOK(c, parsed, txHash)
}

func findCreateBucketMsg(msgs []*codectypes.Any) *storageTypes.MsgCreateBucket {
	for _, a := range msgs {
		if a.TypeUrl != "/greenfield.storage.MsgCreateBucket" {
			continue
		}
		var m storageTypes.MsgCreateBucket
		if m.Unmarshal(a.Value) != nil {
			continue
		}
		return &m
	}
	return nil
}

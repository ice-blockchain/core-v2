package middleware

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	spTypes "github.com/bnb-chain/greenfield/x/sp/types"
	storageTypes "github.com/bnb-chain/greenfield/x/storage/types"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	proto "github.com/cosmos/gogoproto/proto"
	"github.com/gin-gonic/gin"

	gf "ion-greenfield-proxy/internal/greenfield"
	"ion-greenfield-proxy/internal/rpcbody"
)

const maxSPResponseSize = 4 << 20 // 4 MiB

var rpcClient = &http.Client{
	Transport: &http.Transport{
		DialContext:           (&net.Dialer{Timeout: 10 * time.Second}).DialContext,
		TLSHandshakeTimeout:   10 * time.Second,
		ResponseHeaderTimeout: 30 * time.Second,
		IdleConnTimeout:       90 * time.Second,
		MaxIdleConnsPerHost:   5,
	},
}

// RPCIntercept intercepts specific JSON-RPC requests before they reach
// the ProxyRPC handler:
//
//   - StorageProviders ABCI query → forwards to upstream, rewrites SP
//     endpoints to route through the proxy, returns modified response.
//   - CreateBucket broadcast → proxy creates the bucket on behalf of
//     the user and returns the real tx hash.
//
// Both paths abort the request so it never reaches the handler.
func RPCIntercept(logger *slog.Logger, rpcEndpoint string, adnlAddress string, provisioner gf.BucketProvisioner, chainID string) gin.HandlerFunc {
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
			interceptCreateBucket(logger, provisioner, chainID, c, parsed)
		}
	}
}

func interceptStorageProviders(logger *slog.Logger, rpcEndpoint, adnlAddress string, c *gin.Context, parsed *rpcbody.Body) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, rpcEndpoint, bytes.NewReader(parsed.Raw))
	if err != nil {
		logger.Error("failed to create upstream request", "error", err)
		abortJSONRPCError(c, parsed.Raw, "internal error")
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := rpcClient.Do(req)
	if err != nil {
		logger.Error("upstream request failed", "error", err)
		abortJSONRPCError(c, parsed.Raw, "internal error")
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxSPResponseSize))
	if err != nil {
		logger.Error("failed to read upstream response", "error", err)
		abortJSONRPCError(c, parsed.Raw, "internal error")
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
func interceptCreateBucket(logger *slog.Logger, provisioner gf.BucketProvisioner, chainID string, c *gin.Context, parsed *rpcbody.Body) {
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

	// Verify signature before creating the bucket on-chain.
	// interceptCreateBucket is only called for broadcasts, so full ecrecover.
	signer, err := verifyTxSigner(c.Request.Context(), tx, chainID, provisioner, true)
	if err != nil {
		logger.Warn("CreateBucket signature verification failed",
			"creator", creatorAddr,
			"error", err,
		)
		abortJSONRPCError(c, parsed.Raw, "signature verification failed")
		return
	}
	if !strings.EqualFold(signer, creatorAddr) {
		logger.Warn("CreateBucket signer mismatch",
			"creator", creatorAddr,
			"signer", signer,
		)
		abortJSONRPCError(c, parsed.Raw, "signature verification failed")
		return
	}

	c.Set(ContextKeyTxSigner, signer)
	logger.Info("CreateBucket intercepted",
		"bucket", bucket.BucketName,
		"creator", creatorAddr,
		"verified_signer", signer,
	)

	txHash, err := provisioner.EnsureBucket(c.Request.Context(), bucket.BucketName, creatorAddr)
	if err != nil {
		logger.Error("failed to create bucket",
			"bucket", bucket.BucketName,
			"error", err,
		)
		abortJSONRPCError(c, parsed.Raw, "internal error: bucket creation failed")
		return
	}

	if txHash == "" {
		txHash = syntheticTxHash(bucket.BucketName)
	}
	abortBroadcastOK(c, parsed, txHash)
}

// verifyTxSigner recovers the signer from the transaction.
// When requireEcrecover is true (broadcast path), performs full EIP-712
// ecrecover against the raw tx bytes. When false (simulate path),
// extracts the pubkey from AuthInfo — simulate requests may carry
// placeholder signatures that would fail ecrecover.
func verifyTxSigner(ctx context.Context, tx *decodedTx, chainID string, provisioner gf.BucketProvisioner, requireEcrecover bool) (string, error) {
	if requireEcrecover && len(tx.TxBytes) > 0 {
		addr, err := gf.ExtractSignerAddress(tx.AuthInfo)
		if err != nil {
			return "", err
		}
		accNum, err := provisioner.GetAccountNumber(ctx, addr)
		if err != nil {
			return "", fmt.Errorf("get account number: %w", err)
		}
		return gf.RecoverTxSigner(tx.TxBytes, chainID, accNum)
	}
	return gf.ExtractSignerAddress(tx.AuthInfo)
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

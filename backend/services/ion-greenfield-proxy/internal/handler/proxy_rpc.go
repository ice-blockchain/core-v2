package handler

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	spTypes "github.com/bnb-chain/greenfield/x/sp/types"
	"github.com/buger/jsonparser"
	proto "github.com/cosmos/gogoproto/proto"
	"github.com/gin-gonic/gin"
)

const (
	reqReadLimit = 1 << 20 // 1 MiB
)

var (
	interceptableABCIPaths = map[string]struct{}{
		"/greenfield.sp.Query/StorageProviders": struct{}{},
	}
)

func tryExtractABCIPath(req []byte) (string, bool) {
	val, err := jsonparser.GetString(req, "jsonrpc")
	if val != "2.0" || err != nil {
		return "", false
	}

	val, err = jsonparser.GetString(req, "method")
	if val != "abci_query" || err != nil {
		return "", false
	}

	val, err = jsonparser.GetString(req, "params", "path")
	if err != nil {
		return "", false
	}
	return val, len(val) > 0
}

func canInterceptRPC(c *gin.Context) bool {
	return c.Request.Method == http.MethodPost &&
		c.Request.URL.Path == "/" &&
		strings.HasPrefix(strings.ToLower(c.ContentType()), "application/json")
}

func ProxyRPC(rpcURL *url.URL, logger *slog.Logger, adnlAddress string) gin.HandlerFunc {
	genericRPCProxy := newReverseProxy(rpcURL, logger)
	return func(c *gin.Context) {
		// For non-RPC requests, just proxy without logging or interception.
		if !canInterceptRPC(c) {
			genericRPCProxy.ServeHTTP(c.Writer, c.Request)
			return
		}

		body, err := io.ReadAll(io.LimitReader(c.Request.Body, reqReadLimit))
		if err != nil {
			c.Error(fmt.Errorf("failed to read request body: %w", err))
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}
		c.Request.Body.Close()
		c.Request.Body = io.NopCloser(bytes.NewBuffer(body))

		abciPath, found := tryExtractABCIPath(body)
		_, ok := interceptableABCIPaths[abciPath]
		if !ok || !found {
			logger.Debug("proxying ABCI request as-is",
				"method", c.Request.Method,
				"path", c.Request.URL.Path,
				"abci_path", abciPath,
			)
			genericRPCProxy.ServeHTTP(c.Writer, c.Request)
			return
		}

		logger.Info("proxying ABCI request with interception",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"abci_path", abciPath,
		)

		var modify func([]byte) []byte
		switch abciPath {
		case "/greenfield.sp.Query/StorageProviders":
			modify = func(in []byte) (out []byte) {
				var rpcResp jsonRPCResponse[jsonRPCStorageProvidersResult]

				err := json.Unmarshal(in, &rpcResp)
				if err != nil {
					c.Error(fmt.Errorf("failed to unmarshal RPC response: %w", err))
					return in
				}

				var msg spTypes.QueryStorageProvidersResponse
				err = proto.Unmarshal(rpcResp.Result.Response.Value, &msg)
				if err != nil {
					c.Error(fmt.Errorf("failed to unmarshal ABCI response value: %w", err))
					return in
				}

				for i := range msg.Sps {
					var newURL url.URL
					newURL.Scheme = "http"
					newURL.Host = adnlAddress
					msg.Sps[i].Endpoint = newURL.JoinPath("sp", base64.RawURLEncoding.EncodeToString([]byte(msg.Sps[i].Endpoint))).String()
				}

				newData, err := proto.Marshal(&msg)
				if err != nil {
					c.Error(fmt.Errorf("failed to marshal modified ABCI response value: %w", err))
					return in
				}

				rpcResp.Result.Response.Value = newData
				out, err = json.Marshal(rpcResp)
				if err != nil {
					c.Error(fmt.Errorf("failed to marshal modified RPC response: %w", err))
					return in
				}

				return out
			}
		default:
			modify = func(b []byte) []byte { return b }
		}

		newInterceptorProxy(rpcURL, logger, modify).
			ServeHTTP(c.Writer, c.Request)
	}
}

type (
	jsonRPCResponse[T any] struct {
		JSONRPC string          `json:"jsonrpc"`
		ID      json.RawMessage `json:"id"`
		Result  T               `json:"result,omitempty"`
	}
	jsonRPCStorageProvidersResult struct {
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
)

func newInterceptorProxy(target *url.URL, logger *slog.Logger, modify func([]byte) []byte) *httputil.ReverseProxy {
	proxy := newReverseProxy(target, logger.With("proxy", "interceptor"))
	proxy.ModifyResponse = func(resp *http.Response) error {
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			logger.Error("failed to read response body", "error", err)
			return err
		}
		resp.Body.Close()
		modified := modify(body)
		resp.Body = io.NopCloser(bytes.NewBuffer(modified))
		resp.ContentLength = int64(len(modified))
		resp.Header.Set("Content-Length", fmt.Sprintf("%d", len(modified)))

		return nil
	}
	return proxy
}

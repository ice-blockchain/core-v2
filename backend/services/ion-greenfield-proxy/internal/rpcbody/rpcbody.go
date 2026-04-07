package rpcbody

import (
	"bytes"
	"io"
	"net/http"
	"strings"

	"github.com/buger/jsonparser"
	"github.com/gin-gonic/gin"
)

const ReadLimit = 1 << 20 // 1 MiB

// Body holds the JSON-RPC body and extracted fields from a POST /
// request with application/json content type.
type Body struct {
	Raw      []byte // full body bytes
	Method   string // JSON-RPC method (e.g. "abci_query", "broadcast_tx_sync")
	ABCIPath string // params.path for abci_query calls, empty otherwise
}

// TryParse reads the request body if the request is a POST / with JSON
// content type, extracts the JSON-RPC method and ABCI path, and
// restores the body for downstream handlers. Returns nil if the
// request doesn't match.
func TryParse(c *gin.Context) *Body {
	if c.Request.Method != http.MethodPost || c.Request.URL.Path != "/" {
		return nil
	}
	if !strings.HasPrefix(strings.ToLower(c.ContentType()), "application/json") {
		return nil
	}

	if c.Request.ContentLength > ReadLimit {
		// Too large to parse, skip and let downstream handle it, could be a large upload.
		return nil
	}

	body, err := io.ReadAll(io.LimitReader(c.Request.Body, ReadLimit))
	if err != nil || len(body) == 0 {
		return nil
	}
	c.Request.Body.Close()
	c.Request.Body = io.NopCloser(bytes.NewReader(body))

	method, err := jsonparser.GetString(body, "method")
	if err != nil || method == "" {
		return nil
	}

	abciPath, _ := jsonparser.GetString(body, "params", "path")

	return &Body{
		Raw:      body,
		Method:   method,
		ABCIPath: abciPath,
	}
}

// IsABCIQuery returns true if the request is an abci_query with the
// given path.
func (p *Body) IsABCIQuery(path string) bool {
	return p.Method == "abci_query" && p.ABCIPath == path
}

// IsBroadcast returns true if the JSON-RPC method is a transaction
// broadcast (sync, async, or commit).
func (p *Body) IsBroadcast() bool {
	switch p.Method {
	case "broadcast_tx_sync", "broadcast_tx_async", "broadcast_tx_commit":
		return true
	}
	return false
}

// IsSyncBroadcast returns true only for sync and commit broadcast methods.
// Excludes broadcast_tx_async which returns before chain confirmation.
func (p *Body) IsSyncBroadcast() bool {
	return p.Method == "broadcast_tx_sync" || p.Method == "broadcast_tx_commit"
}

// ParamString extracts a string value from params by key path.
func (p *Body) ParamString(keys ...string) (string, error) {
	return jsonparser.GetString(p.Raw, append([]string{"params"}, keys...)...)
}

const contextKey = "rpcbody.Parsed"

// Store saves the parsed result in the Gin context for downstream handlers.
func (p *Body) Store(c *gin.Context) {
	c.Set(contextKey, p)
}

// FromContext retrieves a previously stored Parsed from the Gin context.
// Returns nil if not found.
func FromContext(c *gin.Context) *Body {
	v, ok := c.Get(contextKey)
	if !ok {
		return nil
	}
	p, _ := v.(*Body)
	return p
}

// Get returns a Parsed from the Gin context if one was stored by the
// middleware, otherwise parses the request fresh.
func Get(c *gin.Context) *Body {
	if p := FromContext(c); p != nil {
		return p
	}
	return TryParse(c)
}

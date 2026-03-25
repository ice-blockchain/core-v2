package greenfieldclient

import (
	"fmt"
	"sync"
	"sync/atomic"

	gnfdclient "github.com/bnb-chain/greenfield-go-sdk/client"
	gnfdtypes "github.com/bnb-chain/greenfield-go-sdk/types"
	rpchttp "github.com/cometbft/cometbft/rpc/client/http"
	"github.com/rs/zerolog"
)

type client struct {
	cfg        Config
	rpcURLs    []string
	rpcIndex   atomic.Uint64
	subscribed atomic.Bool
	log        zerolog.Logger

	gnfdClient gnfdclient.IClient
	httpMu     sync.RWMutex
	httpClient *rpchttp.HTTP
}

// New creates a new Greenfield client with round-robin RPC support.
func New(cfg Config) (Client, error) {
	if len(cfg.RpcURLs) == 0 {
		return nil, fmt.Errorf("at least one RPC URL is required")
	}

	account, err := gnfdtypes.NewAccountFromPrivateKey("greenfield", cfg.PrivateKey)
	if err != nil {
		return nil, fmt.Errorf("create account from private key: %w", err)
	}

	gnfd, err := gnfdclient.New(cfg.ChainID, cfg.RpcURLs[0], gnfdclient.Option{
		DefaultAccount: account,
	})
	if err != nil {
		return nil, fmt.Errorf("create greenfield sdk client: %w", err)
	}

	httpRPC, err := rpchttp.New(cfg.RpcURLs[0], "/websocket")
	if err != nil {
		return nil, fmt.Errorf("create cometbft http client: %w", err)
	}

	c := &client{
		cfg:        cfg,
		rpcURLs:    cfg.RpcURLs,
		log:        cfg.Logger.With().Str("component", "greenfield-client").Logger(),
		gnfdClient: gnfd,
		httpClient: httpRPC,
	}

	return c, nil
}

func (c *client) nextRPC() string {
	idx := c.rpcIndex.Add(1)
	return c.rpcURLs[idx%uint64(len(c.rpcURLs))]
}

func (c *client) currentRPC() string {
	idx := c.rpcIndex.Load()
	return c.rpcURLs[idx%uint64(len(c.rpcURLs))]
}

func (c *client) getHTTPClient() *rpchttp.HTTP {
	c.httpMu.RLock()
	defer c.httpMu.RUnlock()
	return c.httpClient
}

func (c *client) reconnectHTTP() error {
	url := c.nextRPC()
	httpRPC, err := rpchttp.New(url, "/websocket")
	if err != nil {
		return fmt.Errorf("reconnect http to %s: %w", url, err)
	}
	c.httpMu.Lock()
	old := c.httpClient
	c.httpClient = httpRPC
	c.httpMu.Unlock()
	if old != nil {
		_ = old.Stop()
	}
	return nil
}

// IsSubscribed returns true when the WebSocket subscription is active.
func (c *client) IsSubscribed() bool {
	return c.subscribed.Load()
}

// Close releases resources held by the client.
func (c *client) Close() error {
	c.httpMu.Lock()
	defer c.httpMu.Unlock()
	if c.httpClient != nil {
		return c.httpClient.Stop()
	}
	return nil
}

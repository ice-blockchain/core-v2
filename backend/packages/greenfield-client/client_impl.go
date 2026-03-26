package greenfieldclient

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"sync/atomic"
	"time"

	"github.com/akuity/grpc-gateway-client/pkg/grpc/gateway"
	gnfdclient "github.com/bnb-chain/greenfield-go-sdk/client"
	gnfdtypes "github.com/bnb-chain/greenfield-go-sdk/types"
	"github.com/rs/zerolog"
)

const gatewayTimeout = 30 * time.Second

type client struct {
	cfg        Config
	rpcURLs    []string
	rpcIndex   atomic.Uint64
	subscribed atomic.Bool
	log        zerolog.Logger

	gnfdClient gnfdclient.IClient
	gwClient   gateway.Client
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

	c := &client{
		cfg:        cfg,
		rpcURLs:    cfg.RpcURLs,
		log:        cfg.Logger.With().Str("component", "greenfield-client").Logger(),
		gnfdClient: gnfd,
	}

	c.gwClient = gateway.NewClient(
		cfg.RpcURLs[0],
		gateway.WithHTTPClient(&http.Client{Timeout: gatewayTimeout}),
	)

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

func (c *client) rotateGateway() {
	url := c.nextRPC()
	c.gwClient = gateway.NewClient(
		url,
		gateway.WithHTTPClient(&http.Client{Timeout: gatewayTimeout}),
	)
}

func (c *client) fetchLatestHeight(ctx context.Context) (int64, error) {
	req := c.gwClient.NewRequest("GET", "/cosmos/base/tendermint/v1beta1/blocks/latest")
	resp, err := gateway.DoRequest[latestBlockResponse](ctx, req)
	if err != nil {
		return 0, fmt.Errorf("get latest block: %w", err)
	}
	return strconv.ParseInt(resp.Block.Header.Height, 10, 64)
}

// IsSubscribed returns true when the WebSocket subscription is active.
func (c *client) IsSubscribed() bool {
	return c.subscribed.Load()
}

// Close releases resources held by the client.
func (c *client) Close() error {
	return nil
}

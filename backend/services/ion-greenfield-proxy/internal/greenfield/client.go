package greenfield

import (
	"encoding/hex"
	"fmt"
	"log/slog"
	"strings"

	gnfdclient "github.com/bnb-chain/greenfield-go-sdk/client"
	gnfdtypes "github.com/bnb-chain/greenfield-go-sdk/types"
	"github.com/ethereum/go-ethereum/crypto"
	"go.uber.org/fx"

	"ion-greenfield-proxy/internal/config"
)

type ClientParams struct {
	fx.In

	Config *config.Config
	Logger *slog.Logger
}

// NewClient constructs a Greenfield SDK client from GREENFIELD_PRIVATE_KEY.
func NewClient(p ClientParams) (gnfdclient.IClient, error) {
	if p.Logger == nil {
		p.Logger = slog.Default().With("component", "greenfield_client")
	}
	privKeyHex := strings.TrimPrefix(p.Config.GreenfieldPrivateKey, "0x")

	account, err := gnfdtypes.NewAccountFromPrivateKey("proxy", privKeyHex)
	if err != nil {
		return nil, fmt.Errorf("greenfield client: invalid private key: %w", err)
	}

	chainID := fmt.Sprintf("greenfield_%d-1", p.Config.GreenfieldChainID)
	client, err := gnfdclient.New(chainID, p.Config.GreenfieldRPCEndpoint, gnfdclient.Option{
		DefaultAccount: account,
	})
	if err != nil {
		return nil, fmt.Errorf("greenfield client: %w", err)
	}

	addr := proxyAddress(privKeyHex)
	p.Logger.Info("greenfield client initialized",
		"proxy_address", addr,
		"chain_id", chainID,
	)

	return client, nil
}

// proxyAddress derives the Ethereum-style hex address from the private key.
func proxyAddress(privKeyHex string) string {
	keyBytes, err := hex.DecodeString(privKeyHex)
	if err != nil {
		return "unknown"
	}
	key, err := crypto.ToECDSA(keyBytes)
	if err != nil {
		return "unknown"
	}
	return crypto.PubkeyToAddress(key.PublicKey).Hex()
}

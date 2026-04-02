package e2e

import (
	"crypto/rand"
	"fmt"
	"log/slog"
	"net"
	"net/http/httptest"
	"os"
	"testing"

	sdkmath "cosmossdk.io/math"
	gnfdclient "github.com/bnb-chain/greenfield-go-sdk/client"
	gnfdtypes "github.com/bnb-chain/greenfield-go-sdk/types"
	gnfdsdktypes "github.com/bnb-chain/greenfield/sdk/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"ion-greenfield-proxy/internal/adnl"
	"ion-greenfield-proxy/internal/config"
	gf "ion-greenfield-proxy/internal/greenfield"
	"ion-greenfield-proxy/internal/router"
)

const (
	testUpstreamTestnetRPC     = `https://gnfd-testnet-fullnode-tendermint-us.bnbchain.org:443`
	testUpstreamTestnetChainID = 5600
	testUpstreamBucketName     = `core-v2-online-test2`
)

var (
	testChainID  string
	testProxy    *httptest.Server
	testProxySDK gnfdclient.IClient // SDK client backed by TEST_GREENFIELD_PRIVATE_KEY, nil if unset
)

func TestMain(m *testing.M) {
	slog.SetLogLoggerLevel(slog.LevelDebug)
	gin.SetMode(gin.TestMode)
	testChainID = fmt.Sprintf("greenfield_%d-1", testUpstreamTestnetChainID)

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		panic("e2e: failed to listen: " + err.Error())
	}
	proxyAddr := listener.Addr().String()

	proxyConfig := &config.Config{
		GreenfieldRPCEndpoint:    testUpstreamTestnetRPC,
		GreenfieldChainID:        testUpstreamTestnetChainID,
		GreenfieldPrivateKey:     os.Getenv("TEST_GREENFIELD_PRIVATE_KEY"),
		GreenfieldFeeGrantAmount: "0.001",
		Env:                      "development",
	}

	var provisioner *gf.BucketProvisioner
	if proxyConfig.GreenfieldPrivateKey != "" {
		client, err := gf.NewClient(gf.ClientParams{
			Config: proxyConfig,
		})
		if err != nil {
			panic("e2e: failed to create greenfield client: " + err.Error())
		}
		provisioner = gf.NewBucketProvisioner(client, nil)

		funderChainID := fmt.Sprintf("greenfield_%d-1", testUpstreamTestnetChainID)
		funderAccount, err := gnfdtypes.NewAccountFromPrivateKey("funder", proxyConfig.GreenfieldPrivateKey)
		if err != nil {
			panic("e2e: failed to create funder account: " + err.Error())
		}
		testProxySDK, err = gnfdclient.New(funderChainID, testUpstreamTestnetRPC, gnfdclient.Option{
			DefaultAccount: funderAccount,
		})
		if err != nil {
			panic("e2e: failed to create funder SDK: " + err.Error())
		}
	} else {
		slog.Warn("TEST_GREENFIELD_PRIVATE_KEY not set — bucket provisioning disabled, fee guarantee test coverage reduced")
	}

	r := router.New(router.Params{
		Config:      proxyConfig,
		Key:         &adnl.Key{Address: proxyAddr},
		Provisioner: provisioner,
	})

	testProxy = httptest.NewUnstartedServer(r)
	testProxy.Listener = listener
	testProxy.Start()
	defer testProxy.Close()

	os.Exit(m.Run())
}

func helperNewAccount(t *testing.T) *gnfdtypes.Account {
	t.Helper()

	account, pk, err := gnfdtypes.NewAccount(rand.Text())
	require.NoError(t, err)

	t.Logf("Generated new account with address %s and private key %q",
		account.GetAddress().String(), pk)

	return account
}

// helperNewAccountWithFunds creates a random account and transfers a
// dust amount of BNB from the funder to register it on-chain.
// Requires TEST_GREENFIELD_PRIVATE_KEY — caller must skip if unset.
func helperNewAccountWithFunds(t *testing.T) *gnfdtypes.Account {
	t.Helper()
	require.NotNil(t, testProxySDK, "testFunderSDK is nil — TEST_GREENFIELD_PRIVATE_KEY not set")

	account := helperNewAccount(t)
	addr := account.GetAddress().String()

	// 0.000001 BNB = 1e12 wei (BNB has 18 decimals).
	amount := sdkmath.NewIntWithDecimal(1, 12)
	txHash, err := testProxySDK.Transfer(t.Context(), addr, amount, gnfdsdktypes.TxOption{})
	require.NoError(t, err, "Transfer to new account")

	_, err = testProxySDK.WaitForTx(t.Context(), txHash)
	require.NoError(t, err, "WaitForTx after Transfer")

	t.Logf("Funded account %s with 0.000001 BNB (tx: %s)", addr, txHash)
	return account
}

func helperNewClient(t *testing.T, rpcURL string, account *gnfdtypes.Account) gnfdclient.IClient {
	t.Helper()

	client, err := gnfdclient.New(testChainID, rpcURL, gnfdclient.Option{
		DefaultAccount: account,
	})
	require.NoError(t, err)
	require.NotNil(t, client)

	return client
}

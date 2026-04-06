package e2e

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http/httptest"
	"os"
	"sync"
	"testing"
	"time"

	sdkmath "cosmossdk.io/math"
	gnfdclient "github.com/bnb-chain/greenfield-go-sdk/client"
	gnfdtypes "github.com/bnb-chain/greenfield-go-sdk/types"
	gnfdsdktypes "github.com/bnb-chain/greenfield/sdk/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"ion-greenfield-proxy/internal/adnl"
	"ion-greenfield-proxy/internal/config"
	gf "ion-greenfield-proxy/internal/greenfield"
	"ion-greenfield-proxy/internal/router"
)

type (
	mockedProvisioner struct {
	}
)

const (
	testUpstreamTestnetRPC     = `https://gnfd-testnet-fullnode-tendermint-us.bnbchain.org:443`
	testUpstreamTestnetChainID = 5600
	testUpstreamBucketName     = `core-v2-online-test2`
)

var (
	testChainID   string
	testProxy     *httptest.Server
	testProxySDK  gnfdclient.IClient // SDK client backed by TEST_GREENFIELD_PRIVATE_KEY, nil if unset
	testProxyAddr sdk.AccAddress     // proxy wallet address, nil if key not set

	// testFunderMu serialises on-chain transactions from the shared funder
	// wallet (testProxySDK). Without this, parallel tests that fund
	// accounts race on the account sequence number.
	testFunderMu sync.Mutex
)

func (*mockedProvisioner) EnsureBucket(context.Context, string, string) (string, error) {
	return "", errors.New("mockedProvisioner: EnsureBucket not implemented")
}

func (*mockedProvisioner) GrantFeeAllowance(context.Context, string) (bool, error) {
	return false, errors.New("mockedProvisioner: GrantFeeAllowance not implemented")
}

func (*mockedProvisioner) IsKnownSPHost(context.Context, string) (bool, error) {
	return true, nil
}

func (*mockedProvisioner) GetAccountNumber(context.Context, string) (uint64, error) {
	return 0, errors.New("mockedProvisioner: GetAccountNumber not implemented")
}

func (*mockedProvisioner) ProxyAddress() string {
	return testProxyAddr.String()
}

func (*mockedProvisioner) StartGrantCleanup(time.Duration) func() {
	return func() {}
}

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

	var provisioner gf.BucketProvisioner
	if proxyConfig.GreenfieldPrivateKey != "" {
		client, err := gf.NewClient(gf.ClientParams{
			Config: proxyConfig,
		})
		if err != nil {
			panic("e2e: failed to create greenfield client: " + err.Error())
		}
		provisioner, err = gf.NewBucketProvisioner(client, nil, proxyConfig)
		if err != nil {
			panic("e2e: failed to create bucket provisioner: " + err.Error())
		}

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
		testProxyAddr = funderAccount.GetAddress()
	} else {
		slog.Warn("TEST_GREENFIELD_PRIVATE_KEY not set — bucket provisioning disabled, fee guarantee test coverage reduced")
		provisioner = new(mockedProvisioner)
	}

	r, err := router.New(router.Params{
		Config:      proxyConfig,
		Key:         &adnl.Key{Address: proxyAddr},
		Provisioner: provisioner,
	})
	if err != nil {
		panic("e2e: failed to create router: " + err.Error())
	}

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

// helperFundAccount transfers a dust amount of BNB from the shared
// funder wallet to addr. Serialised via funderMu so parallel tests
// don't race on the funder's account sequence.
func helperFundAccount(t *testing.T, addr string) {
	t.Helper()
	require.NotNil(t, testProxySDK, "testProxySDK is nil — TEST_GREENFIELD_PRIVATE_KEY not set")

	testFunderMu.Lock()
	defer testFunderMu.Unlock()

	amount := sdkmath.NewIntWithDecimal(1, 12) // 0.000001 BNB
	txHash, err := testProxySDK.Transfer(t.Context(), addr, amount, gnfdsdktypes.TxOption{})
	require.NoError(t, err, "Transfer to %s", addr)

	_, err = testProxySDK.WaitForTx(t.Context(), txHash)
	require.NoError(t, err, "WaitForTx after Transfer to %s", addr)

	t.Logf("Funded %s with %s BNB (tx: %s)", addr, amount.String(), txHash)
}

// helperNewAccountWithFunds creates a random account and transfers a
// dust amount of BNB from the funder to register it on-chain.
// Requires TEST_GREENFIELD_PRIVATE_KEY — caller must skip if unset.
func helperNewAccountWithFunds(t *testing.T) *gnfdtypes.Account {
	t.Helper()
	account := helperNewAccount(t)
	helperFundAccount(t, account.GetAddress().String())
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

// helperSkipWithoutKey skips the test if TEST_GREENFIELD_PRIVATE_KEY is not set.
func helperSkipWithoutKey(t *testing.T) {
	t.Helper()
	if os.Getenv("TEST_GREENFIELD_PRIVATE_KEY") == "" {
		t.Skip("TEST_GREENFIELD_PRIVATE_KEY not set")
	}
}

// helperAddrHex returns the lowercase hex encoding of an AccAddress (no 0x prefix).
func helperAddrHex(addr sdk.AccAddress) string {
	return hex.EncodeToString(addr.Bytes())
}

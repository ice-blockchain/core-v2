package e2e

import (
	"crypto/rand"
	"net"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"

	gnfdclient "github.com/bnb-chain/greenfield-go-sdk/client"
	gnfdtypes "github.com/bnb-chain/greenfield-go-sdk/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"ion-greenfield-proxy/internal/adnl"
	"ion-greenfield-proxy/internal/config"
	"ion-greenfield-proxy/internal/router"
)

const (
	testUpstreamTestnetRPC     = `https://gnfd-testnet-fullnode-tendermint-us.bnbchain.org:443`
	testUpstreamTestnetChainID = 5600
	testUpstreamBucketName     = `core-v2-online-test1`
)

var (
	testChainID string
	testProxy   *httptest.Server
)

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)
	testChainID = strconv.Itoa(testUpstreamTestnetChainID)

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		panic("e2e: failed to listen: " + err.Error())
	}
	proxyAddr := listener.Addr().String()

	r := router.New(router.Params{
		Config: &config.Config{
			GreenfieldRPCEndpoint: testUpstreamTestnetRPC,
			GreenfieldChainID:     testUpstreamTestnetChainID,
			Env:                   "development",
		},
		Key: &adnl.Key{Address: proxyAddr},
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

func helperNewClient(t *testing.T, rpcURL string, account *gnfdtypes.Account) gnfdclient.IClient {
	t.Helper()

	client, err := gnfdclient.New(testChainID, rpcURL, gnfdclient.Option{
		DefaultAccount: account,
	})
	require.NoError(t, err)
	require.NotNil(t, client)

	return client
}

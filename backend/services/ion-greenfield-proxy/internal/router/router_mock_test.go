package router_test

import (
	"context"
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"

	gnfdclient "github.com/bnb-chain/greenfield-go-sdk/client"
	gnfdtypes "github.com/bnb-chain/greenfield-go-sdk/types"
	gnfdsdktypes "github.com/bnb-chain/greenfield/sdk/types"
	permTypes "github.com/bnb-chain/greenfield/x/permission/types"
	spTypes "github.com/bnb-chain/greenfield/x/sp/types"
	storageTypes "github.com/bnb-chain/greenfield/x/storage/types"
	ctypes "github.com/cometbft/cometbft/rpc/core/types"
	authTypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	"github.com/cosmos/cosmos-sdk/x/feegrant"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"ion-greenfield-proxy/internal/adnl"
	"ion-greenfield-proxy/internal/config"
	gf "ion-greenfield-proxy/internal/greenfield"
	"ion-greenfield-proxy/internal/router"
)

// mockGnfdClient satisfies gnfdclient.IClient for unit tests.
// Unimplemented methods panic via the embedded nil interface.
type mockGnfdClient struct {
	gnfdclient.IClient
	sps            []spTypes.StorageProvider
	defaultAccount *gnfdtypes.Account
	accounts       map[string]uint64 // lowercase hex (no 0x) → account number
}

func (m *mockGnfdClient) ListStorageProviders(_ context.Context, _ bool) ([]spTypes.StorageProvider, error) {
	return m.sps, nil
}

func (m *mockGnfdClient) GetDefaultAccount() (*gnfdtypes.Account, error) {
	return m.defaultAccount, nil
}

func (m *mockGnfdClient) GetAccount(_ context.Context, address string) (authTypes.AccountI, error) {
	addr := strings.ToLower(strings.TrimPrefix(address, "0x"))
	num, ok := m.accounts[addr]
	if !ok {
		return nil, fmt.Errorf("account not found: %s", address)
	}
	return &mockAccountI{num: num}, nil
}

// HeadBucket returns a synthetic BucketInfo with delegated agent already
// enabled, so EnsureBucket skips the toggle step.
func (m *mockGnfdClient) HeadBucket(_ context.Context, _ string) (*storageTypes.BucketInfo, error) {
	return &storageTypes.BucketInfo{SpAsDelegatedAgentDisabled: false}, nil
}

func (m *mockGnfdClient) PutBucketPolicy(_ context.Context, _ string, _ gnfdtypes.Principal, _ []*permTypes.Statement, _ gnfdtypes.PutPolicyOption) (string, error) {
	return "mock-tx", nil
}

func (m *mockGnfdClient) WaitForTx(_ context.Context, _ string) (*ctypes.ResultTx, error) {
	return nil, nil
}

func (m *mockGnfdClient) GrantAllowance(_ context.Context, _ string, _ feegrant.FeeAllowanceI, _ gnfdsdktypes.TxOption) (string, error) {
	return "mock-fee-grant-tx", nil
}

// mockAccountI satisfies authTypes.AccountI. Only GetAccountNumber is used.
type mockAccountI struct {
	authTypes.AccountI
	num uint64
}

func (m *mockAccountI) GetAccountNumber() uint64 { return m.num }

func newMockClient(t *testing.T, endpoints []string, accounts map[string]uint64) *mockGnfdClient {
	t.Helper()
	acct, _, err := gnfdtypes.NewAccount("proxy")
	require.NoError(t, err)

	sps := make([]spTypes.StorageProvider, len(endpoints))
	for i, ep := range endpoints {
		sps[i] = spTypes.StorageProvider{Endpoint: ep}
	}

	return &mockGnfdClient{
		sps:            sps,
		defaultAccount: acct,
		accounts:       accounts,
	}
}

// newTestProxySP creates a test proxy with a provisioner that knows about
// the given upstream URL as a valid SP endpoint.
func newTestProxySP(t *testing.T, upstreamURL string) *httptest.Server {
	t.Helper()
	return newTestProxyWithMock(t, newMockClient(t, []string{upstreamURL}, nil))
}

func newTestProxyWithMock(t *testing.T, mock *mockGnfdClient) *httptest.Server {
	t.Helper()
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		GreenfieldRPCEndpoint:    "http://127.0.0.1:1",
		GreenfieldChainID:        5600,
		GreenfieldFeeGrantAmount: "0.001",
		Env:                      "development",
	}
	provisioner, err := gf.NewBucketProvisioner(mock, nil, cfg)
	if err != nil {
		panic("test: failed to create bucket provisioner: " + err.Error())
	}

	r, err := router.New(router.Params{
		Config:          cfg,
		Key:             &adnl.Key{Address: testADNLAddress},
		Provisioner:     provisioner,
		AllowInsecureSP: true, // For httptest.NewServer, we do not use TLS in tests.
	})
	if err != nil {
		panic("test: failed to create router: " + err.Error())
	}
	return httptest.NewServer(r)
}

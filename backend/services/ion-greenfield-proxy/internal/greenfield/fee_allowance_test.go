package greenfield

import (
	"context"
	"io"
	"log/slog"
	"sync/atomic"
	"testing"
	"time"

	sdkmath "cosmossdk.io/math"
	gnfdclient "github.com/bnb-chain/greenfield-go-sdk/client"
	gnfdtypes "github.com/bnb-chain/greenfield-go-sdk/types"
	gnfdsdktypes "github.com/bnb-chain/greenfield/sdk/types"
	ctypes "github.com/cometbft/cometbft/rpc/core/types"
	"github.com/cosmos/cosmos-sdk/x/feegrant"
	"github.com/puzpuzpuz/xsync/v4"
	"github.com/stretchr/testify/require"

	"ion-greenfield-proxy/internal/ctxlock"
)

type feeGrantMock struct {
	gnfdclient.IClient
	grantCalls atomic.Int64
	account    *gnfdtypes.Account
}

func (m *feeGrantMock) GrantAllowance(_ context.Context, _ string, _ feegrant.FeeAllowanceI, _ gnfdsdktypes.TxOption) (string, error) {
	m.grantCalls.Add(1)
	return "mock-tx", nil
}

func (m *feeGrantMock) WaitForTx(_ context.Context, _ string) (*ctypes.ResultTx, error) {
	return nil, nil
}

func (m *feeGrantMock) GetDefaultAccount() (*gnfdtypes.Account, error) {
	return m.account, nil
}

func newTestProvisioner(t *testing.T, mock *feeGrantMock) *bucketProvisioner {
	t.Helper()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return &bucketProvisioner{
		client:         mock,
		logger:         logger,
		known:          xsync.NewMap[string, struct{}](),
		feeGrantAmount: sdkmath.NewInt(1000000),
		accountNumbers: xsync.NewMap[string, uint64](),
		recentGrants:   xsync.NewMap[string, time.Time](),
		txLock:         ctxlock.New(logger, 3*time.Second),
	}
}

func TestGrantFeeAllowance_DeduplicatesWithinTTL(t *testing.T) {
	t.Parallel()

	acct, _, err := gnfdtypes.NewAccount("proxy")
	require.NoError(t, err)

	mock := &feeGrantMock{account: acct}
	bp := newTestProvisioner(t, mock)

	ctx := context.Background()
	for i := 0; i < 10; i++ {
		require.NoError(t, bp.GrantFeeAllowance(ctx, "0xABCDEF"))
	}

	require.Equal(t, int64(1), mock.grantCalls.Load(),
		"expected exactly 1 on-chain GrantAllowance call, rest should be deduped")
}

func TestGrantFeeAllowance_GrantsAgainAfterTTL(t *testing.T) {
	t.Parallel()

	acct, _, err := gnfdtypes.NewAccount("proxy")
	require.NoError(t, err)

	mock := &feeGrantMock{account: acct}
	bp := newTestProvisioner(t, mock)

	ctx := context.Background()
	require.NoError(t, bp.GrantFeeAllowance(ctx, "0x111"))
	require.Equal(t, int64(1), mock.grantCalls.Load())

	// Manually expire the cache entry.
	bp.recentGrants.Store("0x111", time.Now().Add(-feeGrantDedupTTL-time.Second))

	require.NoError(t, bp.GrantFeeAllowance(ctx, "0x111"))
	require.Equal(t, int64(2), mock.grantCalls.Load(),
		"expected second grant after TTL expiry")
}

package e2e

import (
	"strings"
	"testing"

	spTypes "github.com/bnb-chain/greenfield/x/sp/types"
	"github.com/stretchr/testify/require"
)

func TestSDK_ListStorageProviders(t *testing.T) {
	t.Parallel()

	account := helperNewAccount(t)
	proxyResultCh := make(chan []spTypes.StorageProvider, 1)
	t.Run("Proxy request", func(t *testing.T) {
		t.Parallel()
		sdk := helperNewClient(t, testProxy.URL, account)

		sps, err := sdk.ListStorageProviders(t.Context(), true)
		require.NoError(t, err)
		require.NotEmpty(t, sps)
		for _, sp := range sps {
			t.Logf("SP: %s endpoint: %s", sp.OperatorAddress, sp.Endpoint)
			require.True(t, strings.HasPrefix(sp.Endpoint, testProxy.URL+"/sp/"))
		}
		proxyResultCh <- sps
	})
	t.Run("Direct request", func(t *testing.T) {
		t.Parallel()
		sdk := helperNewClient(t, testUpstreamTestnetRPC, account)

		sps, err := sdk.ListStorageProviders(t.Context(), true)
		require.NoError(t, err)
		require.NotEmpty(t, sps)

		proxyResponse := <-proxyResultCh
		require.Equal(t, len(sps), len(proxyResponse))
		for i := range sps {
			t.Logf("SP: %s endpoint: %s", sps[i].OperatorAddress, sps[i].Endpoint)
			sps[i].Endpoint, proxyResponse[i].Endpoint = "", "" // ignore endpoint in comparison
		}
		require.ElementsMatch(t, sps, proxyResponse)
	})
}

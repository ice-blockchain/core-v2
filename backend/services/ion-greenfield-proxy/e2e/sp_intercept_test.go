package e2e

import (
	"testing"
	"time"

	gnfdtypes "github.com/bnb-chain/greenfield-go-sdk/types"
	"github.com/stretchr/testify/require"
)

// TestSDK_resolvesInterceptedSPEndpoint verifies the full proxy interception
// end-to-end using the real Greenfield testnet:
//
//  1. SDK calls refreshStorageProviders via CometBFT JSON-RPC (POST /)
//     through the proxy. Proxy forwards to real testnet RPC.
//  2. Proxy intercepts the StorageProviders ABCI response and rewrites
//     every SP endpoint from https://spX.greenfield.io to
//     http://{proxyAddr}/sp/{base64(originalURL)}.
//  3. SDK caches the rewritten endpoints (forked SDK preserves endpoint path).
//  4. SDK calls ListBucketReadRecord → resolves SP via HeadBucket + GVGF →
//     picks the cached SP endpoint → sends GET /sp/{base64}/{bucket}/?list-read-record
//     to http://{proxyAddr}.
//  5. Proxy's /sp/* handler decodes the base64 target, forwards to the
//     real SP with path /{bucket}/ and query params preserved.
//  6. Real SP responds with data.
//  7. "Direct request" sub-test repeats the same call bypassing the proxy
//     and asserts both responses match.
func TestSDK_resolvesInterceptedSPEndpoint(t *testing.T) {
	t.Parallel()

	account := helperNewAccount(t)
	proxiedDataCh := make(chan gnfdtypes.QuotaRecordInfo, 1)

	t.Run("Proxy request", func(t *testing.T) {
		t.Parallel()
		sdk := helperNewClient(t, testProxy.URL, account)

		data, err := sdk.ListBucketReadRecord(
			t.Context(),
			testUpstreamBucketName,
			gnfdtypes.ListReadRecordOptions{},
		)
		require.NoError(t, err)
		require.NotEmpty(t, data.ReadRecords)

		var foundLuci bool
		for _, record := range data.ReadRecords {
			if record.ObjectName == "luci.png" {
				foundLuci = true
				break
			}
		}
		require.True(t, foundLuci, "expected luci.png in proxied records")
		proxiedDataCh <- data
	})
	t.Run("Direct request", func(t *testing.T) {
		t.Parallel()
		sdk := helperNewClient(t, testUpstreamTestnetRPC, account)

		directData, err := sdk.ListBucketReadRecord(
			t.Context(),
			testUpstreamBucketName,
			gnfdtypes.ListReadRecordOptions{},
		)
		require.NoError(t, err)
		require.NotEmpty(t, directData.ReadRecords)

		select {
		case proxiedData := <-proxiedDataCh:
			require.ElementsMatch(t, directData.ReadRecords, proxiedData.ReadRecords,
				"direct and proxied responses should match")
		case <-time.After(10 * time.Second):
			require.Fail(t, "timed out waiting for proxied data")
		}
	})
}

package adnl

import (
	"crypto/ed25519"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"
	"testing"
	"time"

	"ion-greenfield-proxy/internal/config"

	"github.com/stretchr/testify/require"
	"github.com/xssnick/tonutils-go/adnl"
	"github.com/xssnick/tonutils-go/adnl/address"
	"github.com/xssnick/tonutils-go/adnl/dht"
	"github.com/xssnick/tonutils-go/adnl/rldp"
)

// TEST_ADNL_TARGET_KEY  — hex-encoded ed25519 public key (32 bytes)
// TEST_ADNL_TARGET_HOST — ip:port of the ADNL gateway
// TEST_ADNL_TARGET_ADDRESS — hex-encoded ADNL address for DHT lookup

func TestADNLHealthCheck(t *testing.T) {
	t.Parallel()
	t.Run("direct", func(t *testing.T) {
		pubKeyHex := os.Getenv("TEST_ADNL_TARGET_KEY")
		host := os.Getenv("TEST_ADNL_TARGET_HOST")
		if pubKeyHex == "" || host == "" {
			t.Skip("TEST_ADNL_TARGET_KEY and TEST_ADNL_TARGET_HOST not set")
		}

		pubBytes, err := hex.DecodeString(pubKeyHex)
		require.NoError(t, err, "TEST_ADNL_TARGET_KEY must be valid hex")
		require.Len(t, pubBytes, ed25519.PublicKeySize, "TEST_ADNL_TARGET_KEY must be 32 bytes")

		_, clientKey, err := ed25519.GenerateKey(nil)
		require.NoError(t, err)

		gate := adnl.NewGateway(clientKey)
		require.NoError(t, gate.StartClient())
		defer gate.Close()

		t.Logf("connecting to %s", host)
		peer, err := gate.RegisterClient(host, ed25519.PublicKey(pubBytes))
		require.NoError(t, err)

		sendHealthCheck(t, peer)
	})

	t.Run("dht", func(t *testing.T) {
		targetAddr := os.Getenv("TEST_ADNL_TARGET_ADDRESS")
		if targetAddr == "" {
			t.Skip("TEST_ADNL_TARGET_ADDRESS not set")
		}

		targetID, err := hex.DecodeString(targetAddr)
		require.NoError(t, err, "TEST_ADNL_TARGET_ADDRESS must be valid hex")
		require.Len(t, targetID, 32)

		_, clientKey, err := ed25519.GenerateKey(nil)
		require.NoError(t, err)

		gate := adnl.NewGateway(clientKey)
		require.NoError(t, gate.StartClient())
		defer gate.Close()

		dhtClient, err := dht.NewClientFromConfigUrl(t.Context(), gate,
			config.DefaultADNLConfigURL)
		require.NoError(t, err)

		t.Log("waiting for DHT routing to establish...")

		var addrs *address.List
		var pubKey ed25519.PublicKey
		const maxAttempts = 15
		const delay = 3 * time.Second
		for attempt := 1; attempt <= maxAttempts; attempt++ {
			t.Logf("DHT lookup attempt %d/%d...", attempt, maxAttempts)
			addrs, pubKey, err = dhtClient.FindAddresses(t.Context(), targetID)
			if err == nil && len(addrs.Addresses) > 0 {
				break
			}
			t.Logf("not found yet, retrying in %ds...", int(delay.Seconds()))
			time.Sleep(delay)
		}
		require.NoErrorf(t, err, "DHT lookup failed (%s)", targetAddr)
		require.NotEmpty(t, addrs.Addresses)

		addr := addrs.Addresses[0]
		t.Logf("found via DHT: %s:%d", addr.IP, addr.Port)

		peer, err := gate.RegisterClient(fmt.Sprintf("%s:%d", addr.IP, addr.Port), pubKey)
		require.NoError(t, err)

		sendHealthCheck(t, peer)
	})
}

func sendHealthCheck(t *testing.T, peer adnl.Peer) {
	t.Helper()

	rl := rldp.NewClientV2(peer)
	reqID := make([]byte, 32)
	reqID[0] = 1

	t.Log("sending GET /health-check over RLDP...")
	var resp Response
	err := rl.DoQuery(t.Context(), rldpMaxAnswerSize, Request{
		ID:      reqID,
		Method:  http.MethodGet,
		URL:     "/health-check",
		Version: "HTTP/1.1",
	}, &resp)
	require.NoError(t, err)
	t.Logf("response: %d %s", resp.StatusCode, resp.Reason)
	require.EqualValues(t, http.StatusOK, resp.StatusCode)

	if !resp.NoPayload {
		var body PayloadPart
		err = rl.DoQuery(t.Context(), rldpMaxAnswerSize, GetNextPayloadPart{
			ID:           reqID,
			Seqno:        0,
			MaxChunkSize: int32(chunkSize),
		}, &body)
		require.NoError(t, err)
		t.Logf("body: %s", string(body.Data))
	}
}

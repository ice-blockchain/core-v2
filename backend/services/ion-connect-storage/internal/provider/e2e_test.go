//go:build e2e

package provider_test

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"os"
	"testing"
	"time"

	"github.com/cockroachdb/pebble/v2"
	"github.com/gin-gonic/gin"
	ionadnl "github.com/ice-blockchain/ion/services/ion-connect-storage/internal/adnl"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/cluster"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/provider"
	"github.com/stretchr/testify/require"
	"github.com/xssnick/tonutils-go/adnl"
	"github.com/xssnick/tonutils-go/adnl/rldp"
)

const rldpMaxAnswerSize = 2 << 20

func TestE2E_ProviderIndexOverRLDP(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))

	db, err := pebble.Open(t.TempDir(), &pebble.Options{})
	require.NoError(t, err)
	t.Cleanup(func() { db.Close() })

	serverKey := generateTestKey(t)
	port := allocateTestPort(t)

	server := startTestServerWithBridge(t, ctx, serverKey, port, db, logger)
	serverADNLAddr := server.Gateway().GetID()
	t.Logf("server ADNL address: %s", hex.EncodeToString(serverADNLAddr))

	var adnlAddr [32]byte
	copy(adnlAddr[:], serverADNLAddr)
	singleNode := cluster.NewSingleNodeCoordinator("test-node", adnlAddr, "127.0.0.1", 0)
	providerIndex := provider.NewProviderIndex(db, adnlAddr, singleNode, logger)

	testBagID := [32]byte{0xDE, 0xAD, 0xBE, 0xEF}
	require.NoError(t, providerIndex.Register(testBagID))

	peer := connectClient(t, fmt.Sprintf("127.0.0.1:%d", port), serverKey)
	time.Sleep(1 * time.Second)

	t.Run("known bag returns 200 with provider", func(t *testing.T) {
		resp, body := sendHTTPOverRLDP(t, peer, "GET", "/bags/"+hex.EncodeToString(testBagID[:]))
		t.Logf("response: %d %s", resp.StatusCode, resp.Reason)
		require.EqualValues(t, 200, resp.StatusCode)

		var lookup provider.LookupResponse
		require.NoError(t, json.Unmarshal(body, &lookup))
		require.Len(t, lookup.Providers, 1)
		require.Equal(t, hex.EncodeToString(serverADNLAddr), lookup.Providers[0].ADNLAddress)
	})

	t.Run("unknown bag returns 404", func(t *testing.T) {
		unknownBag := [32]byte{0x01}
		resp, _ := sendHTTPOverRLDP(t, peer, "GET", "/bags/"+hex.EncodeToString(unknownBag[:]))
		require.EqualValues(t, 404, resp.StatusCode)
	})
}

func sendHTTPOverRLDP(t *testing.T, peer adnl.Peer, method, url string) (ionadnl.Response, []byte) {
	t.Helper()

	rl := rldp.NewClientV2(peer)
	reqID := make([]byte, 32)
	_, err := rand.Read(reqID)
	require.NoError(t, err)

	t.Logf("sending %s %s over RLDP...", method, url)
	var resp ionadnl.Response
	err = rl.DoQuery(context.Background(), rldpMaxAnswerSize, &ionadnl.Request{
		ID:      reqID,
		Method:  method,
		URL:     url,
		Version: "HTTP/1.1",
	}, &resp)
	require.NoError(t, err)
	t.Logf("response: %d %s (noPayload=%v)", resp.StatusCode, resp.Reason, resp.NoPayload)

	if resp.NoPayload {
		return resp, nil
	}

	var part ionadnl.PayloadPart
	err = rl.DoQuery(context.Background(), rldpMaxAnswerSize, &ionadnl.GetNextPayloadPart{
		ID:           reqID,
		Seqno:        0,
		MaxChunkSize: 1 << 20,
	}, &part)
	require.NoError(t, err)
	t.Logf("body (%d bytes): %s", len(part.Data), string(part.Data))

	return resp, part.Data
}

func startTestServerWithBridge(
	t *testing.T, ctx context.Context,
	key ed25519.PrivateKey, port int,
	db *pebble.DB, logger *slog.Logger,
) *ionadnl.Server {
	t.Helper()

	server, err := ionadnl.NewServer(ctx, ionadnl.ServerConfig{
		AdnlPrivateKey:  hex.EncodeToString(key.Seed()),
		GlobalConfigURL: globalConfigURL(),
		Port:            port,
		ExternalAddr:    fmt.Sprintf("127.0.0.1:%d", port),
		ActiveDHTLimit:  100,
	}, logger)
	require.NoError(t, err)

	gin.SetMode(gin.TestMode)
	engine := gin.New()
	engine.Use(gin.Recovery())

	var adnlAddr [32]byte
	copy(adnlAddr[:], server.Gateway().GetID())
	singleNode := cluster.NewSingleNodeCoordinator("test-node", adnlAddr, "127.0.0.1", 0)
	providerIndex := provider.NewProviderIndex(db, adnlAddr, singleNode, logger)
	provider.RegisterRoutes(engine, providerIndex)

	bridge := ionadnl.NewRLDPHTTPBridge(ctx, engine, logger)
	server.SetHTTPBridge(bridge)
	t.Cleanup(func() { bridge.Stop() })

	require.NoError(t, server.Start(ctx))
	server.MarkReady()
	t.Cleanup(func() { _ = server.Stop(context.Background()) })

	return server
}

func connectClient(t *testing.T, addr string, serverKey ed25519.PrivateKey) adnl.Peer {
	t.Helper()

	_, clientKey, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)

	gateway := adnl.NewGateway(clientKey)
	require.NoError(t, gateway.StartClient())
	t.Cleanup(func() { _ = gateway.Close() })

	serverPubKey := serverKey.Public().(ed25519.PublicKey)
	peer, err := gateway.RegisterClient(addr, serverPubKey)
	require.NoError(t, err)

	return peer
}

func generateTestKey(t *testing.T) ed25519.PrivateKey {
	t.Helper()
	_, key, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)
	return key
}

func allocateTestPort(t *testing.T) int {
	t.Helper()
	conn, err := net.ListenPacket("udp4", ":0")
	require.NoError(t, err)
	port := conn.LocalAddr().(*net.UDPAddr).Port
	_ = conn.Close()
	return port
}

func globalConfigURL() string {
	if u := os.Getenv("GLOBAL_CONFIG_URL"); u != "" {
		return u
	}
	return "https://ton.org/testnet-global.config.json"
}

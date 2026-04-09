//go:build e2e

package adnl_test

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	ionadnl "github.com/ice-blockchain/ion/services/ion-connect-storage/internal/adnl"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/stretchr/testify/require"
	"github.com/xssnick/tonutils-go/adnl"
	"github.com/xssnick/tonutils-go/adnl/dht"
	"github.com/xssnick/tonutils-go/adnl/keys"
	"github.com/xssnick/tonutils-go/adnl/overlay"
	"github.com/xssnick/tonutils-go/liteclient"
)

func globalConfigURL() string {
	if url := os.Getenv("GLOBAL_CONFIG_URL"); url != "" {
		return url
	}
	return "https://ton.org/global-config.json"
}

func generateKeyHex(t *testing.T) string {
	t.Helper()
	_, priv, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)
	return hex.EncodeToString(priv.Seed())
}

func allocateTestPort(t *testing.T) int {
	t.Helper()
	conn, err := net.ListenPacket("udp4", ":0")
	require.NoError(t, err)
	port := conn.LocalAddr().(*net.UDPAddr).Port
	_ = conn.Close()
	return port
}

var (
	cachedExternalIP string
	externalIPOnce   sync.Once
)

func detectTestExternalIP(t *testing.T) string {
	t.Helper()
	externalIPOnce.Do(func() {
		if ip := os.Getenv("TEST_EXTERNAL_IP"); ip != "" {
			cachedExternalIP = ip
			return
		}
		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Get("https://api.ipify.org")
		if err != nil {
			return
		}
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		cachedExternalIP = strings.TrimSpace(string(body))
	})
	require.NotEmpty(t, cachedExternalIP, "external IP detection failed")
	require.NotNil(t, net.ParseIP(cachedExternalIP), "invalid external IP")
	return cachedExternalIP
}

func testOverlayKey(bagID boc.BagID) []byte {
	return bagID[:]
}

func retryWithBackoff(t *testing.T, attempts int, fn func() error) {
	t.Helper()
	var err error
	for i := 0; i < attempts; i++ {
		if err = fn(); err == nil {
			return
		}
		t.Logf("attempt %d/%d failed: %v", i+1, attempts, err)
		if i < attempts-1 {
			time.Sleep(time.Duration(i+1) * 3 * time.Second)
		}
	}
	t.Fatalf("all %d attempts failed, last: %v", attempts, err)
}

func startTestServer(t *testing.T, ctx context.Context) *ionadnl.Server {
	t.Helper()

	externalIP := detectTestExternalIP(t)
	port := allocateTestPort(t)

	var server *ionadnl.Server
	retryWithBackoff(t, 3, func() error {
		var err error
		server, err = ionadnl.NewServer(ctx, ionadnl.ServerConfig{
			AdnlPrivateKey:  generateKeyHex(t),
			GlobalConfigURL: globalConfigURL(),
			Port:            port,
			ExternalAddr:    fmt.Sprintf("%s:%d", externalIP, port),
			ActiveDHTLimit:  1000,
		}, testE2ELogger())
		if err != nil {
			return err
		}
		return server.Start(ctx)
	})

	t.Cleanup(func() {
		_ = server.Stop(context.Background())
	})

	return server
}

func createExternalDHTClient(t *testing.T, ctx context.Context) (*dht.Client, *adnl.Gateway) {
	t.Helper()

	_, priv, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)

	gateway := adnl.NewGateway(priv)
	err = gateway.StartClient()
	require.NoError(t, err)

	cfg, err := liteclient.GetConfigFromUrl(ctx, globalConfigURL())
	require.NoError(t, err)

	dhtClient, err := dht.NewClientFromConfig(gateway, cfg)
	require.NoError(t, err)

	t.Cleanup(func() {
		dhtClient.Close()
		_ = gateway.Close()
	})

	return dhtClient, gateway
}

func testE2ELogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))
}

func TestE2E_NodeDiscoverableViaDHT(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	server := startTestServer(t, ctx)
	time.Sleep(3 * time.Second)

	externalDHT, _ := createExternalDHTClient(t, ctx)

	serverID := server.Gateway().GetID()
	require.NotEmpty(t, serverID)

	retryWithBackoff(t, 3, func() error {
		addrList, pubKey, err := externalDHT.FindAddresses(ctx, serverID)
		if err != nil {
			return err
		}
		if addrList == nil || pubKey == nil || len(addrList.Addresses) == 0 {
			return fmt.Errorf("empty address list")
		}
		return nil
	})
}

func TestE2E_DHTRegistrarRegistersBag(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	server := startTestServer(t, ctx)

	testBagID := boc.BagID{0xDE, 0xAD, 0xBE, 0xEF}
	overlayKey := testOverlayKey(testBagID)

	retryWithBackoff(t, 3, func() error {
		return server.DHTRegistrar().Register(ctx, testBagID)
	})
	require.Equal(t, 1, server.DHTRegistrar().Count())

	// Verify discoverable from external client
	externalDHT, _ := createExternalDHTClient(t, ctx)
	retryWithBackoff(t, 3, func() error {
		nodes, _, err := externalDHT.FindOverlayNodes(ctx, overlayKey)
		if err != nil {
			return err
		}
		if len(nodes.List) == 0 {
			return fmt.Errorf("no overlay nodes found for bag")
		}
		return nil
	})

	server.DHTRegistrar().Deregister(testBagID)
	require.Equal(t, 0, server.DHTRegistrar().Count())
}

func TestE2E_OverlayManagerJoinsBagOverlay(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	server := startTestServer(t, ctx)

	testBagID := boc.BagID{0xCA, 0xFE, 0xBA, 0xBE}
	overlayKey := testOverlayKey(testBagID)

	// Register bag in DHT so external clients can find us
	retryWithBackoff(t, 3, func() error {
		return server.DHTRegistrar().Register(ctx, testBagID)
	})

	err := server.OverlayManager().Join(ctx, testBagID)
	require.NoError(t, err)
	require.Equal(t, 1, server.OverlayManager().ActiveCount())

	// External client: find overlay nodes via DHT
	externalDHT, _ := createExternalDHTClient(t, ctx)

	var overlayNodes *overlay.NodesList
	retryWithBackoff(t, 3, func() error {
		var err error
		overlayNodes, _, err = externalDHT.FindOverlayNodes(ctx, overlayKey)
		if err != nil {
			return err
		}
		if len(overlayNodes.List) == 0 {
			return fmt.Errorf("no overlay nodes found")
		}
		return nil
	})

	// Verify overlay nodes are discoverable via DHT (proves the registration worked).
	// Direct overlay query (GetRandomPeers) requires an external machine to connect
	// to our public IP -- not possible in a single-machine test behind NAT.
	require.NotEmpty(t, overlayNodes.List, "server should be listed as overlay node")

	overlayNode := overlayNodes.List[0]
	pub, ok := overlayNode.ID.(keys.PublicKeyED25519)
	require.True(t, ok, "overlay node ID should be ED25519")
	t.Logf("overlay node found in DHT: key=%x", pub.Key[:8])

	err = server.OverlayManager().Leave(testBagID)
	require.NoError(t, err)
	require.Equal(t, 0, server.OverlayManager().ActiveCount())
}

func TestE2E_GracefulShutdown(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	server := startTestServer(t, ctx)
	time.Sleep(2 * time.Second)

	done := make(chan error, 1)
	go func() {
		stopCtx, stopCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer stopCancel()
		done <- server.Stop(stopCtx)
	}()

	select {
	case err := <-done:
		require.NoError(t, err, "server should stop cleanly")
	case <-time.After(10 * time.Second):
		t.Fatal("server did not stop within 10 seconds")
	}
}

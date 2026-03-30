package adnl

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"log/slog"
	"net"
	"os"
	"testing"
	"time"

	"ion-greenfield-proxy/internal/config"

	"github.com/gin-gonic/gin"
	"github.com/puzpuzpuz/xsync/v4"
	"github.com/stretchr/testify/require"
	"github.com/xssnick/tonutils-go/adnl"
	"github.com/xssnick/tonutils-go/adnl/rldp"
)

// generateTestKey creates a random ADNL key for testing.
func generateTestKey(t *testing.T) *Key {
	t.Helper()
	seed := make([]byte, ed25519.SeedSize)
	_, err := rand.Read(seed)
	require.NoError(t, err)
	key, err := LoadKey(hex.EncodeToString(seed))
	require.NoError(t, err)
	return key
}

// newTestListener creates a lightweight Listener without ADNL/RLDP networking.
// Useful for unit-testing reaper, pendingSize accounting, etc.
func newTestListener(t *testing.T) *Listener {
	t.Helper()
	ctx, cancel := context.WithCancel(t.Context())
	t.Cleanup(cancel)
	return &Listener{
		ctx:            ctx,
		cancel:         cancel,
		payloads:       xsync.NewMap[string, *spooledPayload](),
		maxPendingSize: defaultMaxPendingSize,
		logger:         slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
}

// testRLDPEnv holds a running ADNL/RLDP listener and a connected client.
type testRLDPEnv struct {
	Listener *Listener
	Client   *rldp.RLDP
	Ctx      context.Context
}

// startTestRLDPEnv spins up an ADNL listener with the given Gin engine and
// returns a connected RLDP client. Optional funcs can tweak the Listener
// before Start (e.g. set maxPendingSize).
func startTestRLDPEnv(t *testing.T, engine *gin.Engine, opts ...func(*Listener)) *testRLDPEnv {
	t.Helper()

	serverKey := generateTestKey(t)
	_, clientPriv, err := ed25519.GenerateKey(nil)
	require.NoError(t, err)

	port := freeUDPPort(t)

	cfg := &config.Config{
		Port:             port,
		ADNLExternalAddr: fmt.Sprintf("127.0.0.1:%d", port),
	}
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))
	listener := NewListener(cfg, serverKey, engine, logger)
	for _, opt := range opts {
		opt(listener)
	}

	ctx, cancel := context.WithTimeout(t.Context(), 2*time.Minute)
	t.Cleanup(cancel)

	require.NoError(t, listener.Start(ctx))
	t.Cleanup(func() { listener.Stop() })

	clientGate := adnl.NewGateway(clientPriv)
	require.NoError(t, clientGate.StartClient())
	t.Cleanup(func() { clientGate.Close() })

	peer, err := clientGate.RegisterClient(
		fmt.Sprintf("127.0.0.1:%d", port),
		serverKey.Public,
	)
	require.NoError(t, err)

	return &testRLDPEnv{
		Listener: listener,
		Client:   rldp.NewClientV2(peer),
		Ctx:      ctx,
	}
}

// fetchRLDPResponseBody fetches all payload parts for the given request ID.
func fetchRLDPResponseBody(t *testing.T, ctx context.Context, rl *rldp.RLDP, reqID []byte) []byte {
	t.Helper()
	var buf bytes.Buffer
	for seqno := int32(0); ; seqno++ {
		var part PayloadPart
		err := rl.DoQuery(ctx, rldpMaxAnswerSize, GetNextPayloadPart{
			ID:           reqID,
			Seqno:        seqno,
			MaxChunkSize: int32(chunkSize),
		}, &part)
		require.NoError(t, err)
		buf.Write(part.Data)
		if part.IsLast {
			break
		}
	}
	return buf.Bytes()
}

func freeUDPPort(t *testing.T) int {
	t.Helper()
	addr, err := net.ResolveUDPAddr("udp", "127.0.0.1:0")
	require.NoError(t, err)
	conn, err := net.ListenUDP("udp", addr)
	require.NoError(t, err)
	defer conn.Close()
	return conn.LocalAddr().(*net.UDPAddr).Port
}

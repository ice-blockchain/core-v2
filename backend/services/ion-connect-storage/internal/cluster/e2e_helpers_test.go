//go:build e2e

package cluster_test

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/cockroachdb/pebble/v2"
	ionadnl "github.com/ice-blockchain/ion/services/ion-connect-storage/internal/adnl"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/cluster"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/greenfield"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/provider"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/storage"
	"github.com/stretchr/testify/require"
	"github.com/xssnick/tonutils-go/adnl"
	"github.com/xssnick/tonutils-go/adnl/rldp"
)

func greenfieldPrivKey(t *testing.T) string {
	t.Helper()
	key := os.Getenv("GREENFIELD_E2E_PRIVATE_KEY")
	if key == "" {
		t.Skip("GREENFIELD_E2E_PRIVATE_KEY not set")
	}
	return key
}

// clusterNode is a full storage node with CRDT coordinator.
type clusterNode struct {
	env         *storage.SeederEnv
	coordinator *cluster.Coordinator
	nodeID      string
}

// startClusterNode creates a full storage node with CRDT coordinator and
// running subscriber connected to Greenfield websocket.
func startClusterNode(t *testing.T, ctx context.Context) *clusterNode {
	t.Helper()
	privKey := greenfieldPrivKey(t)
	logger := storage.E2ELogger()

	coordDB := openTestPebble(t)
	nodeID := randomNodeID()

	coord, err := cluster.NewCoordinator(cluster.CoordinatorConfig{
		NodeID:                nodeID,
		ClusterOverlayID:      "e2e-cluster",
		DB:                    coordDB,
		Logger:                logger,
		HeartbeatInterval:     200 * time.Millisecond,
		ReclamationInterval:   500 * time.Millisecond,
		StaleHeartbeatTimeout: 1 * time.Second,
	})
	require.NoError(t, err)
	require.NoError(t, coord.Start(ctx))
	t.Cleanup(func() { coord.Stop() })

	env := storage.SetupSeederServer(t, privKey, coord, logger)

	return &clusterNode{
		env:         env,
		coordinator: coord,
		nodeID:      nodeID,
	}
}

// uploadBag creates a bag with deterministic payload, uploads to Greenfield.
// Returns bagID, payload, bucketName, objectName.
func uploadBag(t *testing.T, ctx context.Context, payloadSize int, suffix string) ([32]byte, []byte, string, string) {
	t.Helper()
	privKey := greenfieldPrivKey(t)

	payload := storage.GenerateE2EPayload(payloadSize)
	bucketName := fmt.Sprintf("e2e-cluster-%d-%s", time.Now().UnixMilli(), suffix)
	objectName := fmt.Sprintf("payload-%s", suffix)

	header := boc.SingleFileHeader(objectName, uint64(len(payload)))
	bagID, ionStorageData := boc.MustBuildIonStorageBoC(t, payload, boc.PieceSize, header)

	greenfield.UploadToGreenfield(t, ctx, privKey, bucketName, objectName, payload, ionStorageData, bagID)
	t.Logf("uploaded bag %s (bucket=%s, size=%d)", hex.EncodeToString(bagID[:8]), bucketName, payloadSize)

	return bagID, payload, bucketName, objectName
}

// queryProviderOverRLDP sends an HTTP-over-RLDP lookup to a node's provider index.
func queryProviderOverRLDP(t *testing.T, node *clusterNode, bagID [32]byte) provider.LookupResponse {
	t.Helper()

	_, clientKey, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)
	gateway := adnl.NewGateway(clientKey)
	require.NoError(t, gateway.StartClient())
	t.Cleanup(func() { gateway.Close() })

	serverPubKey := node.env.Server.PrivateKey().Public().(ed25519.PublicKey)
	peer, err := gateway.RegisterClient(fmt.Sprintf("127.0.0.1:%d", node.env.Port), serverPubKey)
	require.NoError(t, err)
	time.Sleep(500 * time.Millisecond)

	rl := rldp.NewClientV2(peer)
	reqID := make([]byte, 32)
	_, _ = rand.Read(reqID)

	var resp ionadnl.Response
	err = rl.DoQuery(context.Background(), 2<<20, &ionadnl.Request{
		ID:      reqID,
		Method:  "GET",
		URL:     "/bags/" + hex.EncodeToString(bagID[:]),
		Version: "HTTP/1.1",
	}, &resp)
	require.NoError(t, err)

	if resp.NoPayload {
		return provider.LookupResponse{}
	}

	var part ionadnl.PayloadPart
	err = rl.DoQuery(context.Background(), 2<<20, &ionadnl.GetNextPayloadPart{
		ID:           reqID,
		Seqno:        0,
		MaxChunkSize: 1 << 20,
	}, &part)
	require.NoError(t, err)

	var lookup provider.LookupResponse
	require.NoError(t, json.Unmarshal(part.Data, &lookup))
	return lookup
}

func openTestPebble(t *testing.T) *pebble.DB {
	t.Helper()
	db, err := pebble.Open(t.TempDir(), &pebble.Options{})
	require.NoError(t, err)
	t.Cleanup(func() { db.Close() })
	return db
}

func randomNodeID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

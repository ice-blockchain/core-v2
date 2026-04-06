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

const clusterOverlayName = "e2e-cluster"

func greenfieldPrivKey(t *testing.T) string {
	t.Helper()
	key := os.Getenv("GREENFIELD_E2E_PRIVATE_KEY")
	if key == "" {
		t.Skip("GREENFIELD_E2E_PRIVATE_KEY not set")
	}
	return key
}

// clusterNode is a full storage node with CRDT coordinator and transport.
type clusterNode struct {
	env         *storage.SeederEnv
	coordinator *cluster.Coordinator
	transport   *cluster.ClusterTransport
	nodeID      string
}

// startClusterNode creates a node with coordinator, transport, and running subscriber.
// Call wireCluster after all nodes are created to connect them.
func startClusterNode(t *testing.T, ctx context.Context) *clusterNode {
	t.Helper()
	privKey := greenfieldPrivKey(t)
	logger := storage.E2ELogger()

	coordDB := openTestPebble(t)
	nodeID := randomNodeID()
	overlayID := cluster.ComputeClusterOverlayID(clusterOverlayName)

	coord, err := cluster.NewCoordinator(cluster.CoordinatorConfig{
		NodeID:                nodeID,
		ClusterOverlayID:      clusterOverlayName,
		DB:                    coordDB,
		Logger:                logger,
		HeartbeatInterval:     500 * time.Millisecond,
		ReclamationInterval:   3 * time.Second,
		StaleHeartbeatTimeout: 5 * time.Second,
	})
	require.NoError(t, err)

	env := storage.SetupSeederServer(t, privKey, coord, logger)

	// Wire transport: broadcast + block exchange + piece forwarding over cluster overlay.
	transport, err := cluster.NewClusterTransport(env.Server, overlayID, coord.Broadcaster(), coord.DAGService(), logger)
	require.NoError(t, err)
	transport.RegisterWithServer()
	transport.SetPieceHandler(env.StorageHandler.ServePiece)
	transport.SetRawQueryHandler(env.StorageHandler.HandleOverlayQuery)
	transport.SetOwnershipChecker(coord)
	coord.SetTransport(transport)

	coord.SetPieceForwarder(cluster.NewPieceForwarder(transport, coord, nil, logger))

	// Fill ADNL address in config for node info.
	coord.UpdateNodeInfo(hex.EncodeToString(env.ADNLAddr[:]), fmt.Sprintf("127.0.0.1"), env.Port)

	require.NoError(t, coord.Start(ctx))
	t.Cleanup(func() { coord.Stop() })

	return &clusterNode{
		env:         env,
		coordinator: coord,
		transport:   transport,
		nodeID:      nodeID,
	}
}

// wireCluster connects all nodes to each other via direct ADNL (bidirectional).
// Each node connects to every other node so both sides have peers for block exchange.
func wireCluster(t *testing.T, nodes []*clusterNode) {
	t.Helper()
	for i, nodeA := range nodes {
		for j, nodeB := range nodes {
			if i == j {
				continue
			}
			pubKey := nodeB.env.Server.PrivateKey().Public().(ed25519.PublicKey)
			addr := fmt.Sprintf("127.0.0.1:%d", nodeB.env.Port)
			_, err := nodeA.transport.ConnectToPeer(addr, pubKey)
			require.NoError(t, err)
		}
	}
	time.Sleep(1 * time.Second)
}

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
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// waitForClusterConvergence polls until every node sees all nodes as active
// via CRDT heartbeats. Replaces fragile time.Sleep calls.
func waitForClusterConvergence(t *testing.T, nodes []*clusterNode, timeout time.Duration) {
	t.Helper()
	expected := len(nodes)
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		allConverged := true
		for _, n := range nodes {
			if n.coordinator.ActiveNodeCount() < expected {
				allConverged = false
				break
			}
		}
		if allConverged {
			t.Logf("cluster converged: all %d nodes see %d active", expected, expected)
			return
		}
		time.Sleep(200 * time.Millisecond)
	}
	for _, n := range nodes {
		t.Logf("node %s sees %d active nodes", n.nodeID[:12], n.coordinator.ActiveNodeCount())
	}
	t.Fatalf("cluster did not converge within %s", timeout)
}

// waitForExactlyOneOwner polls until exactly one node owns the bag.
func waitForExactlyOneOwner(t *testing.T, nodes []*clusterNode, bagID [32]byte, timeout time.Duration) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		ownerCount := 0
		for _, n := range nodes {
			if n.coordinator.OwnsBag(bagID) {
				ownerCount++
			}
		}
		if ownerCount == 1 {
			return
		}
		time.Sleep(200 * time.Millisecond)
	}
	t.Fatalf("bag %x: expected exactly 1 owner, timed out", bagID[:8])
}

package cluster

import (
	"context"
	"crypto/ed25519"
	"fmt"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"

	"github.com/cockroachdb/pebble/v2"
	ds "github.com/ipfs/go-datastore"
	dsq "github.com/ipfs/go-datastore/query"
	crdt "github.com/ipfs/go-ds-crdt"
)

// CoordinatorConfig holds configuration for the CRDT cluster coordinator.
type CoordinatorConfig struct {
	NodeID                     string
	ClusterOverlayID           string
	ADNLAddress                string // hex-encoded ADNL address
	ExternalIP                 string
	ExternalPort               int
	DB                         *pebble.DB
	Metrics                    *ClusterMetrics
	Logger                     *slog.Logger
	HeartbeatInterval          time.Duration
	ReclamationInterval        time.Duration
	StaleHeartbeatTimeout      time.Duration
	ReclamationStartDelay      time.Duration
	ClaimVerifyDelay           time.Duration
	PrivateKey                 ed25519.PrivateKey
	HeartbeatSignatureRequired bool
}

func (c *CoordinatorConfig) applyDefaults() {
	if c.HeartbeatInterval == 0 {
		c.HeartbeatInterval = 60 * time.Second
	}
	if c.ReclamationInterval == 0 {
		c.ReclamationInterval = 5 * time.Minute
	}
	if c.StaleHeartbeatTimeout == 0 {
		c.StaleHeartbeatTimeout = 10 * time.Minute
	}
	if c.ReclamationStartDelay == 0 {
		c.ReclamationStartDelay = c.StaleHeartbeatTimeout
	}
}

// Coordinator manages CRDT-based bag ownership across cluster nodes.
// Implements OwnershipChecker, LocalOwnershipChecker, OwnerResolver,
// ClusterChecker, and PieceForwarder interfaces.
type Coordinator struct {
	crdt           *crdt.Datastore
	broadcaster    *ADNLBroadcaster
	dagService     *ADNLDAGService
	pebbleDS       *PebbleDatastore
	pieceForwarder *PieceForwarder
	transport      *ClusterTransport
	nodeID         string
	ownedCountMu   sync.Mutex
	ownedCount     atomic.Int64
	metrics        *ClusterMetrics
	logger         *slog.Logger
	cfg            CoordinatorConfig
	ctx            context.Context
	cancel         context.CancelFunc
	wg             sync.WaitGroup
	stopOnce       sync.Once
}

// ForwardGetPiece delegates to the piece forwarder.
func (c *Coordinator) ForwardGetPiece(ctx context.Context, bagID [32]byte, pieceID int) ([]byte, []byte, error) {
	if c.pieceForwarder == nil {
		return nil, nil, fmt.Errorf("piece forwarder not configured")
	}
	return c.pieceForwarder.ForwardGetPiece(ctx, bagID, pieceID)
}

// ForwardRawQuery delegates to the piece forwarder.
func (c *Coordinator) ForwardRawQuery(ctx context.Context, bagID [32]byte, rawQuery []byte) ([]byte, error) {
	if c.pieceForwarder == nil {
		return nil, fmt.Errorf("piece forwarder not configured")
	}
	return c.pieceForwarder.ForwardRawQuery(ctx, bagID, rawQuery)
}

// SetPieceForwarder configures the piece forwarder for this coordinator.
func (c *Coordinator) SetPieceForwarder(forwarder *PieceForwarder) {
	c.pieceForwarder = forwarder
}

// SetTransport wires the cluster transport for CRDT broadcast and block exchange.
// Must be called before Start().
func (c *Coordinator) SetTransport(transport *ClusterTransport) {
	c.transport = transport
	c.broadcaster.peer = transport
	c.dagService.fetcher = transport
	transport.SetMemberResolver(c)
}

// Transport returns the cluster transport (for adding peers, etc).
func (c *Coordinator) Transport() *ClusterTransport {
	return c.transport
}

// NewCoordinator creates a cluster coordinator. Call Start() to begin operation.
func NewCoordinator(cfg CoordinatorConfig) (*Coordinator, error) {
	if err := ValidateNodeID(cfg.NodeID); err != nil {
		return nil, fmt.Errorf("invalid node ID: %w", err)
	}
	cfg.applyDefaults()

	pebbleDS := NewPebbleDatastore(cfg.DB, "crdt/")
	broadcaster := NewADNLBroadcaster(nil, cfg.Logger) // PeerBroadcaster set later
	dagService := NewADNLDAGService(cfg.DB, nil, cfg.Logger)

	crdtOpts := crdt.DefaultOptions()
	crdtOpts.RebroadcastInterval = cfg.HeartbeatInterval
	crdtOpts.MaxBatchDeltaSize = 200 * 1024 // 200KB max delta

	crdtDS, err := crdt.New(
		pebbleDS,
		ds.NewKey("/ion-cluster"),
		dagService,
		broadcaster,
		crdtOpts,
	)
	if err != nil {
		return nil, fmt.Errorf("create crdt datastore: %w", err)
	}

	return &Coordinator{
		crdt:        crdtDS,
		broadcaster: broadcaster,
		dagService:  dagService,
		pebbleDS:    pebbleDS,
		nodeID:      cfg.NodeID,
		metrics:     cfg.Metrics,
		logger:      cfg.Logger,
		cfg:         cfg,
	}, nil
}

// Start begins CRDT synchronization, heartbeat writing, reclamation, and node info publishing.
func (c *Coordinator) Start(ctx context.Context) error {
	ctx, c.cancel = context.WithCancel(ctx)
	c.ctx = ctx
	c.logger.Info("cluster coordinator starting", "node_id", c.nodeID)

	if err := c.publishNodeInfo(ctx); err != nil {
		return fmt.Errorf("publish node info: %w", err)
	}

	c.wg.Add(3)
	go func() { defer c.wg.Done(); c.heartbeatLoop(ctx) }()
	go func() { defer c.wg.Done(); c.StartReclamation(ctx) }()
	go func() { defer c.wg.Done(); c.reconcileOwnedCountLoop(ctx) }()
	return nil
}

// Stop shuts down the coordinator and closes CRDT. Safe to call multiple times.
func (c *Coordinator) Stop() {
	c.stopOnce.Do(func() {
		if c.cancel != nil {
			c.cancel()
		}
	})
	c.wg.Wait()
	if err := c.crdt.Close(); err != nil {
		c.logger.Error("close crdt", "error", err)
	}
	c.broadcaster.Close()
	c.logger.Info("cluster coordinator stopped")
}

// IsConnected returns whether the CRDT datastore is active.
func (c *Coordinator) IsConnected() bool {
	return c.crdt != nil
}

// ActiveNodeCount returns the count of nodes with fresh heartbeats.
func (c *Coordinator) ActiveNodeCount() int {
	return countActiveNodes(c.crdt, c.cfg.StaleHeartbeatTimeout, c.logger)
}

// NodeID returns this coordinator's node identifier.
func (c *Coordinator) NodeID() string {
	return c.nodeID
}

// IsRegisteredNode checks if an ADNL address belongs to a registered cluster
// member by scanning CRDT nodeinfo entries. This is the fallback for peer
// authentication when the peer isn't in the local connected peers map.
func (c *Coordinator) IsRegisteredNode(adnlAddr [32]byte) bool {
	adnlHex := hexEncode(adnlAddr[:])
	ctx, cancel := context.WithTimeout(c.baseContext(), ownerQueryTimeout)
	defer cancel()
	results, err := c.crdt.Query(ctx, dsq.Query{Prefix: prefixNodeInfo})
	if err != nil {
		return false
	}
	defer results.Close()
	for r := range results.Next() {
		if r.Error != nil {
			continue
		}
		info, err := UnmarshalNodeInfo(r.Value)
		if err != nil {
			continue
		}
		if info.ADNLAddress == adnlHex {
			return true
		}
	}
	return false
}

// UpdateNodeInfo updates the ADNL address info used in publishNodeInfo.
func (c *Coordinator) UpdateNodeInfo(adnlAddress, ip string, port int) {
	c.cfg.ADNLAddress = adnlAddress
	c.cfg.ExternalIP = ip
	c.cfg.ExternalPort = port
}

// Broadcaster returns the CRDT broadcaster (for wiring transport).
func (c *Coordinator) Broadcaster() *ADNLBroadcaster {
	return c.broadcaster
}

// DAGService returns the IPLD DAG service (for wiring transport).
func (c *Coordinator) DAGService() *ADNLDAGService {
	return c.dagService
}

func (c *Coordinator) publishNodeInfo(ctx context.Context) error {
	info := NodeInfo{
		ADNLAddress: c.cfg.ADNLAddress,
		IP:          c.cfg.ExternalIP,
		Port:        c.cfg.ExternalPort,
	}
	if c.cfg.PrivateKey != nil {
		info.PublicKey = hexEncode(c.cfg.PrivateKey.Public().(ed25519.PublicKey))
	}
	data, err := MarshalNodeInfo(info)
	if err != nil {
		return err
	}
	return c.crdt.Put(ctx, ds.NewKey(NodeInfoKey(c.nodeID)), data)
}

func (c *Coordinator) heartbeatLoop(ctx context.Context) {
	ticker := time.NewTicker(c.cfg.HeartbeatInterval)
	defer ticker.Stop()

	c.writeHeartbeat(ctx)
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			c.writeHeartbeat(ctx)
		}
	}
}

func (c *Coordinator) writeHeartbeat(ctx context.Context) {
	if ctx.Err() != nil {
		return
	}
	ts := time.Now().Unix()
	var val []byte
	if c.cfg.PrivateKey != nil {
		val = FormatSignedHeartbeat(ts, c.nodeID, c.cfg.PrivateKey)
	} else {
		val = FormatHeartbeat(ts)
	}
	if err := c.crdt.Put(ctx, ds.NewKey(HeartbeatKey(c.nodeID)), val); err != nil {
		if ctx.Err() == nil {
			c.logger.Warn("write heartbeat", "error", err)
		}
	}
}

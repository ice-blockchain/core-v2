package adnl

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net"
	"sync/atomic"
	"time"

	"github.com/xssnick/tonutils-go/adnl"
	"github.com/xssnick/tonutils-go/adnl/address"
	"github.com/xssnick/tonutils-go/adnl/dht"
	"github.com/xssnick/tonutils-go/adnl/keys"
	"github.com/xssnick/tonutils-go/adnl/overlay"
	"github.com/xssnick/tonutils-go/liteclient"
)

const defaultMaxConnections = 10_000

type ServerConfig struct {
	AdnlPrivateKey  string
	GlobalConfigURL string
	Port            int
	ExternalAddr    string
	ActiveDHTLimit  int
	MaxConnections  int
}

// ClusterQueryHandler processes raw TL queries for the cluster overlay.
type ClusterQueryHandler func(ctx context.Context, rawQuery []byte) ([]byte, error)

// ClusterMemberChecker verifies whether a peer is an authorized cluster member.
type ClusterMemberChecker interface {
	IsClusterMember(adnlAddr []byte) bool
}

type Server struct {
	gateway              *adnl.Gateway
	dhtClient            *dht.Client
	registrar            *DHTRegistrar
	overlays             *OverlayManager
	httpBridge           *RLDPHTTPBridge
	clusterOverlayID     [32]byte
	clusterQueryHandler  ClusterQueryHandler
	clusterMemberChecker ClusterMemberChecker
	privateKey           ed25519.PrivateKey
	port                 int
	externalIP           net.IP
	externalPort         int
	maxConnections       int
	querySemaphore       chan struct{}
	activeConnections    atomic.Int64
	running              atomic.Bool
	ready                atomic.Bool
	logger               *slog.Logger
}

func NewServer(ctx context.Context, config ServerConfig, logger *slog.Logger) (*Server, error) {
	privateKey, err := decodePrivateKey(config.AdnlPrivateKey)
	if err != nil {
		return nil, fmt.Errorf("decode ADNL key: %w", err)
	}

	externalIP, externalPort, err := parseExternalAddr(config.ExternalAddr)
	if err != nil {
		return nil, fmt.Errorf("parse ADNL_EXTERNAL_ADDR: %w", err)
	}

	logger.Info("fetching global config", "url", config.GlobalConfigURL)
	globalCfg, err := liteclient.GetConfigFromUrl(ctx, config.GlobalConfigURL)
	if err != nil {
		return nil, fmt.Errorf("fetch global config: %w", err)
	}

	gateway := adnl.NewGateway(privateKey)

	dhtClient, err := dht.NewClientFromConfig(gateway, globalCfg)
	if err != nil {
		return nil, fmt.Errorf("create DHT client: %w", err)
	}

	seeds := extractSeedNodes(globalCfg)
	sw := newSweeper(gateway, privateKey, seeds, logger)
	registrar := newDHTRegistrar(dhtClient, sw, config.ActiveDHTLimit, privateKey, logger)
	overlays := newOverlayManager(config.ActiveDHTLimit, logger)

	maxConn := config.MaxConnections
	if maxConn <= 0 {
		maxConn = defaultMaxConnections
	}

	return &Server{
		gateway:        gateway,
		dhtClient:      dhtClient,
		registrar:      registrar,
		overlays:       overlays,
		privateKey:     privateKey,
		port:           config.Port,
		externalIP:     externalIP,
		externalPort:   externalPort,
		maxConnections: maxConn,
		querySemaphore: make(chan struct{}, maxConn),
		logger:         logger,
	}, nil
}

func (s *Server) Start(ctx context.Context) error {
	bindAddr := fmt.Sprintf("0.0.0.0:%d", s.port)
	if err := s.gateway.StartServer(bindAddr, 1); err != nil {
		return fmt.Errorf("start ADNL gateway: %w", err)
	}

	s.gateway.SetAddressList([]*address.UDP{{IP: s.externalIP, Port: int32(s.externalPort)}})

	addrList := s.gateway.GetAddressList()
	s.logger.Info("ADNL gateway started",
		"adnl_address", hex.EncodeToString(s.gateway.GetID()),
		"bind_addr", bindAddr,
		"external_addr", formatAddresses(addrList),
	)

	if err := s.registerSelfInDHT(ctx); err != nil {
		s.logger.Warn("initial DHT self-registration failed", "error", err)
	}

	s.gateway.SetConnectionHandler(s.handleNewConnection)

	s.registrar.Start(ctx)
	s.running.Store(true)
	s.logger.Info("DHT registrar started", "registered_bags", s.registrar.Count())
	s.logger.Info("overlay manager ready", "active_overlays", s.overlays.ActiveCount())

	return nil
}

func (s *Server) registerSelfInDHT(ctx context.Context) error {
	addrList := s.gateway.GetAddressList()
	storeCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	replicas, _, err := s.dhtClient.StoreAddress(storeCtx, addrList, 1*time.Hour, s.privateKey, 5)
	if err != nil {
		return err
	}
	s.logger.Info("registered self in DHT", "replicas", replicas)
	return nil
}

func (s *Server) Stop(_ context.Context) error {
	s.running.Store(false)
	s.logger.Info("stopping DHT registrar")
	s.registrar.Stop()

	s.logger.Info("closing DHT client")
	s.dhtClient.Close()

	s.logger.Info("closing ADNL gateway")
	return s.gateway.Close()
}

func (s *Server) DHTRegistrar() *DHTRegistrar     { return s.registrar }
func (s *Server) OverlayManager() *OverlayManager { return s.overlays }
func (s *Server) Gateway() *adnl.Gateway          { return s.gateway }
func (s *Server) DHTClient() *dht.Client          { return s.dhtClient }

// PublicKey returns the server's public key (safe to expose).
func (s *Server) PublicKey() ed25519.PublicKey {
	return s.privateKey.Public().(ed25519.PublicKey)
}

// NewClientGateway creates an ADNL gateway for outgoing connections
// using the server's identity, without exposing the private key.
func (s *Server) NewClientGateway() (*adnl.Gateway, error) {
	gw := adnl.NewGateway(s.privateKey)
	if err := gw.StartClient(); err != nil {
		return nil, fmt.Errorf("start client gateway: %w", err)
	}
	return gw, nil
}

// NewOverlayNode creates a signed overlay node descriptor for the given
// overlay ID, without exposing the private key to callers.
func (s *Server) NewOverlayNode(overlayID []byte) (*overlay.Node, error) {
	return overlay.NewNode(overlayID, s.privateKey)
}

// PrivateKey returns the server's ed25519 private key for cluster operations.
func (s *Server) PrivateKey() ed25519.PrivateKey { return s.privateKey }

// Sign signs the given data using the server's private key.
func (s *Server) Sign(data []byte) []byte { return ed25519.Sign(s.privateKey, data) }
func (s *Server) IsRunning() bool         { return s.running.Load() }

// MarkReady signals that all handlers are wired and the server can accept queries.
func (s *Server) MarkReady() { s.ready.Store(true) }

// ActiveConnections returns the current number of active ADNL connections.
func (s *Server) ActiveConnections() int64 { return s.activeConnections.Load() }

// SetHTTPBridge registers the RLDP-HTTP bridge for incoming connections.
func (s *Server) SetHTTPBridge(b *RLDPHTTPBridge) { s.httpBridge = b }

// SetClusterOverlay registers a handler for the cluster overlay.
// Queries arriving on this overlay ID are routed to the handler instead of OverlayManager.
func (s *Server) SetClusterOverlay(overlayID [32]byte, handler ClusterQueryHandler) {
	s.clusterOverlayID = overlayID
	s.clusterQueryHandler = handler
}

// SetClusterMemberChecker registers a checker that verifies whether
// a peer is an authorized cluster member before routing cluster queries.
func (s *Server) SetClusterMemberChecker(checker ClusterMemberChecker) {
	s.clusterMemberChecker = checker
}

// ExternalIP returns the advertised IP address.
func (s *Server) ExternalIP() net.IP { return s.externalIP }

// ExternalPort returns the advertised port.
func (s *Server) ExternalPort() int { return s.externalPort }

func decodePrivateKey(hexKey string) (ed25519.PrivateKey, error) {
	if len(hexKey) != 64 {
		return nil, fmt.Errorf("expected 64 hex characters, got %d", len(hexKey))
	}
	seed, err := hex.DecodeString(hexKey)
	if err != nil {
		return nil, fmt.Errorf("invalid hex: %w", err)
	}
	return ed25519.NewKeyFromSeed(seed), nil
}

func parseExternalAddr(raw string) (net.IP, int, error) {
	if raw == "" {
		return nil, 0, fmt.Errorf("external address is required")
	}
	host, portStr, err := net.SplitHostPort(raw)
	if err != nil {
		return nil, 0, fmt.Errorf("expected host:port format: %w", err)
	}
	ip := net.ParseIP(host)
	if ip == nil {
		return nil, 0, fmt.Errorf("invalid IP in external address: %s", host)
	}
	if ip4 := ip.To4(); ip4 != nil {
		ip = ip4
	}
	port, err := net.LookupPort("udp", portStr)
	if err != nil || port <= 0 {
		return nil, 0, fmt.Errorf("invalid port in external address: %s", portStr)
	}
	return ip, port, nil
}

func extractSeedNodes(cfg *liteclient.GlobalConfig) []seedNode {
	var seeds []seedNode
	for _, node := range cfg.DHT.StaticNodes.Nodes {
		keyBytes, err := base64.StdEncoding.DecodeString(node.ID.Key)
		if err != nil || len(node.AddrList.Addrs) == 0 {
			continue
		}
		addr := node.AddrList.Addrs[0]
		ip := addrIntToIP(int32(addr.IP))
		seeds = append(seeds, seedNode{
			addr:      fmt.Sprintf("%s:%d", ip.String(), addr.Port),
			serverKey: keys.PublicKeyED25519{Key: keyBytes}.Key,
		})
	}
	return seeds
}

func addrIntToIP(ip int32) net.IP {
	b := make(net.IP, 4)
	b[0] = byte(ip >> 24)
	b[1] = byte(ip >> 16)
	b[2] = byte(ip >> 8)
	b[3] = byte(ip)
	return b
}

func formatAddresses(list address.List) string {
	if len(list.Addresses) == 0 {
		return "none"
	}
	var result string
	for i, addr := range list.Addresses {
		if i > 0 {
			result += ", "
		}
		result += net.JoinHostPort(addr.IP.String(), fmt.Sprintf("%d", addr.Port))
	}
	return result
}

package provider

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/cockroachdb/pebble/v2"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
)

const provKeyPrefix = "prov/"

// ProviderRecord identifies a node serving a bag.
type ProviderRecord struct {
	ADNLAddress string `json:"adnlAddress"`
}

// LookupResponse is the JSON response for GET /bags/:bagId.
type LookupResponse struct {
	BagID     string           `json:"bagId"`
	Providers []ProviderRecord `json:"providers"`
}

// OwnerResolver resolves bag ownership from the cluster CRDT.
type OwnerResolver interface {
	Owner(bagID boc.BagID) string
	NodeADNLAddress(nodeID string) (adnlAddr [32]byte, ip string, port int, found bool)
}

// ProviderIndex maps bagId to the set of ADNL addresses serving that bag.
type ProviderIndex struct {
	db            *pebble.DB
	adnlAddr      [32]byte
	ownerResolver OwnerResolver
	logger        *slog.Logger
}

// NewProviderIndex creates a provider index backed by PebbleDB.
func NewProviderIndex(db *pebble.DB, adnlAddr [32]byte, ownerResolver OwnerResolver, logger *slog.Logger) *ProviderIndex {
	return &ProviderIndex{db: db, adnlAddr: adnlAddr, ownerResolver: ownerResolver, logger: logger}
}

// Register persists this node as a provider for the given bag.
func (p *ProviderIndex) Register(bagID boc.BagID) error {
	records := []ProviderRecord{{ADNLAddress: hex.EncodeToString(p.adnlAddr[:])}}
	data, err := json.Marshal(records)
	if err != nil {
		return fmt.Errorf("marshal provider records: %w", err)
	}
	if err := p.db.Set(makeProviderKey(bagID), data, pebble.Sync); err != nil {
		return fmt.Errorf("set provider: %w", err)
	}
	return nil
}

// Deregister removes this node as a provider for the given bag.
func (p *ProviderIndex) Deregister(bagID boc.BagID) error {
	if err := p.db.Delete(makeProviderKey(bagID), pebble.Sync); err != nil {
		return fmt.Errorf("delete provider: %w", err)
	}
	return nil
}

// Lookup returns all known providers for a bag.
// Checks PebbleDB first to confirm the bag is registered, then enriches
// with the CRDT owner's ADNL address if available.
func (p *ProviderIndex) Lookup(bagID boc.BagID) ([]ProviderRecord, error) {
	val, closer, err := p.db.Get(makeProviderKey(bagID))
	if err == pebble.ErrNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get provider: %w", err)
	}
	// Copy val before closing -- PebbleDB reuses the buffer after Close.
	valCopy := make([]byte, len(val))
	copy(valCopy, val)
	closer.Close()

	// Bag is registered. Use CRDT owner for the freshest ADNL address.
	ownerNodeID := p.ownerResolver.Owner(bagID)
	if ownerNodeID != "" {
		adnlAddr, _, _, found := p.ownerResolver.NodeADNLAddress(ownerNodeID)
		if found {
			return []ProviderRecord{{ADNLAddress: hex.EncodeToString(adnlAddr[:])}}, nil
		}
	}

	// Fall back to the persisted provider records.
	var records []ProviderRecord
	if err := json.Unmarshal(valCopy, &records); err != nil {
		return nil, fmt.Errorf("unmarshal provider records: %w", err)
	}
	return records, nil
}

func makeProviderKey(bagID boc.BagID) []byte {
	key := make([]byte, len(provKeyPrefix)+32)
	copy(key, provKeyPrefix)
	copy(key[len(provKeyPrefix):], bagID[:])
	return key
}

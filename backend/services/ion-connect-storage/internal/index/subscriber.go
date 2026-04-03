package index

import (
	"context"
	"encoding/hex"
	"log/slog"

	greenfieldclient "github.com/ice-blockchain/ion/packages/greenfield-client"
)

const (
	eventTypeSetTag       = "greenfield.storage.EventSetTag"
	eventTypeCreateObject = "greenfield.storage.EventCreateObject"
	eventTypeUpdateObject = "greenfield.storage.EventUpdateObjectContent"
)

// OwnershipChecker decides whether this node should own a bag.
type OwnershipChecker interface {
	OwnsOrClaim(ctx context.Context, bagID [32]byte) (bool, error)
}

// Subscriber consumes Greenfield events and populates the bag index.
type Subscriber struct {
	client           greenfieldclient.Client
	persister        *Persister
	ownershipChecker OwnershipChecker
	env              string
	logger           *slog.Logger
}

// NewSubscriber creates a Subscriber.
func NewSubscriber(
	client greenfieldclient.Client,
	persister *Persister,
	ownershipChecker OwnershipChecker,
	env string,
	logger *slog.Logger,
) *Subscriber {
	return &Subscriber{
		client:           client,
		persister:        persister,
		ownershipChecker: ownershipChecker,
		env:              env,
		logger:           logger,
	}
}

// Run starts the subscription loop. Blocks until ctx is cancelled.
func (s *Subscriber) Run(ctx context.Context) error {
	lastHeight, err := s.persister.LoadLastHeight()
	if err != nil {
		return err
	}

	s.logger.Info("starting subscriber", "last_height", lastHeight)

	query := greenfieldclient.BagIndexQuery(s.env)
	ch, err := s.client.Subscribe(ctx, greenfieldclient.SubscribeOpts{
		LastHeight: lastHeight,
		Query:      query,
	})
	if err != nil {
		return err
	}

	for txEvent := range ch {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if err := s.ProcessEvent(txEvent); err != nil {
			s.logger.Error("process event", "height", txEvent.Height, "error", err)
		}
	}

	return nil
}

// ProcessEvent correlates EventCreateObject/EventUpdateObjectContent with
// EventSetTag to build (bagID -> BagLocation) entries.
func (s *Subscriber) ProcessEvent(txEvent *greenfieldclient.TxEvent) error {
	entries := s.collectEntries(txEvent)
	if len(entries) == 0 {
		return nil
	}

	return s.persister.PersistBagsAndHeight(entries, txEvent.Height)
}

// objectKey uniquely identifies an object within a transaction.
type objectKey struct {
	bucket string
	object string
}

// collectEntries correlates SetTag events (with ion-bag-id) against
// CreateObject/UpdateObject events in the same transaction. Only SetTag
// events whose resource GRN matches a CreateObject or UpdateObject are indexed.
func (s *Subscriber) collectEntries(txEvent *greenfieldclient.TxEvent) []BagEntry {
	knownObjects := collectKnownObjects(txEvent)
	if len(knownObjects) == 0 {
		return nil
	}

	var entries []BagEntry
	for _, e := range txEvent.Events {
		if e.Type != eventTypeSetTag {
			continue
		}
		ste, err := greenfieldclient.ExtractSetTagEvent(e)
		if err != nil || ste.BucketName == "" || ste.ObjectName == "" {
			continue
		}

		key := objectKey{bucket: ste.BucketName, object: ste.ObjectName}
		if _, matched := knownObjects[key]; !matched {
			continue
		}

		bagIDHex := findTagValue(ste.Tags, "ion-bag-id")
		if bagIDHex == "" {
			continue
		}
		bagID, err := decodeBagID(bagIDHex)
		if err != nil {
			s.logger.Warn("invalid ion-bag-id hex", "value", bagIDHex, "error", err)
			continue
		}

		owned, err := s.ownershipChecker.OwnsOrClaim(context.Background(), bagID)
		if err != nil {
			s.logger.Warn("ownership check failed", "bag_id", bagIDHex, "error", err)
			continue
		}
		if !owned {
			s.logger.Debug("bag not owned, skipping", "bag_id", bagIDHex)
			continue
		}

		loc := BagLocation{BucketName: ste.BucketName, ObjectName: ste.ObjectName}

		s.logger.Info("indexed bag",
			"bag_id", bagIDHex,
			"bucket", loc.BucketName,
			"object", loc.ObjectName,
			"height", txEvent.Height,
		)

		entries = append(entries, BagEntry{BagID: bagID, Location: loc})
	}

	return entries
}

// collectKnownObjects builds a set of (bucket, object) pairs from
// EventCreateObject and EventUpdateObjectContent events in the transaction.
func collectKnownObjects(txEvent *greenfieldclient.TxEvent) map[objectKey]struct{} {
	objects := make(map[objectKey]struct{})
	for _, e := range txEvent.Events {
		switch e.Type {
		case eventTypeCreateObject:
			parsed, err := greenfieldclient.ExtractCreateObjectEvent(txEvent, e)
			if err != nil {
				continue
			}
			objects[objectKey{bucket: parsed.BucketName, object: parsed.ObjectName}] = struct{}{}
		case eventTypeUpdateObject:
			parsed, err := greenfieldclient.ExtractUpdateObjectContentEvent(txEvent, e)
			if err != nil {
				continue
			}
			objects[objectKey{bucket: parsed.BucketName, object: parsed.ObjectName}] = struct{}{}
		}
	}
	return objects
}

func findTagValue(tags []greenfieldclient.TagEntry, key string) string {
	for _, t := range tags {
		if t.Key == key {
			return t.Value
		}
	}
	return ""
}

func decodeBagID(hexStr string) ([32]byte, error) {
	var bagID [32]byte
	b, err := hex.DecodeString(hexStr)
	if err != nil {
		return bagID, err
	}
	if len(b) != 32 {
		return bagID, hex.ErrLength
	}
	copy(bagID[:], b)
	return bagID, nil
}

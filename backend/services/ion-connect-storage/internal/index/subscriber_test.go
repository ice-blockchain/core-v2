package index

import (
	"context"
	"encoding/hex"
	"log/slog"
	"os"
	"strings"
	"testing"

	"github.com/cockroachdb/pebble/v2"
	greenfieldclient "github.com/ice-blockchain/ion/packages/greenfield-client"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/stretchr/testify/require"
)

// alwaysOwnChecker always claims ownership.
type alwaysOwnChecker struct{}

func (a *alwaysOwnChecker) OwnsOrClaim(_ context.Context, _ boc.BagID) (bool, error) {
	return true, nil
}

func newTestSubscriber(t *testing.T) (*Subscriber, *Persister) {
	t.Helper()
	db, err := pebble.Open(t.TempDir(), &pebble.Options{})
	require.NoError(t, err)
	t.Cleanup(func() { db.Close() })

	p := NewPersister(db)
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))
	s := &Subscriber{
		persister:        p,
		ownershipChecker: &alwaysOwnChecker{},
		env:              "dev",
		logger:           logger,
	}
	return s, p
}

func makeTxEventWithBag(bagIDHex, bucket, object string, height int64) *greenfieldclient.TxEvent {
	return &greenfieldclient.TxEvent{
		Height: height,
		TxHash: "TX123",
		Events: []greenfieldclient.ABCIEvent{
			{
				Type: "greenfield.storage.EventCreateObject",
				Attributes: map[string]string{
					"bucket_name": bucket,
					"object_name": object,
				},
			},
			{
				Type: "greenfield.storage.EventSetTag",
				Attributes: map[string]string{
					"resource": "grn:o::" + bucket + "/" + object,
					"tags":     `{"tags":[{"key":"onlineioEnv","value":"dev"},{"key":"ion-bag-id","value":"` + bagIDHex + `"}]}`,
				},
			},
		},
	}
}

func decodeBagIDHelper(t *testing.T, hexStr string) boc.BagID {
	t.Helper()
	var bagID boc.BagID
	decoded, err := hex.DecodeString(hexStr)
	require.NoError(t, err)
	copy(bagID[:], decoded)
	return bagID
}

func TestProcessEvent_CorrelatesCreateAndSetTag(t *testing.T) {
	s, p := newTestSubscriber(t)

	bagIDHex := "bb5b3a4bd4775cc5f89b2f2c80ec8c699662b26c2ab475248d721ed381ab3423"
	txEvent := makeTxEventWithBag(bagIDHex, "user-bucket10", "test-object", 29574600)

	err := s.ProcessEvent(context.Background(), txEvent)
	require.NoError(t, err)

	bagID := decodeBagIDHelper(t, bagIDHex)

	loc, found, err := p.LookupBag(bagID)
	require.NoError(t, err)
	require.True(t, found)
	require.Equal(t, "user-bucket10", loc.BucketName)
	require.Equal(t, "test-object", loc.ObjectName)

	h, err := p.LoadLastHeight()
	require.NoError(t, err)
	require.Equal(t, int64(29574600), h)
}

func TestProcessEvent_SkipsTxWithoutBagID(t *testing.T) {
	s, p := newTestSubscriber(t)

	txEvent := &greenfieldclient.TxEvent{
		Height: 100,
		TxHash: "TX100",
		Events: []greenfieldclient.ABCIEvent{
			{
				Type: "greenfield.storage.EventCreateObject",
				Attributes: map[string]string{
					"bucket_name": "some-bucket",
					"object_name": "some-object",
				},
			},
			{
				Type: "greenfield.storage.EventSetTag",
				Attributes: map[string]string{
					"resource": "grn:o::some-bucket/some-object",
					"tags":     `{"tags":[{"key":"onlineioEnv","value":"dev"}]}`,
				},
			},
		},
	}

	err := s.ProcessEvent(context.Background(), txEvent)
	require.NoError(t, err)

	// Height should not be persisted (no entries)
	h, err := p.LoadLastHeight()
	require.NoError(t, err)
	require.Equal(t, int64(0), h)
}

func TestProcessEvent_MultipleObjectsInOneTx(t *testing.T) {
	s, p := newTestSubscriber(t)

	bagID1Hex := "aa" + "00000000000000000000000000000000000000000000000000000000000000"
	bagID2Hex := "bb" + "00000000000000000000000000000000000000000000000000000000000000"

	txEvent := &greenfieldclient.TxEvent{
		Height: 200,
		TxHash: "TX200",
		Events: []greenfieldclient.ABCIEvent{
			{
				Type: "greenfield.storage.EventCreateObject",
				Attributes: map[string]string{
					"bucket_name": "bucket-1",
					"object_name": "obj-1",
				},
			},
			{
				Type: "greenfield.storage.EventSetTag",
				Attributes: map[string]string{
					"resource": "grn:o::bucket-1/obj-1",
					"tags":     `{"tags":[{"key":"ion-bag-id","value":"` + bagID1Hex + `"}]}`,
				},
			},
			{
				Type: "greenfield.storage.EventCreateObject",
				Attributes: map[string]string{
					"bucket_name": "bucket-2",
					"object_name": "obj-2",
				},
			},
			{
				Type: "greenfield.storage.EventSetTag",
				Attributes: map[string]string{
					"resource": "grn:o::bucket-2/obj-2",
					"tags":     `{"tags":[{"key":"ion-bag-id","value":"` + bagID2Hex + `"}]}`,
				},
			},
		},
	}

	err := s.ProcessEvent(context.Background(), txEvent)
	require.NoError(t, err)

	bagID1 := decodeBagIDHelper(t, bagID1Hex)
	loc1, found1, _ := p.LookupBag(bagID1)
	require.True(t, found1)
	require.Equal(t, "bucket-1", loc1.BucketName)

	bagID2 := decodeBagIDHelper(t, bagID2Hex)
	loc2, found2, _ := p.LookupBag(bagID2)
	require.True(t, found2)
	require.Equal(t, "bucket-2", loc2.BucketName)

	h, _ := p.LoadLastHeight()
	require.Equal(t, int64(200), h)
}

func TestProcessEvent_SkipsSetTagWithoutMatchingCreateObject(t *testing.T) {
	s, p := newTestSubscriber(t)

	bagIDHex := "cc5b3a4bd4775cc5f89b2f2c80ec8c699662b26c2ab475248d721ed381ab3423"
	txEvent := &greenfieldclient.TxEvent{
		Height: 300,
		TxHash: "TX300",
		Events: []greenfieldclient.ABCIEvent{
			{
				Type: "greenfield.storage.EventSetTag",
				Attributes: map[string]string{
					"resource": "grn:o::orphan-bucket/orphan-object",
					"tags":     `{"tags":[{"key":"ion-bag-id","value":"` + bagIDHex + `"}]}`,
				},
			},
		},
	}

	err := s.ProcessEvent(context.Background(), txEvent)
	require.NoError(t, err)

	bagID := decodeBagIDHelper(t, bagIDHex)
	_, found, _ := p.LookupBag(bagID)
	require.False(t, found, "SetTag without matching CreateObject should not index")
}

func TestDecodeBagID_Valid(t *testing.T) {
	hexStr := "bb5b3a4bd4775cc5f89b2f2c80ec8c699662b26c2ab475248d721ed381ab3423"
	bagID, err := decodeBagID(hexStr)
	require.NoError(t, err)
	require.Equal(t, hexStr, hex.EncodeToString(bagID[:]))
}

func TestDecodeBagID_InvalidHex(t *testing.T) {
	_, err := decodeBagID("zzz")
	require.Error(t, err)
}

func TestDecodeBagID_WrongLength(t *testing.T) {
	_, err := decodeBagID("aabb")
	require.Error(t, err)
}

func TestIsValidBucketName(t *testing.T) {
	require.True(t, isValidBucketName("my-bucket"))
	require.True(t, isValidBucketName("a"))
	require.True(t, isValidBucketName(strings.Repeat("x", maxBucketNameLen)))

	require.False(t, isValidBucketName(strings.Repeat("x", maxBucketNameLen+1)))
	require.False(t, isValidBucketName("bad\x00name"))
}

func TestIsValidObjectName(t *testing.T) {
	require.True(t, isValidObjectName("my-object.dat"))
	require.True(t, isValidObjectName(strings.Repeat("o", maxObjectNameLen)))

	require.False(t, isValidObjectName(strings.Repeat("o", maxObjectNameLen+1)))
	require.False(t, isValidObjectName("null\x00byte"))
}

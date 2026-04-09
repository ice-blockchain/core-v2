package cluster

import (
	"context"
	"log/slog"
	"os"
	"testing"

	dag "github.com/ipfs/boxo/ipld/merkledag"
	ipld "github.com/ipfs/go-ipld-format"
	"github.com/stretchr/testify/require"
)

func TestDAGServiceAddAndGetLocal(t *testing.T) {
	db := openTestDB(t)
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	svc := NewADNLDAGService(db, nil, logger)
	ctx := context.Background()

	original := dag.NodeWithData([]byte("test-crdt-operation"))

	err := svc.Add(ctx, original)
	require.NoError(t, err)

	retrieved, err := svc.Get(ctx, original.Cid())
	require.NoError(t, err)
	require.Equal(t, original.RawData(), retrieved.RawData())
}

func TestDAGServiceGetMissing(t *testing.T) {
	db := openTestDB(t)
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	svc := NewADNLDAGService(db, nil, logger)

	node := dag.NodeWithData([]byte("nonexistent"))
	_, err := svc.Get(context.Background(), node.Cid())
	require.Error(t, err)
}

func TestDAGServiceAddMany(t *testing.T) {
	db := openTestDB(t)
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	svc := NewADNLDAGService(db, nil, logger)
	ctx := context.Background()

	n1 := dag.NodeWithData([]byte("node-1"))
	n2 := dag.NodeWithData([]byte("node-2"))
	nodes := []ipld.Node{n1, n2}

	err := svc.AddMany(ctx, nodes)
	require.NoError(t, err)

	for _, n := range nodes {
		got, err := svc.Get(ctx, n.Cid())
		require.NoError(t, err)
		require.Equal(t, n.RawData(), got.RawData())
	}
}

func TestDAGServiceRemove(t *testing.T) {
	db := openTestDB(t)
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	svc := NewADNLDAGService(db, nil, logger)
	ctx := context.Background()

	node := dag.NodeWithData([]byte("to-remove"))
	require.NoError(t, svc.Add(ctx, node))
	require.NoError(t, svc.Remove(ctx, node.Cid()))

	_, err := svc.Get(ctx, node.Cid())
	require.Error(t, err)
}

func TestDAGServiceHandleGetBlock(t *testing.T) {
	db := openTestDB(t)
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	svc := NewADNLDAGService(db, nil, logger)

	node := dag.NodeWithData([]byte("handleable"))
	require.NoError(t, svc.Add(context.Background(), node))

	resp := svc.HandleGetBlock(node.Cid().Bytes())
	data, found, err := ParseBlockResponse(resp)
	require.NoError(t, err)
	require.True(t, found)
	require.Equal(t, node.RawData(), data)
}

func TestDAGServiceHandleGetBlockNotFound(t *testing.T) {
	db := openTestDB(t)
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	svc := NewADNLDAGService(db, nil, logger)

	node := dag.NodeWithData([]byte("missing"))
	resp := svc.HandleGetBlock(node.Cid().Bytes())
	_, found, err := ParseBlockResponse(resp)
	require.NoError(t, err)
	require.False(t, found)
}

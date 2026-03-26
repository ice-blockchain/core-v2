package greenfieldclient

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestBuildTxEventsFromBlock_CreateObjectAndSetTag(t *testing.T) {
	resp := buildTestBlockResponse(t)
	events, err := buildTxEventsFromBlock(29369006, resp)
	require.NoError(t, err)
	require.Len(t, events, 1)

	ev := events[0]
	require.Equal(t, int64(29369006), ev.Height)
	require.NotEmpty(t, ev.TxHash)
	require.Len(t, ev.Events, 1)

	createObj := ev.Events[0]
	require.Equal(t, eventTypeCreateObject, createObj.Type)
	require.Equal(t, "test-bucket", createObj.Attributes["bucket_name"])
	require.Equal(t, "test-object.json", createObj.Attributes["object_name"])
	require.Equal(t, "0xABC", createObj.Attributes["creator"])
	require.Equal(t, "application/json", createObj.Attributes["content_type"])
	require.Equal(t, "17", createObj.Attributes["payload_size"])
}

func TestBuildTxEventsFromBlock_IrrelevantMessagesFiltered(t *testing.T) {
	resp := &blockWithTxsResponse{
		Txs: []txObject{{
			Body: txBody{Messages: []json.RawMessage{
				json.RawMessage(`{"@type":"/cosmos.bank.v1beta1.MsgSend"}`),
			}},
		}},
		Block: blockInfo{Data: blockData{Txs: [][]byte{[]byte("raw-tx")}}},
	}

	events, err := buildTxEventsFromBlock(100, resp)
	require.NoError(t, err)
	require.Empty(t, events)
}

func TestBuildTxEventsFromBlock_EmptyBlock(t *testing.T) {
	resp := &blockWithTxsResponse{
		Block: blockInfo{Data: blockData{Txs: [][]byte{}}},
	}

	events, err := buildTxEventsFromBlock(100, resp)
	require.NoError(t, err)
	require.Empty(t, events)
}

func TestComputeTxHash(t *testing.T) {
	rawTx := []byte("test transaction bytes")
	hash := computeTxHash([][]byte{rawTx}, 0)
	require.Len(t, hash, 64)
	require.Regexp(t, `^[A-F0-9]{64}$`, hash)
}

func TestComputeTxHash_OutOfBounds(t *testing.T) {
	hash := computeTxHash([][]byte{}, 0)
	require.Empty(t, hash)
}

func buildTestBlockResponse(t *testing.T) *blockWithTxsResponse {
	t.Helper()

	createMsg := `{
		"@type": "/greenfield.storage.MsgCreateObject",
		"creator": "0xABC",
		"bucket_name": "test-bucket",
		"object_name": "test-object.json",
		"payload_size": "17",
		"content_type": "application/json"
	}`

	return &blockWithTxsResponse{
		Txs: []txObject{{
			Body: txBody{Messages: []json.RawMessage{
				json.RawMessage(createMsg),
			}},
		}},
		Block: blockInfo{
			Data: blockData{Txs: [][]byte{[]byte("raw-tx-bytes")}},
		},
	}
}

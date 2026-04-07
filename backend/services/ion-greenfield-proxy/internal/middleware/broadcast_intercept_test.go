package middleware

import (
	"testing"

	storageTypes "github.com/bnb-chain/greenfield/x/storage/types"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	"github.com/cosmos/gogoproto/proto"
	"github.com/stretchr/testify/require"
)

func mustAny(t *testing.T, msg proto.Message, typeURL string) *codectypes.Any {
	t.Helper()
	value, err := proto.Marshal(msg)
	require.NoError(t, err)
	return &codectypes.Any{TypeUrl: typeURL, Value: value}
}

func TestExtractUserBucketMsg_RecognisedTypes(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		typeURL string
		msg     proto.Message
		addr    string
		bucket  string
	}{
		{
			name:    "MsgCreateObject",
			typeURL: "/greenfield.storage.MsgCreateObject",
			msg:     &storageTypes.MsgCreateObject{Creator: "0xABC", BucketName: "abc"},
			addr:    "0xABC",
			bucket:  "abc",
		},
		{
			name:    "MsgDeleteObject",
			typeURL: "/greenfield.storage.MsgDeleteObject",
			msg:     &storageTypes.MsgDeleteObject{Operator: "0xDEF", BucketName: "def"},
			addr:    "0xDEF",
			bucket:  "def",
		},
		{
			name:    "MsgDeleteBucket",
			typeURL: "/greenfield.storage.MsgDeleteBucket",
			msg:     &storageTypes.MsgDeleteBucket{Operator: "0x123", BucketName: "mybucket"},
			addr:    "0x123",
			bucket:  "mybucket",
		},
		{
			name:    "MsgUpdateObjectContent",
			typeURL: "/greenfield.storage.MsgUpdateObjectContent",
			msg:     &storageTypes.MsgUpdateObjectContent{Operator: "0x456", BucketName: "b"},
			addr:    "0x456",
			bucket:  "b",
		},
		{
			name:    "MsgDelegateCreateObject",
			typeURL: "/greenfield.storage.MsgDelegateCreateObject",
			msg:     &storageTypes.MsgDelegateCreateObject{Creator: "0x789", BucketName: "c"},
			addr:    "0x789",
			bucket:  "c",
		},
	}

	for _, tt := range tests {
		a := mustAny(t, tt.msg, tt.typeURL)
		addr, bucket, ok := extractUserBucketMsg(a)
		require.True(t, ok, "expected recognized type for %s", tt.name)
		require.Equal(t, tt.addr, addr)
		require.Equal(t, tt.bucket, bucket)
	}
}

func TestExtractUserBucketMsg_RejectsUnrecognizedType(t *testing.T) {
	t.Parallel()

	a := &codectypes.Any{
		TypeUrl: "/cosmos.bank.v1beta1.MsgSend",
		Value:   []byte{1, 2, 3},
	}
	_, _, ok := extractUserBucketMsg(a)
	require.False(t, ok, "unrecognized type must return ok=false")
}

func TestExtractUserBucketMsg_RejectsCreateBucket(t *testing.T) {
	t.Parallel()

	// CreateBucket is handled by interceptCreateBucket, not fee allowance.
	a := mustAny(t, &storageTypes.MsgCreateBucket{
		Creator:    "0xABC",
		BucketName: "abc",
	}, "/greenfield.storage.MsgCreateBucket")
	_, _, ok := extractUserBucketMsg(a)
	require.False(t, ok, "MsgCreateBucket must not be recognized by fee allowance")
}

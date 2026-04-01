package greenfieldclient

import "encoding/json"

// blockWithTxsResponse maps the JSON from /cosmos/tx/v1beta1/txs/block/{height}.
type blockWithTxsResponse struct {
	Txs   []txObject `json:"txs"`
	Block blockInfo  `json:"block"`
}

type txObject struct {
	Body txBody `json:"body"`
}

type txBody struct {
	Messages []json.RawMessage `json:"messages"`
}

type blockInfo struct {
	Header blockHeader `json:"header"`
	Data   blockData   `json:"data"`
}

type blockHeader struct {
	Height string `json:"height"`
}

type blockData struct {
	Txs [][]byte `json:"txs"`
}

// latestBlockResponse maps the JSON from /cosmos/base/tendermint/v1beta1/blocks/latest.
type latestBlockResponse struct {
	Block blockInfo `json:"block"`
}

// txMessage is used to inspect the @type field of a message.
type txMessage struct {
	Type            string          `json:"@type"`
	BucketName      string          `json:"bucket_name"`
	ObjectName      string          `json:"object_name"`
	Creator         string          `json:"creator"`
	Operator        string          `json:"operator"`
	ContentType     string          `json:"content_type"`
	PayloadSize     string          `json:"payload_size"`
	ExpectChecksums []string        `json:"expect_checksums"`
	CreateAt        string          `json:"create_at"`
	Version         string          `json:"version"`
	Resource        string          `json:"resource"`
	Tags            *setTagsPayload `json:"tags"`
}

type setTagsPayload struct {
	Tags []TagEntry `json:"tags"`
}

package cluster

import "github.com/xssnick/tonutils-go/tl"

// CRDTHeadMsg is the TL type for CRDT head CID notifications.
type CRDTHeadMsg struct {
	Data []byte `tl:"bytes"`
}

// GetBlockMsg is the TL type for IPLD block fetch requests.
type GetBlockMsg struct {
	CID []byte `tl:"bytes"`
}

// BlockMsg is the TL type for IPLD block responses.
type BlockMsg struct {
	Data []byte `tl:"bytes"`
}

// BlockNotFoundMsg signals a missing block.
type BlockNotFoundMsg struct{}

// ForwardPieceRequestMsg is the TL type for piece forwarding requests.
type ForwardPieceRequestMsg struct {
	BagID   []byte `tl:"int256"`
	PieceID int32  `tl:"int"`
}

// PieceResponseMsg is the TL type for piece forwarding responses.
type PieceResponseMsg struct {
	Data  []byte `tl:"bytes"`
	Proof []byte `tl:"bytes"`
}

// PieceNotFoundMsg signals a missing piece.
type PieceNotFoundMsg struct{}

// ForwardRawQueryMsg forwards an entire raw storage query to the owning node.
type ForwardRawQueryMsg struct {
	BagID    []byte `tl:"int256"`
	RawQuery []byte `tl:"bytes"`
}

// ForwardRawResponseMsg wraps the raw response from a forwarded query.
type ForwardRawResponseMsg struct {
	Data []byte `tl:"bytes"`
}

// OwnerCheckMsg asks a peer who currently owns a bag in their local CRDT view.
type OwnerCheckMsg struct {
	BagID []byte `tl:"int256"`
}

// OwnerCheckResponseMsg returns the owner nodeID for a bag.
type OwnerCheckResponseMsg struct {
	Owner string `tl:"string"`
}

func init() {
	tl.Register(CRDTHeadMsg{}, "cluster.crdtHead data:bytes = cluster.CRDTHead")
	tl.Register(GetBlockMsg{}, "cluster.getBlock cid:bytes = cluster.Block")
	tl.Register(BlockMsg{}, "cluster.block data:bytes = cluster.Block")
	tl.Register(BlockNotFoundMsg{}, "cluster.blockNotFound = cluster.Block")
	tl.Register(ForwardPieceRequestMsg{}, "cluster.forwardPieceRequest bag_id:int256 piece_id:int = cluster.PieceResponse")
	tl.Register(PieceResponseMsg{}, "cluster.pieceResponse data:bytes proof:bytes = cluster.PieceResponse")
	tl.Register(PieceNotFoundMsg{}, "cluster.pieceNotFound = cluster.PieceResponse")
	tl.Register(ForwardRawQueryMsg{}, "cluster.forwardRawQuery bag_id:int256 raw_query:bytes = cluster.ForwardRawResponse")
	tl.Register(ForwardRawResponseMsg{}, "cluster.forwardRawResponse data:bytes = cluster.ForwardRawResponse")
	tl.Register(OwnerCheckMsg{}, "cluster.ownerCheck bag_id:int256 = cluster.OwnerCheckResponse")
	tl.Register(OwnerCheckResponseMsg{}, "cluster.ownerCheckResponse owner:string = cluster.OwnerCheckResponse")
}

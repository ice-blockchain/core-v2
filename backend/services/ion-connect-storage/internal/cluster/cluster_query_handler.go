package cluster

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/xssnick/tonutils-go/adnl/overlay"
	"github.com/xssnick/tonutils-go/tl"
)

func (t *ClusterTransport) handleClusterQuery(ctx context.Context, rawQuery []byte) ([]byte, error) {
	if len(rawQuery) < 4 {
		return nil, fmt.Errorf("cluster query too short")
	}

	var headMsg CRDTHeadMsg
	if _, err := tl.Parse(&headMsg, rawQuery, true); err == nil {
		t.broadcaster.HandleIncomingRaw(headMsg.Data)
		return tl.Serialize(BlockMsg{}, true)
	}

	var getBlock GetBlockMsg
	if _, err := tl.Parse(&getBlock, rawQuery, true); err == nil {
		blockResp := t.dagService.HandleGetBlock(getBlock.CID)
		data, found, parseErr := ParseBlockResponse(blockResp)
		if parseErr != nil || !found {
			return tl.Serialize(BlockMsg{Data: nil}, true)
		}
		return tl.Serialize(BlockMsg{Data: data}, true)
	}

	if resp := t.handleForwardedQuery(ctx, rawQuery); resp != nil {
		return resp, nil
	}

	return nil, fmt.Errorf("unknown cluster query")
}

func (t *ClusterTransport) handleForwardedQuery(ctx context.Context, rawQuery []byte) []byte {
	h := t.loadHandlers()

	var fwdRaw ForwardRawQueryMsg
	if _, err := tl.Parse(&fwdRaw, rawQuery, true); err == nil {
		return t.handleForwardRaw(ctx, h, fwdRaw)
	}

	var fwdReq ForwardPieceRequestMsg
	if _, err := tl.Parse(&fwdReq, rawQuery, true); err == nil {
		return t.handleForwardPiece(ctx, h, fwdReq)
	}

	var ownerCheck OwnerCheckMsg
	if _, err := tl.Parse(&ownerCheck, rawQuery, true); err == nil {
		return t.handleOwnerCheck(h, ownerCheck)
	}

	return nil
}

func (t *ClusterTransport) handleForwardRaw(ctx context.Context, h handlerBundle, fwdRaw ForwardRawQueryMsg) []byte {
	if h.rawQueryHandler == nil {
		resp, _ := tl.Serialize(ForwardRawResponseMsg{}, true)
		return resp
	}
	var bagID [32]byte
	copy(bagID[:], fwdRaw.BagID)
	if h.ownerChecker == nil || !h.ownerChecker.OwnsBag(bagID) {
		t.logger.Debug("rejected forwarded raw query for non-owned bag", "bag", bagID[:4])
		resp, _ := tl.Serialize(ForwardRawResponseMsg{}, true)
		return resp
	}
	data, qErr := h.rawQueryHandler(ctx, bagID, fwdRaw.RawQuery)
	if qErr != nil {
		resp, _ := tl.Serialize(ForwardRawResponseMsg{}, true)
		return resp
	}
	resp, _ := tl.Serialize(ForwardRawResponseMsg{Data: data}, true)
	return resp
}

func (t *ClusterTransport) handleForwardPiece(ctx context.Context, h handlerBundle, fwdReq ForwardPieceRequestMsg) []byte {
	if h.pieceHandler == nil {
		resp, _ := tl.Serialize(PieceNotFoundMsg{}, true)
		return resp
	}
	var bagID [32]byte
	copy(bagID[:], fwdReq.BagID)
	if h.ownerChecker == nil || !h.ownerChecker.OwnsBag(bagID) {
		t.logger.Debug("rejected forwarded piece request for non-owned bag", "bag", bagID[:4])
		resp, _ := tl.Serialize(PieceNotFoundMsg{}, true)
		return resp
	}
	data, proof, pErr := h.pieceHandler(ctx, bagID, int(fwdReq.PieceID))
	if pErr != nil {
		t.logger.Debug("forward piece handler error", "error", pErr)
		resp, _ := tl.Serialize(PieceNotFoundMsg{}, true)
		return resp
	}
	resp, _ := tl.Serialize(PieceResponseMsg{Data: data, Proof: proof}, true)
	return resp
}

func (t *ClusterTransport) handleOwnerCheck(h handlerBundle, ownerCheck OwnerCheckMsg) []byte {
	var bagID [32]byte
	copy(bagID[:], ownerCheck.BagID)
	owner := ""
	if h.ownerChecker != nil {
		owner = h.ownerChecker.Owner(bagID)
	}
	resp, _ := tl.Serialize(OwnerCheckResponseMsg{Owner: owner}, true)
	return resp
}

// ForwardPieceViaPeer sends a ForwardPieceRequest to a specific peer
// using RLDP over the cluster overlay.
func (t *ClusterTransport) ForwardPieceViaPeer(ctx context.Context, adnlAddr [32]byte, bagID [32]byte, pieceID int) ([]byte, []byte, error) {
	t.mu.RLock()
	defer t.mu.RUnlock()
	cp, ok := t.peers[adnlAddr]
	if !ok {
		return nil, nil, fmt.Errorf("peer %x not connected", adnlAddr[:4])
	}
	msg := ForwardPieceRequestMsg{BagID: bagID[:], PieceID: int32(pieceID)}
	var resp PieceResponseMsg
	err := cp.rldpWrapper.DoQuery(ctx, rldpMaxPieceAnswer, overlay.WrapQuery(t.overlayID, msg), &resp)
	if err != nil {
		return nil, nil, fmt.Errorf("forward piece query: %w", err)
	}
	if len(resp.Data) == 0 {
		return nil, nil, fmt.Errorf("piece not found on owner")
	}
	return resp.Data, resp.Proof, nil
}

const maxForwardQuerySize = 64 * 1024

// ForwardRawQuery forwards a raw storage query to the bag owner via the
// cluster overlay.
func (t *ClusterTransport) ForwardRawQuery(ctx context.Context, ownerADNLAddr [32]byte, bagID [32]byte, rawQuery []byte) ([]byte, error) {
	if len(rawQuery) > maxForwardQuerySize {
		return nil, fmt.Errorf("raw query too large: %d bytes (max %d)", len(rawQuery), maxForwardQuerySize)
	}
	t.mu.RLock()
	defer t.mu.RUnlock()
	cp, ok := t.peers[ownerADNLAddr]
	if !ok {
		return nil, fmt.Errorf("owner peer %x not connected", ownerADNLAddr[:4])
	}
	t.logger.Debug("forwarding raw query to owner", "owner", ownerADNLAddr[:4], "query_len", len(rawQuery))
	msg := ForwardRawQueryMsg{BagID: bagID[:], RawQuery: rawQuery}
	queryCtx, queryCancel := context.WithTimeout(ctx, 15*time.Second)
	defer queryCancel()
	var resp ForwardRawResponseMsg
	err := cp.adnlWrapper.Query(queryCtx, overlay.WrapQuery(t.overlayID, msg), &resp)
	if err != nil {
		t.logger.Debug("forward raw query failed", "error", err)
		return nil, fmt.Errorf("forward raw query: %w", err)
	}
	t.logger.Debug("forward raw query success", "resp_len", len(resp.Data))
	return resp.Data, nil
}

const ownerCheckTimeout = 5 * time.Second

// QueryPeerOwnership asks all connected cluster peers who they believe
// owns a bag.
func (t *ClusterTransport) QueryPeerOwnership(ctx context.Context, bagID [32]byte) []string {
	t.mu.RLock()
	peers := make([]*clusterPeer, 0, len(t.peers))
	for _, p := range t.peers {
		peers = append(peers, p)
	}
	t.mu.RUnlock()
	if len(peers) == 0 {
		return nil
	}
	qCtx, cancel := context.WithTimeout(ctx, ownerCheckTimeout)
	defer cancel()
	msg := OwnerCheckMsg{BagID: bagID[:]}
	var mu sync.Mutex
	var results []string
	var wg sync.WaitGroup
	for _, cp := range peers {
		wg.Add(1)
		go func(cp *clusterPeer) {
			defer wg.Done()
			var resp OwnerCheckResponseMsg
			if err := cp.adnlWrapper.Query(qCtx, overlay.WrapQuery(t.overlayID, msg), &resp); err != nil {
				return
			}
			mu.Lock()
			results = append(results, resp.Owner)
			mu.Unlock()
		}(cp)
	}
	wg.Wait()
	return results
}

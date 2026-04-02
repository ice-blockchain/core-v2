package boc

import (
	"crypto/sha256"
	"fmt"

	"github.com/xssnick/tonutils-go/tvm/cell"
)

// emptyHashCell is a leaf cell with 256 zero bits (matches tonutils-storage).
var emptyHashCell = cell.FromRawUnsafe(cell.RawUnsafeCell{
	BitsSz: 256,
	Data:   make([]byte, 32),
})

// BuildMerkleTree constructs a binary merkle tree of TVM cells over piece hashes.
// Pads to next power of 2 with zero-hash cells. Uses cell.FromRawUnsafe for
// exact compatibility with tonutils-storage.
func BuildMerkleTree(hashes [][32]byte) *cell.Cell {
	if len(hashes) == 0 {
		return cell.BeginCell().EndCell()
	}

	n := nextPowerOfTwo(len(hashes))
	nodes := make([]*cell.Cell, n)
	for i, h := range hashes {
		nodes[i] = cell.FromRawUnsafe(cell.RawUnsafeCell{BitsSz: 256, Data: h[:]})
	}
	for i := len(hashes); i < n; i++ {
		nodes[i] = emptyHashCell
	}

	return buildMerkleTreeRecursive(nodes)
}

func buildMerkleTreeRecursive(nodes []*cell.Cell) *cell.Cell {
	if len(nodes) == 1 {
		return nodes[0]
	}
	if len(nodes) == 2 {
		return cell.FromRawUnsafe(cell.RawUnsafeCell{Refs: []*cell.Cell{nodes[0], nodes[1]}})
	}
	mid := len(nodes) / 2
	left := buildMerkleTreeRecursive(nodes[:mid])
	right := buildMerkleTreeRecursive(nodes[mid:])
	return cell.FromRawUnsafe(cell.RawUnsafeCell{Refs: []*cell.Cell{left, right}})
}

// ComputePieceHashes computes SHA256 hashes for each piece of the given data.
func ComputePieceHashes(data []byte, pieceSize uint32) [][32]byte {
	count := (len(data) + int(pieceSize) - 1) / int(pieceSize)
	hashes := make([][32]byte, count)
	for i := range count {
		start := i * int(pieceSize)
		end := min(start+int(pieceSize), len(data))
		hashes[i] = sha256.Sum256(data[start:end])
	}
	return hashes
}

// GenerateMerkleProof builds a pruned merkle proof for the given leaf.
// The proof preserves the root cell hash: sibling subtrees are kept as-is,
// only the path from root to leaf is traversed.
// Returns the proof tree serialized as BoC bytes.
func GenerateMerkleProof(tree *cell.Cell, leafIndex int, totalLeaves int) ([]byte, error) {
	if totalLeaves <= 0 {
		return nil, fmt.Errorf("totalLeaves must be positive")
	}
	if leafIndex < 0 || leafIndex >= totalLeaves {
		return nil, fmt.Errorf("leafIndex %d out of range [0, %d)", leafIndex, totalLeaves)
	}
	n := nextPowerOfTwo(totalLeaves)
	proofCell, err := buildProofBranch(tree, leafIndex, n)
	if err != nil {
		return nil, fmt.Errorf("build proof branch: %w", err)
	}
	return proofCell.ToBOC(), nil
}

// buildProofBranch recursively constructs a proof tree.
// Keeps original sibling subtrees intact (preserving their hashes).
// Only descends into the branch containing the target leaf.
func buildProofBranch(node *cell.Cell, leafIndex int, treeSize int) (*cell.Cell, error) {
	if treeSize == 1 {
		return node, nil
	}

	slice := node.BeginParse()
	left, err := slice.LoadRefCell()
	if err != nil {
		return nil, fmt.Errorf("load left ref: %w", err)
	}
	right, err := slice.LoadRefCell()
	if err != nil {
		return nil, fmt.Errorf("load right ref: %w", err)
	}

	mid := treeSize / 2
	if leafIndex < mid {
		kept, err := buildProofBranch(left, leafIndex, mid)
		if err != nil {
			return nil, err
		}
		return cell.FromRawUnsafe(cell.RawUnsafeCell{
			Refs: []*cell.Cell{kept, right},
		}), nil
	}

	kept, err := buildProofBranch(right, leafIndex-mid, treeSize-mid)
	if err != nil {
		return nil, err
	}
	return cell.FromRawUnsafe(cell.RawUnsafeCell{
		Refs: []*cell.Cell{left, kept},
	}), nil
}

func nextPowerOfTwo(n int) int {
	p := 1
	for p < n {
		p <<= 1
	}
	return p
}

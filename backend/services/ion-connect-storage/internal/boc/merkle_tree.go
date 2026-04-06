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
	if pieceSize == 0 || len(data) == 0 {
		return nil
	}
	count := (len(data) + int(pieceSize) - 1) / int(pieceSize)
	hashes := make([][32]byte, count)
	for i := range count {
		start := i * int(pieceSize)
		end := min(start+int(pieceSize), len(data))
		hashes[i] = sha256.Sum256(data[start:end])
	}
	return hashes
}

// GenerateMerkleProof builds a TVM MerkleProof exotic cell for the given leaf.
// Uses cell.CreateProof with a ProofSkeleton that traces from root to the target leaf.
// The proof passes cell.CheckProof(proof, rootHash) verification.
// Returns the proof serialized as BoC bytes.
func GenerateMerkleProof(tree *cell.Cell, leafIndex int, totalLeaves int) ([]byte, error) {
	if totalLeaves <= 0 {
		return nil, fmt.Errorf("totalLeaves must be positive")
	}
	if leafIndex < 0 || leafIndex >= totalLeaves {
		return nil, fmt.Errorf("leafIndex %d out of range [0, %d)", leafIndex, totalLeaves)
	}
	n := nextPowerOfTwo(totalLeaves)
	skeleton := buildProofSkeleton(leafIndex, n)
	proofCell, err := tree.CreateProof(skeleton)
	if err != nil {
		return nil, fmt.Errorf("create proof: %w", err)
	}
	return proofCell.ToBOC(), nil
}

// buildProofSkeleton creates a ProofSkeleton tracing the path from root to leaf.
// At each internal node, it descends left (ref 0) or right (ref 1) and marks
// the leaf as recursive so its full data is included.
func buildProofSkeleton(leafIndex int, treeSize int) *cell.ProofSkeleton {
	sk := cell.CreateProofSkeleton()
	if treeSize <= 1 {
		sk.SetRecursive()
		return sk
	}

	mid := treeSize / 2
	if leafIndex < mid {
		child := buildProofSkeleton(leafIndex, mid)
		sk.AttachAt(0, child)
	} else {
		child := buildProofSkeleton(leafIndex-mid, treeSize-mid)
		sk.AttachAt(1, child)
	}
	return sk
}

const maxNextPowerOfTwo = 1 << 30 // ~1 billion

func nextPowerOfTwo(n int) int {
	if n <= 0 {
		return 1
	}
	if n > maxNextPowerOfTwo {
		return maxNextPowerOfTwo
	}
	p := 1
	for p < n {
		p <<= 1
	}
	return p
}

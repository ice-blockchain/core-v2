package boc_test

import (
	"crypto/sha256"
	"testing"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/stretchr/testify/require"
	"github.com/xssnick/tonutils-go/tvm/cell"
)

func TestBuildMerkleTreeSinglePiece(t *testing.T) {
	hash := sha256.Sum256([]byte("piece0"))
	tree := boc.BuildMerkleTree([][32]byte{hash})
	require.NotNil(t, tree)
	require.Equal(t, uint(256), tree.BitsSize())
}

func TestBuildMerkleTreePowerOfTwo(t *testing.T) {
	hashes := makeTestHashes(4)
	tree := boc.BuildMerkleTree(hashes)
	require.NotNil(t, tree)
	require.Equal(t, 32, len(tree.Hash()))
}

func TestBuildMerkleTreeNonPowerOfTwoPadsWithZero(t *testing.T) {
	hashes := makeTestHashes(3)
	tree := boc.BuildMerkleTree(hashes)

	hashes4 := make([][32]byte, 4)
	copy(hashes4, hashes)
	tree4 := boc.BuildMerkleTree(hashes4)
	require.Equal(t, tree.Hash(), tree4.Hash())
}

func TestBuildMerkleTreeEmpty(t *testing.T) {
	tree := boc.BuildMerkleTree(nil)
	require.NotNil(t, tree)
}

func TestComputePieceHashesPartialLastPiece(t *testing.T) {
	data := make([]byte, 100)
	for i := range data {
		data[i] = byte(i)
	}
	hashes := boc.ComputePieceHashes(data, 40)
	require.Equal(t, 3, len(hashes))

	expected0 := sha256.Sum256(data[:40])
	expected1 := sha256.Sum256(data[40:80])
	expected2 := sha256.Sum256(data[80:100])
	require.Equal(t, expected0, hashes[0])
	require.Equal(t, expected1, hashes[1])
	require.Equal(t, expected2, hashes[2])
}

func TestGenerateMerkleProofSinglePiece(t *testing.T) {
	hashes := makeTestHashes(1)
	tree := boc.BuildMerkleTree(hashes)

	proof, err := boc.GenerateMerkleProof(tree, 0, 1)
	require.NoError(t, err)
	require.NotEmpty(t, proof)

	proofCell, err := cell.FromBOC(proof)
	require.NoError(t, err)
	require.NoError(t, cell.CheckProof(proofCell, tree.Hash()))
}

func TestGenerateMerkleProofFourPieces(t *testing.T) {
	hashes := makeTestHashes(4)
	tree := boc.BuildMerkleTree(hashes)

	for i := range 4 {
		proof, err := boc.GenerateMerkleProof(tree, i, 4)
		require.NoError(t, err)

		proofCell, err := cell.FromBOC(proof)
		require.NoError(t, err)
		require.NoError(t, cell.CheckProof(proofCell, tree.Hash()), "piece %d", i)
	}
}

func TestGenerateMerkleProofEightPieces(t *testing.T) {
	hashes := makeTestHashes(8)
	tree := boc.BuildMerkleTree(hashes)

	for i := range 8 {
		proof, err := boc.GenerateMerkleProof(tree, i, 8)
		require.NoError(t, err)

		proofCell, err := cell.FromBOC(proof)
		require.NoError(t, err)
		require.NoError(t, cell.CheckProof(proofCell, tree.Hash()), "piece %d", i)
	}
}

func TestGenerateMerkleProofNonPowerOfTwo(t *testing.T) {
	hashes := makeTestHashes(33)
	tree := boc.BuildMerkleTree(hashes)

	for _, idx := range []int{0, 16, 32} {
		proof, err := boc.GenerateMerkleProof(tree, idx, 33)
		require.NoError(t, err)

		proofCell, err := cell.FromBOC(proof)
		require.NoError(t, err)
		require.NoError(t, cell.CheckProof(proofCell, tree.Hash()), "piece %d", idx)
	}
}

func TestGenerateMerkleProofOutOfRange(t *testing.T) {
	hashes := makeTestHashes(4)
	tree := boc.BuildMerkleTree(hashes)

	_, err := boc.GenerateMerkleProof(tree, -1, 4)
	require.Error(t, err)

	_, err = boc.GenerateMerkleProof(tree, 4, 4)
	require.Error(t, err)

	_, err = boc.GenerateMerkleProof(tree, 0, 0)
	require.Error(t, err)
}

func TestComputePieceHashesZeroPieceSize(t *testing.T) {
	result := boc.ComputePieceHashes([]byte("data"), 0)
	require.Nil(t, result)
}

func TestComputePieceHashesEmptyData(t *testing.T) {
	result := boc.ComputePieceHashes(nil, 1024)
	require.Nil(t, result)
}

func makeTestHashes(n int) [][32]byte {
	hashes := make([][32]byte, n)
	for i := range n {
		hashes[i] = sha256.Sum256([]byte{byte(i)})
	}
	return hashes
}

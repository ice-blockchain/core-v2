package storage

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestAppendTLBytesShort(t *testing.T) {
	data := make([]byte, 100)
	buf, err := appendTLBytes(nil, data)
	require.NoError(t, err)
	require.NotEmpty(t, buf)
	require.Equal(t, byte(100), buf[0])
}

func TestAppendTLBytesLong(t *testing.T) {
	data := make([]byte, 300)
	buf, err := appendTLBytes(nil, data)
	require.NoError(t, err)
	require.NotEmpty(t, buf)
	require.Equal(t, byte(254), buf[0])
}

func TestAppendTLBytesReturnsErrorOnOversize(t *testing.T) {
	data := make([]byte, 0xFFFFFF+1)
	_, err := appendTLBytes(nil, data)
	require.Error(t, err)
	require.Contains(t, err.Error(), "exceeds TL bytes maximum")
}

package storage

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestAppendTLBytesShort(t *testing.T) {
	data := make([]byte, 100)
	buf := appendTLBytes(nil, data)
	require.NotEmpty(t, buf)
	require.Equal(t, byte(100), buf[0])
}

func TestAppendTLBytesLong(t *testing.T) {
	data := make([]byte, 300)
	buf := appendTLBytes(nil, data)
	require.NotEmpty(t, buf)
	require.Equal(t, byte(254), buf[0])
}

func TestAppendTLBytesPanicsOnOversize(t *testing.T) {
	data := make([]byte, 0xFFFFFF+1)
	require.Panics(t, func() {
		appendTLBytes(nil, data)
	})
}

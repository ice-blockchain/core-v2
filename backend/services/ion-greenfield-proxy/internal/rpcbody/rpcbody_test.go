package rpcbody

import "testing"

func TestIsSyncBroadcast(t *testing.T) {
	t.Parallel()

	tests := []struct {
		method string
		want   bool
	}{
		{"broadcast_tx_sync", true},
		{"broadcast_tx_commit", true},
		{"broadcast_tx_async", false},
		{"abci_query", false},
		{"", false},
	}

	for _, tt := range tests {
		b := &Body{Method: tt.method}
		if got := b.IsSyncBroadcast(); got != tt.want {
			t.Errorf("IsSyncBroadcast(%q) = %v, want %v", tt.method, got, tt.want)
		}
	}
}

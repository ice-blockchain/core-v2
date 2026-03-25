package greenfieldclient

import (
	"fmt"

	"github.com/rs/zerolog"
)

// Config holds the configuration for the Greenfield client.
type Config struct {
	RpcURLs    []string
	ChainID    string
	PrivateKey string
	Logger     zerolog.Logger
}

// SenderTagKey returns the tag key used to identify the environment.
func SenderTagKey() string {
	return "onlineioEnv"
}

// DefaultQuery returns the default Tendermint query for the given environment.
func DefaultQuery(onlineIOEnv string) string {
	return fmt.Sprintf(
		"tm.event='Tx' AND greenfield.storage.EventSetTag.tags CONTAINS '%s'",
		onlineIOEnv,
	)
}

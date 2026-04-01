package greenfieldclient

import (
	"fmt"
	"regexp"
)

// ValidEnvPattern matches valid environment names: lowercase alphanumeric and hyphens.
var ValidEnvPattern = regexp.MustCompile(`^[a-z0-9-]+$`)

// Config holds the configuration for the Greenfield client.
type Config struct {
	RpcURLs    []string
	ChainID    string
	PrivateKey string
	Logger     Logger
}

// SenderTagKey returns the tag key used to identify the environment.
func SenderTagKey() string {
	return "onlineioEnv"
}

// DefaultQuery returns the default Tendermint query for the given environment.
// onlineIOEnv must contain only lowercase alphanumeric characters and hyphens.
func DefaultQuery(onlineIOEnv string) string {
	if !ValidEnvPattern.MatchString(onlineIOEnv) {
		panic(fmt.Sprintf("DefaultQuery: invalid onlineIOEnv %q", onlineIOEnv))
	}
	return fmt.Sprintf(
		"tm.event='Tx' AND greenfield.storage.EventSetTag.tags CONTAINS '%s'",
		onlineIOEnv,
	)
}

// BagIndexQuery returns a Tendermint subscription query that filters for
// transactions containing both the environment tag and an ion-bag-id tag.
func BagIndexQuery(onlineIOEnv string) string {
	if !ValidEnvPattern.MatchString(onlineIOEnv) {
		panic(fmt.Sprintf("BagIndexQuery: invalid onlineIOEnv %q", onlineIOEnv))
	}
	return fmt.Sprintf(
		"tm.event='Tx' AND greenfield.storage.EventSetTag.tags CONTAINS '%s' AND greenfield.storage.EventSetTag.tags CONTAINS 'ion-bag-id'",
		onlineIOEnv,
	)
}

package health

import (
	"net/http"

	"github.com/cockroachdb/pebble/v2"
	"github.com/gin-gonic/gin"
	greenfieldclient "github.com/ice-blockchain/ion/packages/greenfield-client"
	ionadnl "github.com/ice-blockchain/ion/services/ion-connect-storage/internal/adnl"
)

// ClusterChecker reports cluster health.
type ClusterChecker interface {
	IsConnected() bool
	ActiveNodeCount() int
}

// Deps holds dependencies for health check verification.
type Deps struct {
	GFClient       greenfieldclient.Client
	DB             *pebble.DB
	Server         *ionadnl.Server
	ClusterChecker ClusterChecker
}

// Status is the JSON response for GET /health-check.
type Status struct {
	Status     string            `json:"status"`
	Components map[string]string `json:"components"`
}

// RegisterRoutes adds health check routes to the given router.
func RegisterRoutes(router gin.IRouter, deps Deps) {
	router.GET("/health-check", makeHealthHandler(deps))
}

func makeHealthHandler(deps Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		status := Status{Components: make(map[string]string)}
		isHealthy := true

		if deps.GFClient.IsSubscribed() {
			status.Components["subscriber"] = "ok"
		} else {
			status.Components["subscriber"] = "not connected"
			isHealthy = false
		}

		if err := probePebbleDB(deps.DB); err != nil {
			status.Components["pebbledb"] = "unhealthy"
			isHealthy = false
		} else {
			status.Components["pebbledb"] = "ok"
		}

		if deps.Server.IsRunning() {
			status.Components["adnl"] = "ok"
		} else {
			status.Components["adnl"] = "not running"
			isHealthy = false
		}

		if deps.ClusterChecker.IsConnected() {
			status.Components["cluster_overlay"] = "ok"
		} else {
			status.Components["cluster_overlay"] = "not connected"
			isHealthy = false
		}

		if isHealthy {
			status.Status = "ok"
			c.JSON(http.StatusOK, status)
		} else {
			status.Status = "degraded"
			c.JSON(http.StatusServiceUnavailable, status)
		}
	}
}

func probePebbleDB(db *pebble.DB) error {
	_, closer, err := db.Get([]byte("idx/height"))
	if err == pebble.ErrNotFound {
		return nil
	}
	if err != nil {
		return err
	}
	closer.Close()
	return nil
}

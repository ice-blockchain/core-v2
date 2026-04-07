package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Health returns a simple liveness check.
//
//	@Summary	Health check
//	@Tags		Health
//	@Produce	json
//	@Success	200	{object}	map[string]bool	"ok: true"
//	@Router		/health-check [get]
func Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

package provider

import (
	"encoding/hex"
	"net/http"

	"github.com/gin-gonic/gin"
)

// RegisterRoutes adds provider index routes to the given router.
// If rateLimiter is non-nil it is applied as middleware on all routes.
func RegisterRoutes(router gin.IRouter, providerIndex *ProviderIndex, rateLimiter *PeerRateLimiter) {
	var handlers []gin.HandlerFunc
	if rateLimiter != nil {
		handlers = append(handlers, rateLimiter.Middleware())
	}
	handlers = append(handlers, handleLookupBag(providerIndex))
	router.GET("/bags/:bagId", handlers...)
}

func handleLookupBag(providerIndex *ProviderIndex) gin.HandlerFunc {
	return func(c *gin.Context) {
		bagIDHex := c.Param("bagId")
		bagID, err := parseBagIDHex(bagIDHex)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid bag ID"})
			return
		}

		records, err := providerIndex.Lookup(bagID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "lookup failed"})
			return
		}
		if len(records) == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "bag not found"})
			return
		}

		c.JSON(http.StatusOK, LookupResponse{
			BagID:     bagIDHex,
			Providers: records,
		})
	}
}

func parseBagIDHex(hexStr string) ([32]byte, error) {
	var bagID [32]byte
	b, err := hex.DecodeString(hexStr)
	if err != nil {
		return bagID, err
	}
	if len(b) != 32 {
		return bagID, hex.ErrLength
	}
	copy(bagID[:], b)
	return bagID, nil
}

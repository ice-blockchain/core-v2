package middleware

import "github.com/gin-gonic/gin"

func RateLimiter() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
	}
}

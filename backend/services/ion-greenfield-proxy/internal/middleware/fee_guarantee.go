package middleware

import "github.com/gin-gonic/gin"

func FeeGuarantee() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
	}
}

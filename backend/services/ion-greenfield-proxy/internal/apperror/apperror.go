package apperror

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AppError struct {
	StatusCode int    `json:"-"`
	Code       string `json:"code"`
	Message    string `json:"error"`
}

func (e *AppError) Error() string {
	return e.Message
}

func New(statusCode int, code string, message string) *AppError {
	return &AppError{
		StatusCode: statusCode,
		Code:       code,
		Message:    message,
	}
}

func WriteError(c *gin.Context, err error) {
	var appErr *AppError
	if errors.As(err, &appErr) {
		c.Error(err) // Log the error in Gin's context.
		c.JSON(appErr.StatusCode, appErr)
		c.Abort()
		return
	}
	c.JSON(http.StatusInternalServerError, &AppError{
		Code:    "INTERNAL_ERROR",
		Message: "internal server error",
	})
	c.Abort()
}

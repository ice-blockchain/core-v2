package adnl

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"github.com/xssnick/tonutils-go/adnl/rldp"
)

func TestRLDPPayloadTransfer(t *testing.T) {
	t.Parallel()

	if testing.Short() {
		t.Skip("skipping RLDP integration test in short mode")
	}

	gin.SetMode(gin.TestMode)
	engine := gin.New()
	engine.POST("/echo-sha256", echoSHA256Handler)

	env := startTestRLDPEnv(t, engine)

	var bodies sync.Map // hex(reqID) -> []byte

	env.Client.SetOnQuery(func(transferID []byte, query *rldp.Query) error {
		switch req := query.Data.(type) {
		case GetNextPayloadPart:
			reqID := hex.EncodeToString(req.ID)
			val, ok := bodies.Load(reqID)
			if !ok {
				return env.Client.SendAnswer(env.Ctx, query.MaxAnswerSize, query.Timeout,
					query.ID, transferID, &PayloadPart{IsLast: true})
			}
			chunk, isLast := PayloadChunk(val.([]byte), int(req.Seqno))
			return env.Client.SendAnswer(env.Ctx, query.MaxAnswerSize, query.Timeout,
				query.ID, transferID, &PayloadPart{Data: chunk, IsLast: isLast})
		}
		return nil
	})

	for _, tc := range []struct {
		name string
		size int
	}{
		{"1MB", 1 << 20},
		{"10MB", 10 << 20},
		{"100MB", 100 << 20},
	} {
		t.Run(tc.name, func(t *testing.T) {
			genStart := time.Now()
			payload := make([]byte, tc.size)
			_, err := rand.Read(payload)
			require.NoError(t, err)

			expectedSum := sha256.Sum256(payload)
			expectedHex := hex.EncodeToString(expectedSum[:])
			t.Logf("payload generation + sha256: %s", time.Since(genStart))

			reqID := make([]byte, 32)
			_, err = rand.Read(reqID)
			require.NoError(t, err)

			bodies.Store(hex.EncodeToString(reqID), payload)
			defer bodies.Delete(hex.EncodeToString(reqID))

			rldpStart := time.Now()
			var resp Response
			err = env.Client.DoQuery(env.Ctx, rldpMaxAnswerSize, Request{
				ID:      reqID,
				Method:  http.MethodPost,
				URL:     "/echo-sha256",
				Version: "HTTP/1.1",
				Headers: []Header{
					{Name: "Content-Type", Value: "application/octet-stream"},
					{Name: "Content-Length", Value: strconv.Itoa(tc.size)},
				},
			}, &resp)
			require.NoError(t, err)
			requestDone := time.Since(rldpStart)
			t.Logf("RLDP request round-trip (upload + server processing): %s", requestDone)
			require.EqualValues(t, http.StatusOK, resp.StatusCode)
			require.False(t, resp.NoPayload, "expected response body")

			fetchStart := time.Now()
			respBody := fetchRLDPResponseBody(t, env.Ctx, env.Client, reqID)
			t.Logf("RLDP response body fetch: %s", time.Since(fetchStart))

			var result struct {
				SHA256 string `json:"sha256"`
				Size   int    `json:"size"`
			}
			require.NoError(t, json.Unmarshal(respBody, &result))

			totalElapsed := time.Since(rldpStart)
			throughput := float64(tc.size) / totalElapsed.Seconds() / (1 << 20)
			t.Logf("total: %s | throughput: %.1f MB/s | sent %d bytes, server received %d bytes",
				totalElapsed, throughput, tc.size, result.Size)
			require.Equal(t, tc.size, result.Size)
			require.Equal(t, expectedHex, result.SHA256)
		})
	}
}

func echoSHA256Handler(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	sum := sha256.Sum256(body)
	c.JSON(http.StatusOK, gin.H{
		"sha256": hex.EncodeToString(sum[:]),
		"size":   len(body),
	})
}

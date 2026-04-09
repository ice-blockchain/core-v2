// Package adnl provides shared TL type definitions for the ADNL/RLDP protocol layer.
package adnl

import "github.com/xssnick/tonutils-go/tl"

// HTTP-over-RLDP protocol types following the TON standard TL schema.
// These are not provided by tonutils-go and must be registered manually.

// Request represents an HTTP request tunneled over RLDP.
type Request struct {
	ID      []byte   `tl:"int256"`
	Method  string   `tl:"string"`
	URL     string   `tl:"string"`
	Version string   `tl:"string"`
	Headers []Header `tl:"vector struct"`
}

// Response represents an HTTP response tunneled over RLDP.
type Response struct {
	Version    string   `tl:"string"`
	StatusCode int32    `tl:"int"`
	Reason     string   `tl:"string"`
	Headers    []Header `tl:"vector struct"`
	NoPayload  bool     `tl:"bool"`
}

// Header is an HTTP header key-value pair.
type Header struct {
	Name  string `tl:"string"`
	Value string `tl:"string"`
}

// GetNextPayloadPart requests a chunk of the response body.
type GetNextPayloadPart struct {
	ID           []byte `tl:"int256"`
	Seqno        int32  `tl:"int"`
	MaxChunkSize int32  `tl:"int"`
}

// PayloadPart is a chunk of response body data.
type PayloadPart struct {
	Data    []byte   `tl:"bytes"`
	Trailer []Header `tl:"vector struct"`
	IsLast  bool     `tl:"bool"`
}

// GetCapabilities is the ADNL capability negotiation request.
type GetCapabilities struct{}

// Capabilities is the ADNL capability negotiation response.
type Capabilities struct {
	Value int64 `tl:"long"`
}

// CapabilityRLDP2 is the capability flag for RLDP v2 support.
const CapabilityRLDP2 int64 = 2

func init() {
	tl.Register(Request{}, "http.request id:int256 method:string url:string http_version:string headers:(vector http.header) = http.Response")
	tl.Register(Response{}, "http.response http_version:string status_code:int reason:string headers:(vector http.header) no_payload:Bool = http.Response")
	tl.Register(Header{}, "http.header name:string value:string = http.Header")
	tl.Register(GetNextPayloadPart{}, "http.getNextPayloadPart id:int256 seqno:int max_chunk_size:int = http.PayloadPart")
	tl.Register(PayloadPart{}, "http.payloadPart data:bytes trailer:(vector http.header) last:Bool = http.PayloadPart")
	tl.Register(GetCapabilities{}, "http.proxy.getCapabilities = http.proxy.Capabilities")
	tl.Register(Capabilities{}, "http.proxy.capabilities capabilities:long = http.proxy.Capabilities")
}

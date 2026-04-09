package adnl

// Re-export HTTP-over-RLDP TL types from the shared adnl package.
// The canonical definitions live in packages/adnl; this file provides
// package-local aliases so existing code within this package compiles unchanged.

import tladnl "github.com/ice-blockchain/ion/packages/adnl"

type Request = tladnl.Request
type Response = tladnl.Response
type Header = tladnl.Header
type GetNextPayloadPart = tladnl.GetNextPayloadPart
type PayloadPart = tladnl.PayloadPart
type GetCapabilities = tladnl.GetCapabilities
type Capabilities = tladnl.Capabilities

const capabilityRLDP2 = tladnl.CapabilityRLDP2

# pulse-transport

WebTransport server over QUIC, ADNL-to-WebTransport bridge for TON network peers, and HTTP/1.1 fallback for clients without WebTransport support.

## Crate

`pulse-transport` -- `shared/pulse/transport/`

## Dependencies

- `wtransport` 0.4 -- WebTransport server (QUIC)
- `everscale-network` -- ADNL protocol (TON/Everscale)
- `hyper` 1.x -- HTTP/1.1 fallback
- `tokio` -- async runtime

## API

```rust
pub struct WebTransportServer { .. }
impl WebTransportServer {
    pub fn new(config: WebTransportConfig, conn_manager: Arc<ConnectionManager>) -> Self;
    pub async fn serve(&self) -> Result<(), TransportError>;
    pub fn shutdown(&self);
}

pub struct AdnlBridge { .. }
impl AdnlBridge {
    pub fn new(config: AdnlBridgeConfig) -> Self;
    pub async fn serve(&self) -> Result<(), AdnlBridgeError>;
}

pub struct HttpFallbackServer { .. }
impl HttpFallbackServer {
    pub fn new(config: HttpFallbackConfig, conn_manager: Arc<ConnectionManager>) -> Self;
    pub async fn serve(&self) -> Result<(), HttpError>;
}

pub struct ConnectionManager { .. }
impl ConnectionManager {
    pub async fn register(&self, tenant_id: String, remote_addr: String) -> ConnectionId;
    pub async fn unregister(&self, id: ConnectionId);
    pub async fn count(&self) -> usize;
    pub async fn count_for_tenant(&self, tenant_id: &str) -> usize;
}
```

## Config Defaults

| Setting | Default |
|---------|---------|
| WebTransport bind | `127.0.0.1:4433` |
| ADNL listen | `127.0.0.1:4430` |
| ADNL relay target | `127.0.0.1:4433` |
| HTTP fallback bind | `127.0.0.1:8080` |
| Max connections | 100,000 |
| Max body bytes | 1 MB |

## Files

| File | Purpose |
|------|---------|
| `src/webtransport_server.rs` | QUIC/WebTransport accept loop |
| `src/adnl_bridge.rs` | ADNL-to-WebTransport bridge for TON peers |
| `src/http_fallback.rs` | HTTP/1.1 long-polling for Safari |
| `src/connection_manager.rs` | Connection tracking, per-tenant counts |

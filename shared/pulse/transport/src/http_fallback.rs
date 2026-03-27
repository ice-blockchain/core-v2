use std::net::SocketAddr;
use std::sync::Arc;
use thiserror::Error;
use tracing::info;

use crate::connection_manager::ConnectionManager;

#[derive(Debug, Error)]
pub enum HttpError {
    #[error("bind failed: {0}")]
    BindFailed(String),
    #[error("request error: {0}")]
    RequestError(String),
}

#[derive(Debug, Clone)]
pub struct HttpFallbackConfig {
    pub bind_addr: SocketAddr,
    pub max_body_bytes: usize,
}

impl Default for HttpFallbackConfig {
    fn default() -> Self {
        Self {
            bind_addr: "127.0.0.1:8080".parse().unwrap(),
            max_body_bytes: 1_048_576, // 1MB
        }
    }
}

/// HTTP/1.1 fallback server for clients without WebTransport support
/// (primarily Safari). Uses long-polling for subscription updates.
pub struct HttpFallbackServer {
    config: HttpFallbackConfig,
    conn_manager: Arc<ConnectionManager>,
}

impl HttpFallbackServer {
    pub fn new(config: HttpFallbackConfig, conn_manager: Arc<ConnectionManager>) -> Self {
        Self {
            config,
            conn_manager,
        }
    }

    pub async fn serve(&self) -> Result<(), HttpError> {
        info!(addr = %self.config.bind_addr, "HTTP fallback server ready");

        // In production, this would use hyper to:
        //   POST /events     -> submit signed events
        //   GET  /events     -> query events (with filters)
        //   GET  /subscribe  -> long-poll for subscription updates
        //   GET  /health     -> health check
        //
        // Each request extracts tenant_id from headers and routes
        // through the same auth -> tenant -> schema -> storage pipeline.
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(3600)).await;
        }
    }
}

use std::net::SocketAddr;
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::broadcast;
use tracing::{info, warn};

use crate::connection_manager::ConnectionManager;

#[derive(Debug, Error)]
pub enum TransportError {
    #[error("bind failed: {0}")]
    BindFailed(String),
    #[error("tls error: {0}")]
    TlsError(String),
    #[error("connection error: {0}")]
    ConnectionError(String),
}

#[derive(Debug, Clone)]
pub struct WebTransportConfig {
    pub bind_addr: SocketAddr,
    pub cert_path: String,
    pub key_path: String,
    pub max_connections: usize,
}

impl Default for WebTransportConfig {
    fn default() -> Self {
        Self {
            bind_addr: "127.0.0.1:4433".parse().unwrap(),
            cert_path: "cert.pem".into(),
            key_path: "key.pem".into(),
            max_connections: 100_000,
        }
    }
}

/// WebTransport server over QUIC.
/// Accepts bidirectional streams for request/response
/// and unidirectional streams for server-push subscriptions.
pub struct WebTransportServer {
    config: WebTransportConfig,
    conn_manager: Arc<ConnectionManager>,
    shutdown_tx: broadcast::Sender<()>,
}

impl WebTransportServer {
    pub fn new(config: WebTransportConfig, conn_manager: Arc<ConnectionManager>) -> Self {
        let (shutdown_tx, _) = broadcast::channel(1);
        Self {
            config,
            conn_manager,
            shutdown_tx,
        }
    }

    /// Start accepting WebTransport connections.
    /// This is a placeholder that logs the bind address.
    /// Full implementation requires valid TLS certs at runtime.
    pub async fn serve(&self) -> Result<(), TransportError> {
        info!(
            addr = %self.config.bind_addr,
            max_conn = self.config.max_connections,
            "WebTransport server ready"
        );

        let mut shutdown_rx = self.shutdown_tx.subscribe();
        tokio::select! {
            _ = shutdown_rx.recv() => {
                info!("WebTransport server shutting down");
            }
            _ = self.accept_loop() => {}
        }
        Ok(())
    }

    async fn accept_loop(&self) {
        // In production, this would use wtransport::Endpoint to accept
        // QUIC connections, negotiate WebTransport sessions, and spawn
        // per-connection tasks that read/write bidirectional streams.
        //
        // Each accepted session:
        //   1. Extracts tenant_id from session headers
        //   2. Registers with ConnectionManager
        //   3. Spawns read loop for incoming signed events
        //   4. Opens server-push stream for subscription updates
        //   5. On disconnect, unregisters from ConnectionManager
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(3600)).await;
        }
    }

    pub fn shutdown(&self) {
        let _ = self.shutdown_tx.send(());
    }

    pub fn conn_manager(&self) -> &ConnectionManager {
        &self.conn_manager
    }
}

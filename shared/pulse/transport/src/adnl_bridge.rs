use std::net::SocketAddr;
use thiserror::Error;
use tracing::info;

#[derive(Debug, Error)]
pub enum AdnlBridgeError {
    #[error("bind failed: {0}")]
    BindFailed(String),
    #[error("connection error: {0}")]
    ConnectionError(String),
    #[error("protocol error: {0}")]
    ProtocolError(String),
}

#[derive(Debug, Clone)]
pub struct AdnlBridgeConfig {
    pub listen_addr: SocketAddr,
    pub relay_target_addr: SocketAddr,
}

impl Default for AdnlBridgeConfig {
    fn default() -> Self {
        Self {
            listen_addr: "127.0.0.1:4430".parse().unwrap(),
            relay_target_addr: "127.0.0.1:4433".parse().unwrap(),
        }
    }
}

/// ADNL-to-WebTransport bridge.
///
/// Accepts ADNL datagrams (UDP) from TON network peers and
/// forwards them as WebTransport streams to the relay server.
/// Provides the bridge between TON's native ADNL transport
/// and the relay's QUIC-based WebTransport.
///
/// In production, this would use the `everscale-network` crate
/// to handle ADNL protocol specifics:
///   - ADNL handshake (key exchange via x25519)
///   - ADNL datagram framing
///   - Peer identity verification
///
/// The bridge runs as a separate task and:
///   1. Listens for incoming ADNL connections
///   2. Extracts the signed event payload from ADNL datagrams
///   3. Opens a WebTransport bidirectional stream to the relay
///   4. Forwards the payload and returns the relay's response
///   5. For subscriptions, maintains a persistent ADNL session
///      and pushes relay events back over ADNL
pub struct AdnlBridge {
    config: AdnlBridgeConfig,
}

impl AdnlBridge {
    pub fn new(config: AdnlBridgeConfig) -> Self {
        Self { config }
    }

    pub async fn serve(&self) -> Result<(), AdnlBridgeError> {
        info!(
            listen = %self.config.listen_addr,
            target = %self.config.relay_target_addr,
            "ADNL bridge ready"
        );

        // In production, this would:
        //   1. Create an everscale_network::adnl::AdnlNode
        //   2. Bind to listen_addr for incoming ADNL connections
        //   3. For each connection:
        //      a. Complete ADNL handshake
        //      b. Read datagrams containing signed events
        //      c. Forward to relay_target_addr via WebTransport
        //      d. Return response over ADNL
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(3600)).await;
        }
    }

    pub fn config(&self) -> &AdnlBridgeConfig {
        &self.config
    }
}

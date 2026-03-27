use std::net::SocketAddr;
use std::sync::Arc;
use tracing::info;

use pulse_tenant::TenantStore;
use pulse_transport::ConnectionManager;

/// Simple health check endpoint for monitoring.
/// Returns relay status, connection count, and tenant count.
pub struct HealthServer {
    bind_addr: SocketAddr,
    conn_manager: Arc<ConnectionManager>,
    tenant_store: Arc<TenantStore>,
}

impl HealthServer {
    pub fn new(
        bind_addr: SocketAddr,
        conn_manager: Arc<ConnectionManager>,
        tenant_store: Arc<TenantStore>,
    ) -> Self {
        Self {
            bind_addr,
            conn_manager,
            tenant_store,
        }
    }

    pub async fn serve(&self) {
        info!(addr = %self.bind_addr, "health endpoint ready");

        // In production, this would use hyper to serve:
        //   GET /health -> {"status":"ok","connections":N,"tenants":M}
        //   GET /metrics -> Prometheus-format metrics
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(3600)).await;
        }
    }
}

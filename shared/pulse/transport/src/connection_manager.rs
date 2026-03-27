use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};

pub type ConnectionId = u64;

#[derive(Debug, Clone)]
pub struct ConnectionInfo {
    pub id: ConnectionId,
    pub tenant_id: String,
    pub remote_addr: String,
    pub connected_at: u64,
}

pub struct ConnectionManager {
    connections: Arc<RwLock<HashMap<ConnectionId, ConnectionInfo>>>,
    next_id: AtomicU64,
    event_tx: broadcast::Sender<ConnectionEvent>,
}

#[derive(Debug, Clone)]
pub enum ConnectionEvent {
    Connected(ConnectionId),
    Disconnected(ConnectionId),
}

impl ConnectionManager {
    pub fn new() -> Self {
        let (event_tx, _) = broadcast::channel(1024);
        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
            next_id: AtomicU64::new(1),
            event_tx,
        }
    }

    pub async fn register(
        &self,
        tenant_id: String,
        remote_addr: String,
    ) -> ConnectionId {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);
        let info = ConnectionInfo {
            id,
            tenant_id,
            remote_addr,
            connected_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        };
        self.connections.write().await.insert(id, info);
        let _ = self.event_tx.send(ConnectionEvent::Connected(id));
        id
    }

    pub async fn unregister(&self, id: ConnectionId) {
        self.connections.write().await.remove(&id);
        let _ = self.event_tx.send(ConnectionEvent::Disconnected(id));
    }

    pub async fn count(&self) -> usize {
        self.connections.read().await.len()
    }

    pub async fn count_for_tenant(&self, tenant_id: &str) -> usize {
        self.connections
            .read()
            .await
            .values()
            .filter(|c| c.tenant_id == tenant_id)
            .count()
    }

    pub fn subscribe(&self) -> broadcast::Receiver<ConnectionEvent> {
        self.event_tx.subscribe()
    }
}

impl Default for ConnectionManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn register_and_unregister() {
        let mgr = ConnectionManager::new();
        let id = mgr.register("tenant1".into(), "127.0.0.1".into()).await;
        assert_eq!(mgr.count().await, 1);
        assert_eq!(mgr.count_for_tenant("tenant1").await, 1);

        mgr.unregister(id).await;
        assert_eq!(mgr.count().await, 0);
    }
}

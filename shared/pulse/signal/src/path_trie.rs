use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};

pub type SubscriptionId = u64;

#[derive(Debug, Clone)]
pub struct SignalEvent {
    pub path: String,
    pub payload: Vec<u8>,
}

struct TrieNode {
    subscribers: HashMap<SubscriptionId, broadcast::Sender<SignalEvent>>,
    children: HashMap<String, TrieNode>,
    wildcard: HashMap<SubscriptionId, broadcast::Sender<SignalEvent>>,
    deep_wildcard: HashMap<SubscriptionId, broadcast::Sender<SignalEvent>>,
}

impl TrieNode {
    fn new() -> Self {
        Self {
            subscribers: HashMap::new(),
            children: HashMap::new(),
            wildcard: HashMap::new(),
            deep_wildcard: HashMap::new(),
        }
    }
}

/// Path-trie based subscription engine.
///
/// Paths use `/` as separator. Supports:
/// - Exact match: `users/alice/posts`
/// - Single-level wildcard `*`: `users/*/posts`
/// - Deep wildcard `**`: `users/alice/**`
pub struct SignalHub {
    root: Arc<RwLock<TrieNode>>,
    next_id: AtomicU64,
    channel_capacity: usize,
}

impl SignalHub {
    pub fn new(channel_capacity: usize) -> Self {
        Self {
            root: Arc::new(RwLock::new(TrieNode::new())),
            next_id: AtomicU64::new(1),
            channel_capacity,
        }
    }

    pub async fn subscribe(
        &self,
        pattern: &str,
    ) -> (SubscriptionId, broadcast::Receiver<SignalEvent>) {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);
        let (tx, rx) = broadcast::channel(self.channel_capacity);
        let segments: Vec<&str> = pattern.split('/').collect();

        let mut root = self.root.write().await;
        Self::insert_subscription(&mut root, &segments, 0, id, tx);

        (id, rx)
    }

    fn insert_subscription(
        node: &mut TrieNode,
        segments: &[&str],
        depth: usize,
        id: SubscriptionId,
        tx: broadcast::Sender<SignalEvent>,
    ) {
        if depth >= segments.len() {
            node.subscribers.insert(id, tx);
            return;
        }

        match segments[depth] {
            "*" => {
                node.wildcard.insert(id, tx);
            }
            "**" => {
                node.deep_wildcard.insert(id, tx);
            }
            segment => {
                let child = node
                    .children
                    .entry(segment.to_string())
                    .or_insert_with(TrieNode::new);
                Self::insert_subscription(child, segments, depth + 1, id, tx);
            }
        }
    }

    pub async fn unsubscribe(&self, pattern: &str, id: SubscriptionId) {
        let segments: Vec<&str> = pattern.split('/').collect();
        let mut root = self.root.write().await;
        Self::remove_subscription(&mut root, &segments, 0, id);
    }

    fn remove_subscription(
        node: &mut TrieNode,
        segments: &[&str],
        depth: usize,
        id: SubscriptionId,
    ) {
        if depth >= segments.len() {
            node.subscribers.remove(&id);
            return;
        }

        match segments[depth] {
            "*" => {
                node.wildcard.remove(&id);
            }
            "**" => {
                node.deep_wildcard.remove(&id);
            }
            segment => {
                if let Some(child) = node.children.get_mut(segment) {
                    Self::remove_subscription(child, segments, depth + 1, id);
                }
            }
        }
    }

    pub async fn emit(&self, path: &str, payload: Vec<u8>) -> usize {
        let event = SignalEvent {
            path: path.to_string(),
            payload,
        };
        let segments: Vec<&str> = path.split('/').collect();
        let root = self.root.read().await;
        Self::emit_to_node(&root, &segments, 0, &event)
    }

    fn emit_to_node(
        node: &TrieNode,
        segments: &[&str],
        depth: usize,
        event: &SignalEvent,
    ) -> usize {
        let mut count = 0;

        for tx in node.deep_wildcard.values() {
            if tx.send(event.clone()).is_ok() {
                count += 1;
            }
        }

        if depth >= segments.len() {
            for tx in node.subscribers.values() {
                if tx.send(event.clone()).is_ok() {
                    count += 1;
                }
            }
            return count;
        }

        for tx in node.wildcard.values() {
            if tx.send(event.clone()).is_ok() {
                count += 1;
            }
        }

        if let Some(child) = node.children.get(segments[depth]) {
            count += Self::emit_to_node(child, segments, depth + 1, event);
        }

        count
    }

    pub async fn subscriber_count(&self) -> usize {
        let root = self.root.read().await;
        Self::count_subscriptions(&root)
    }

    fn count_subscriptions(node: &TrieNode) -> usize {
        let mut count = node.subscribers.len()
            + node.wildcard.len()
            + node.deep_wildcard.len();
        for child in node.children.values() {
            count += Self::count_subscriptions(child);
        }
        count
    }
}

impl Default for SignalHub {
    fn default() -> Self {
        Self::new(1024)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn exact_match_subscription() {
        let hub = SignalHub::new(16);
        let (id, mut rx) = hub.subscribe("users/alice/posts").await;

        let sent = hub.emit("users/alice/posts", b"new post".to_vec()).await;
        assert_eq!(sent, 1);

        let event = rx.recv().await.unwrap();
        assert_eq!(event.path, "users/alice/posts");

        let sent = hub.emit("users/bob/posts", b"other".to_vec()).await;
        assert_eq!(sent, 0);

        hub.unsubscribe("users/alice/posts", id).await;
    }

    #[tokio::test]
    async fn wildcard_subscription() {
        let hub = SignalHub::new(16);
        let (_id, mut rx) = hub.subscribe("users/*").await;

        hub.emit("users/alice", b"a".to_vec()).await;
        hub.emit("users/bob", b"b".to_vec()).await;

        let e1 = rx.recv().await.unwrap();
        let e2 = rx.recv().await.unwrap();
        assert_eq!(e1.path, "users/alice");
        assert_eq!(e2.path, "users/bob");
    }

    #[tokio::test]
    async fn deep_wildcard_subscription() {
        let hub = SignalHub::new(16);
        let (_id, mut rx) = hub.subscribe("users/**").await;

        hub.emit("users/alice/posts", b"deep".to_vec()).await;
        let event = rx.recv().await.unwrap();
        assert_eq!(event.path, "users/alice/posts");
    }
}

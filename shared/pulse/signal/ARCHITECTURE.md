# pulse-signal

Path trie-based subscription engine for real-time event notifications. Supports exact match, single-level wildcard (`*`), and deep wildcard (`**`).

## Crate

`pulse-signal` -- `shared/pulse/signal/`

## Dependencies

- `tokio` (broadcast channels)
- `pulse-types`

## API

```rust
pub struct SignalHub { .. }
impl SignalHub {
    pub fn new(channel_capacity: usize) -> Self;
    pub async fn subscribe(&self, pattern: &str) -> (SubscriptionId, broadcast::Receiver<SignalEvent>);
    pub async fn unsubscribe(&self, pattern: &str, id: SubscriptionId);
    pub async fn emit(&self, path: &str, payload: Vec<u8>) -> usize;
    pub async fn subscriber_count(&self) -> usize;
}
```

## Pattern Matching

| Pattern | Matches |
|---------|---------|
| `users/alice/posts` | Exact path only |
| `users/*` | Any single segment: `users/alice`, `users/bob` |
| `users/**` | Any depth: `users/alice`, `users/alice/posts/123` |

## Implementation

Trie structure with nodes for each path segment. Each node contains:
- `subscribers` -- exact match callbacks
- `wildcard` -- single-level `*` callbacks
- `deep_wildcard` -- deep `**` callbacks
- `children` -- child segment nodes

Emit traverses the trie, firing all matching subscribers.

## Config Defaults

| Setting | Default |
|---------|---------|
| `channel_capacity` | 1,024 |

## Files

| File | Purpose |
|------|---------|
| `src/path_trie.rs` | SignalHub, TrieNode, subscribe/emit/unsubscribe |

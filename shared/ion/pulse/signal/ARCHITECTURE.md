# Pulse Signal

Real-time pub/sub subscription manager. Notifies listeners when graph data changes.

## Dependencies
- None (pure TypeScript)

## API Surface
- `createPulseSignal()` -- create a subscription manager
  - `pulseSubscribe(path, callback)` -- register listener for a graph path
  - `pulseUnsubscribe(path, callback)` -- remove listener
  - `pulseNotify(path, node)` -- fire callbacks for matching paths
  - `pulseSubscribePattern(pattern, callback)` -- wildcard subscriptions

## Design Decisions
- Map of `path -> Set<callback>` for O(1) lookup
- Wildcard support: `users/*` matches all user paths
- Fires after Pulse Sync merge completes and data is persisted

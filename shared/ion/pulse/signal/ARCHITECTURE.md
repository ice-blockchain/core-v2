# Pulse Signal

## Purpose
Real-time pub/sub subscription manager with wildcard path matching.

## API
- `createPulseSignal(config?)` -- create signal instance
- `subscribe(path, callback)` -- returns unsubscribe function
- `notify(soul, data)` -- fire callbacks for matching paths
- `getSubscriberCount(path)` -- listener count
- `destroy()` -- clear all subscriptions

## Wildcard Support
- `users/*` matches `users/abc`, `users/xyz`
- Exact paths match only their soul

## Dependencies
None (pure TypeScript).

## Status
Fully implemented.

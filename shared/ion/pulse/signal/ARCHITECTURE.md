# Pulse Signal

Subscription manager for real-time change notifications with path-based routing.

## API

| Export | Type | Description |
|---|---|---|
| `createPulseSignal` | function | Creates a signal hub for subscribing to graph path changes |
| `PulseSignal` | type | Signal instance with on/off/emit operations |
| `SignalCallback` | type | Callback invoked when a matching path changes |
| `SignalPath` | type | Dot-separated path string with optional wildcards |

## Dependencies

None. Pure TypeScript with no external dependencies.

## Design Decisions

- Three matching modes -- exact match (`users.alice`), single-level wildcard (`users.*`), and deep wildcard (`users.**`) cover all subscription patterns
- Map<path, Set<callback>> -- subscriptions indexed by path for O(1) exact lookups; wildcard paths are checked via linear scan of registered patterns
- Synchronous emission -- callbacks fire synchronously on emit to guarantee ordering; long-running subscribers should defer work
- No replay or buffering -- signals are fire-and-forget; late subscribers miss prior events (use Sync for catch-up)

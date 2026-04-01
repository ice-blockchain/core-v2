# @ion/ion-connect-proxy Architecture

## Purpose
Manages the ION Connect proxy lifecycle and provides a `Transport` implementation for routing HTTP traffic through the proxy. Enables the app to access `.ton`, `.adnl`, and `.bag` domains.

## Data Structures
- `IonConnectProxyConfig` — TON lite client global config (liteservers, DHT nodes)
- `StartIonConnectProxyOptions` — `{ port, config? }`

## API Surface
| Export | Description |
|--------|-------------|
| `startIonConnectProxy(options)` | Start proxy on `127.0.0.1:port`, returns `"OK"` |
| `stopIonConnectProxy()` | Stop the running proxy |
| `createIonConnectProxyTransport({ port })` | Returns `Transport` from `@ion/network` that routes through the proxy |

## Dependencies
- `@ion/network` — `Transport` interface (type-only at runtime)
- `tonutils-proxy` Go library — XCFramework (iOS) / .so (Android) providing `StartProxy`, `StopProxy`, `StartProxyWithConfig` C functions

## Native Implementation
- **iOS**: Swift (`IonConnectProxyImpl.swift`) calls Go C functions on background `DispatchQueue`, uses `URLSession` with `connectionProxyDictionary` for HTTP bridge
- **Android**: Kotlin (`IonConnectProxyModule.kt`) calls Go via JNI (`IonConnectProxyJNI.cpp`) on background threads, uses OkHttp with `Proxy.Type.HTTP` for HTTP bridge

## Design Decisions
| Decision | Rationale |
|----------|-----------|
| Standard TurboModule (not Nitro) | Simpler for a small API surface; RN 0.84 supports both |
| Transport injection into `@ion/network` | All HTTP goes through `createHttpClient`, no separate HTTP client |
| JNI for Go lifecycle, OkHttp/URLSession for HTTP bridge | Go C functions require native bridge; HTTP proxy routing needs platform-specific proxy config |
| arm64-v8a only (Android) | Sufficient for dev + real devices; more ABIs can be added later |

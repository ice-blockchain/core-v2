# @ion/ton-storage Architecture

## Purpose
Manages the TON Storage daemon lifecycle and provides a client for the `tonutils-storage` HTTP REST API. Enables the app to download, seed, and manage TON Storage bags (collections of files distributed via the TON DHT network).

## Data Structures
- `BagInfo` — Summary of a bag: ID, size, progress, status, peers, speeds
- `BagDetails` — Full bag info including files, piece size, active peers
- `AddBagRequest` — Request to start downloading a bag: `{ bagId, downloadPath, files?, upload? }`
- `StorageManagerConfig` — Manager configuration: `{ apiPort?, dbPath, globalConfigJSON?, providers... }`
- `StorageManagerContext` — Internal shared state for lifecycle orchestration

## API Surface

### High-level (recommended)

| Export | Description |
|--------|-------------|
| `createStorageManager(config)` | Resilient daemon orchestrator with auto-reconnection, health checks, and status callbacks |


`StorageManager` interface:
- `start()` / `stop()` — lifecycle control
- `getStatus()` / `onStatusChange(handler)` — status: `idle | connecting | connected | reconnecting | disconnected`
- `createClient()` — `TonStorageClient` bound to the daemon's HTTP API
- `dispose()` — cleanup all subscriptions and timers

### Low-level

| Export | Description |
|--------|-------------|
| `createTonStorageClient(httpClient)` | Wraps the `tonutils-storage` REST API with typed methods |


`TonStorageClient` interface:
- `addBag(request)` — Start downloading a bag
- `removeBag(bagId, deleteFiles?)` — Remove a bag, optionally delete files
- `stopBag(bagId)` — Stop download/upload for a bag
- `getBagDetails(bagId)` — Get full bag info with files and peers
- `listBags()` — List all bags with status
- `getFilePath(bagId, fileIndex)` — Construct local file path

## Dependencies
- `@ion/network` — `HttpClient` interface, `createHttpClient` factory, `ConnectionStateMachine`
- `@ion/platform` — `AppStateProvider` for foreground/background detection
- `@ion/diagnostics` — `Logger` for structured logging
- `tonutils-storage` Go library — XCFramework (iOS) / .so (Android) providing `StartStorage`, `StopStorage`, `CheckStorage` C functions

## Native Implementation
- **iOS**: Swift (`TonStorageImpl.swift`) calls Go C functions on background `DispatchQueue`, uses `NWConnection` TCP health check
- **Android**: Kotlin (`TonStorageModule.kt`) calls Go via JNI (`TonStorageJNI.cpp`) for lifecycle, uses `java.net.Socket` for health check

The native layer is intentionally thin — only start/stop/check. All storage operations go through the daemon's HTTP REST API via `TonStorageClient`.

## Building the Native Library

Source: [xssnick/tonutils-storage](https://github.com/xssnick/tonutils-storage)

The Go library exports three C functions via CGO:

```c
char* StartStorage(unsigned short apiPort, char* dbPath, char* globalConfigJSON);
char* StopStorage(void);
char* CheckStorage(void);
```

### Prerequisites

- Go 1.21+
- Xcode Command Line Tools (iOS)
- Android NDK r25+ (Android)

### iOS — XCFramework

```bash
git clone https://github.com/xssnick/tonutils-storage.git
cd tonutils-storage

# iOS device (arm64)
CGO_ENABLED=1 GOOS=ios GOARCH=arm64 \
  CC=$(xcrun --sdk iphoneos --find clang) \
  CGO_CFLAGS="-isysroot $(xcrun --sdk iphoneos --show-sdk-path) -arch arm64 -miphoneos-version-min=15.1" \
  CGO_LDFLAGS="-isysroot $(xcrun --sdk iphoneos --show-sdk-path) -arch arm64 -miphoneos-version-min=15.1" \
  go build -buildmode=c-archive -o build/ios-arm64/libtonutils-storage.a .

# iOS simulator (arm64 + x86_64)
CGO_ENABLED=1 GOOS=ios GOARCH=arm64 \
  CC=$(xcrun --sdk iphonesimulator --find clang) \
  CGO_CFLAGS="-isysroot $(xcrun --sdk iphonesimulator --show-sdk-path) -arch arm64 -mios-simulator-version-min=15.1" \
  CGO_LDFLAGS="-isysroot $(xcrun --sdk iphonesimulator --show-sdk-path) -arch arm64 -mios-simulator-version-min=15.1" \
  go build -buildmode=c-archive -o build/sim-arm64/libtonutils-storage.a .

CGO_ENABLED=1 GOOS=ios GOARCH=amd64 \
  CC=$(xcrun --sdk iphonesimulator --find clang) \
  CGO_CFLAGS="-isysroot $(xcrun --sdk iphonesimulator --show-sdk-path) -arch x86_64 -mios-simulator-version-min=15.1" \
  CGO_LDFLAGS="-isysroot $(xcrun --sdk iphonesimulator --show-sdk-path) -arch x86_64 -mios-simulator-version-min=15.1" \
  go build -buildmode=c-archive -o build/sim-x86_64/libtonutils-storage.a .

lipo -create build/sim-arm64/libtonutils-storage.a build/sim-x86_64/libtonutils-storage.a \
  -output build/ios-arm64_x86_64-simulator/libtonutils-storage.a

xcodebuild -create-xcframework \
  -library build/ios-arm64/libtonutils-storage.a -headers build/ios-arm64/ \
  -library build/ios-arm64_x86_64-simulator/libtonutils-storage.a -headers build/sim-arm64/ \
  -output ios/tonutils-storage.xcframework
```

### Android — Shared Library

```bash
export ANDROID_NDK_HOME=/path/to/ndk

CGO_ENABLED=1 GOOS=android GOARCH=arm64 \
  CC=$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/darwin-x86_64/bin/aarch64-linux-android24-clang \
  go build -buildmode=c-shared -o android/src/main/jniLibs/arm64-v8a/libtonutils-storage.so .
```

### After Rebuilding

1. Replace the artifacts in `packages/ton-storage/ios/` or `android/src/main/jniLibs/`
2. iOS: run `pnpm pods` to re-integrate the xcframework
3. Android: Gradle picks up the new `.so` automatically on next build

## Daemon Hardening

The `StorageManager` handles four failure scenarios:


| Scenario | Detection | Recovery |
|----------|-----------|----------|
| WiFi/cellular switch | `NetworkStateProvider.onNetworkInterfaceChange()` | Stop + restart daemon |
| iOS backgrounding | `AppStateProvider.onStateChange('active')` after background | Health check, restart if unhealthy |
| Daemon crash | Periodic TCP health check (30s) or request failure | Stop + restart with exponential backoff |
| Goes offline | `NetworkStateProvider.onStateChange(false)` | Mark disconnected, restart when online |

Both providers are injected via DI. The `checkStorage()` native method performs a TCP connection to `127.0.0.1:apiPort` with 2s timeout. A shared `isRestarting` flag prevents concurrent restart races.

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Thin native bridge (start/stop/check only) | `tonutils-storage` has a built-in HTTP REST API — no need for custom C exports per operation |
| HTTP client for storage operations | All bag management goes through `http://127.0.0.1:apiPort/api/v1/*`, enabling easy testing and decoupling |
| Same lifecycle pattern as `@ion/ion-connect-proxy` | Consistent resilience behavior across all native daemons |
| arm64-v8a only (Android) | Sufficient for dev + real devices; more ABIs can be added later |

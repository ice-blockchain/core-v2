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
| `createIonConnectProxyClient({ baseUrl })` | Returns `HttpClient` from `@ion/network` that routes through the proxy |

## Dependencies
- `@ion/network` — `Transport` and `HttpClient` interfaces, `createHttpClient` factory
- `tonutils-proxy` Go library — XCFramework (iOS) / .so (Android) providing `StartProxy`, `StopProxy`, `StartProxyWithConfig` C functions

## Native Implementation
- **iOS**: Swift (`IonConnectProxyImpl.swift`) calls Go C functions on background `DispatchQueue`, uses `NWConnection` raw TCP sockets for HTTP bridge
- **Android**: Kotlin (`IonConnectProxyModule.kt`) calls Go via JNI (`IonConnectProxyJNI.cpp`) for lifecycle, uses raw `java.net.Socket` TCP for HTTP bridge

## Building the Native Library

Source: [ice-blockchain/Tonutils-Proxy](https://github.com/ice-blockchain/Tonutils-Proxy)

The Go library exports three C functions via CGO:

```c
char* StartProxy(unsigned short port);
char* StartProxyWithConfig(unsigned short port, char* configTextJSON);
char* StopProxy(void);
```

### Prerequisites

- Go 1.21+
- Xcode Command Line Tools (iOS)
- Android NDK r25+ (Android)

### iOS — XCFramework

Build a static library for each target, then bundle into an xcframework:

```bash
# Clone the source
git clone https://github.com/ice-blockchain/Tonutils-Proxy.git
cd Tonutils-Proxy

# iOS device (arm64)
CGO_ENABLED=1 GOOS=ios GOARCH=arm64 \
  CC=$(xcrun --sdk iphoneos --find clang) \
  CGO_CFLAGS="-isysroot $(xcrun --sdk iphoneos --show-sdk-path) -arch arm64 -miphoneos-version-min=15.1" \
  CGO_LDFLAGS="-isysroot $(xcrun --sdk iphoneos --show-sdk-path) -arch arm64 -miphoneos-version-min=15.1" \
  go build -buildmode=c-archive -o build/ios-arm64/libtonutils-proxy.a .

# iOS simulator (arm64 + x86_64) — build each arch, then lipo
CGO_ENABLED=1 GOOS=ios GOARCH=arm64 \
  CC=$(xcrun --sdk iphonesimulator --find clang) \
  CGO_CFLAGS="-isysroot $(xcrun --sdk iphonesimulator --show-sdk-path) -arch arm64 -mios-simulator-version-min=15.1" \
  CGO_LDFLAGS="-isysroot $(xcrun --sdk iphonesimulator --show-sdk-path) -arch arm64 -mios-simulator-version-min=15.1" \
  go build -buildmode=c-archive -o build/sim-arm64/libtonutils-proxy.a .

CGO_ENABLED=1 GOOS=ios GOARCH=amd64 \
  CC=$(xcrun --sdk iphonesimulator --find clang) \
  CGO_CFLAGS="-isysroot $(xcrun --sdk iphonesimulator --show-sdk-path) -arch x86_64 -mios-simulator-version-min=15.1" \
  CGO_LDFLAGS="-isysroot $(xcrun --sdk iphonesimulator --show-sdk-path) -arch x86_64 -mios-simulator-version-min=15.1" \
  go build -buildmode=c-archive -o build/sim-x86_64/libtonutils-proxy.a .

lipo -create build/sim-arm64/libtonutils-proxy.a build/sim-x86_64/libtonutils-proxy.a \
  -output build/ios-arm64_x86_64-simulator/libtonutils-proxy.a

# Bundle into xcframework
xcodebuild -create-xcframework \
  -library build/ios-arm64/libtonutils-proxy.a -headers build/ios-arm64/ \
  -library build/ios-arm64_x86_64-simulator/libtonutils-proxy.a -headers build/sim-arm64/ \
  -output ios/tonutils-proxy.xcframework
```

Copy the resulting `tonutils-proxy.xcframework` into `packages/ion-connect-proxy/ios/`.

### Android — Shared Library

Cross-compile with the NDK toolchain:

```bash
export ANDROID_NDK_HOME=/path/to/ndk

# arm64-v8a (currently the only supported ABI)
CGO_ENABLED=1 GOOS=android GOARCH=arm64 \
  CC=$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/darwin-x86_64/bin/aarch64-linux-android24-clang \
  go build -buildmode=c-shared -o android/src/main/jniLibs/arm64-v8a/libtonutils-proxy.so .
```

The `.so` is loaded at runtime by JNI (`IonConnectProxyJNI.cpp`) and linked via `CMakeLists.txt`.

### After Rebuilding

1. Replace the artifacts in `packages/ion-connect-proxy/ios/` or `android/src/main/jniLibs/`
2. iOS: run `pnpm pods` to re-integrate the xcframework
3. Android: Gradle picks up the new `.so` automatically on next build

## Design Decisions
| Decision | Rationale |
|----------|-----------|
| Standard TurboModule (not Nitro) | Simpler for a small API surface; RN 0.84 supports both |
| Transport injection into `@ion/network` | All HTTP goes through `createHttpClient`, no separate HTTP client |
| JNI for Go lifecycle, raw TCP sockets for HTTP bridge | Go C functions require native bridge; raw TCP to `127.0.0.1:port` avoids platform HTTP client proxy limitations |
| arm64-v8a only (Android) | Sufficient for dev + real devices; more ABIs can be added later |

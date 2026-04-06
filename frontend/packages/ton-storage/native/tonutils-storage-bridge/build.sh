#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PKG_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"
CLEAN_HEADER="$SCRIPT_DIR/tonutils-storage-export.h"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo "=== Building tonutils-storage-bridge ==="

# ── iOS device (arm64) ──
echo "[1/4] iOS device (arm64)..."
mkdir -p "$BUILD_DIR/ios-arm64/Headers"
CGO_ENABLED=1 GOOS=ios GOARCH=arm64 \
  CC="$(xcrun --sdk iphoneos --find clang)" \
  CGO_CFLAGS="-isysroot $(xcrun --sdk iphoneos --show-sdk-path) -arch arm64 -miphoneos-version-min=15.1" \
  CGO_LDFLAGS="-isysroot $(xcrun --sdk iphoneos --show-sdk-path) -arch arm64 -miphoneos-version-min=15.1" \
  go build -buildmode=c-archive -o "$BUILD_DIR/ios-arm64/libtonutils-storage.a" .
cp "$CLEAN_HEADER" "$BUILD_DIR/ios-arm64/Headers/"

# ── iOS simulator (arm64) ──
echo "[2/4] iOS simulator (arm64)..."
mkdir -p "$BUILD_DIR/sim-arm64"
CGO_ENABLED=1 GOOS=ios GOARCH=arm64 \
  CC="$(xcrun --sdk iphonesimulator --find clang)" \
  CGO_CFLAGS="-isysroot $(xcrun --sdk iphonesimulator --show-sdk-path) -arch arm64 -mios-simulator-version-min=15.1 -target arm64-apple-ios15.1-simulator" \
  CGO_LDFLAGS="-isysroot $(xcrun --sdk iphonesimulator --show-sdk-path) -arch arm64 -mios-simulator-version-min=15.1 -target arm64-apple-ios15.1-simulator" \
  go build -buildmode=c-archive -o "$BUILD_DIR/sim-arm64/libtonutils-storage.a" .

# ── iOS simulator (x86_64) ──
echo "[3/4] iOS simulator (x86_64)..."
mkdir -p "$BUILD_DIR/sim-x86_64"
CGO_ENABLED=1 GOOS=ios GOARCH=amd64 \
  CC="$(xcrun --sdk iphonesimulator --find clang)" \
  CGO_CFLAGS="-isysroot $(xcrun --sdk iphonesimulator --show-sdk-path) -arch x86_64 -mios-simulator-version-min=15.1 -target x86_64-apple-ios15.1-simulator" \
  CGO_LDFLAGS="-isysroot $(xcrun --sdk iphonesimulator --show-sdk-path) -arch x86_64 -mios-simulator-version-min=15.1 -target x86_64-apple-ios15.1-simulator" \
  go build -buildmode=c-archive -o "$BUILD_DIR/sim-x86_64/libtonutils-storage.a" .

# ── Combine simulator slices ──
echo "Combining simulator slices..."
mkdir -p "$BUILD_DIR/sim-combined/Headers"
lipo -create \
  "$BUILD_DIR/sim-arm64/libtonutils-storage.a" \
  "$BUILD_DIR/sim-x86_64/libtonutils-storage.a" \
  -output "$BUILD_DIR/sim-combined/libtonutils-storage.a"
cp "$CLEAN_HEADER" "$BUILD_DIR/sim-combined/Headers/"

# ── Create XCFramework ──
echo "[4/4] Creating XCFramework..."
rm -rf "$PKG_DIR/ios/tonutils-storage.xcframework"
xcodebuild -create-xcframework \
  -library "$BUILD_DIR/ios-arm64/libtonutils-storage.a" -headers "$BUILD_DIR/ios-arm64/Headers" \
  -library "$BUILD_DIR/sim-combined/libtonutils-storage.a" -headers "$BUILD_DIR/sim-combined/Headers" \
  -output "$PKG_DIR/ios/tonutils-storage.xcframework"

echo ""
echo "=== iOS XCFramework built ==="
echo "  $PKG_DIR/ios/tonutils-storage.xcframework"
echo ""

# ── Android (arm64-v8a) — only if NDK is available ──
if [ -n "${ANDROID_NDK_HOME:-}" ] && [ -d "$ANDROID_NDK_HOME" ]; then
  echo "[Android] Building arm64-v8a..."
  ANDROID_OUT="$PKG_DIR/android/src/main/jniLibs/arm64-v8a"
  mkdir -p "$ANDROID_OUT"
  CGO_ENABLED=1 GOOS=android GOARCH=arm64 \
    CC="$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/darwin-x86_64/bin/aarch64-linux-android24-clang" \
    go build -buildmode=c-shared -o "$ANDROID_OUT/libtonutils-storage.so" .
  echo "  $ANDROID_OUT/libtonutils-storage.so"
else
  echo "[Android] Skipped — ANDROID_NDK_HOME not set"
fi

echo ""
echo "=== Build complete ==="

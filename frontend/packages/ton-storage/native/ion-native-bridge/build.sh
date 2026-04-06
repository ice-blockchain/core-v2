#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"
CLEAN_HEADER="$SCRIPT_DIR/ion-native-bridge-export.h"
LIB_NAME="ion-native-bridge"

# Output locations — both packages share one xcframework
PROXY_IOS_DIR="$FRONTEND_DIR/packages/ion-connect-proxy/ios"
STORAGE_IOS_DIR="$FRONTEND_DIR/packages/ton-storage/ios"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

cd "$SCRIPT_DIR"

echo "=== Building ion-native-bridge (proxy + storage combined) ==="

# ── iOS device (arm64) ──
echo "[1/4] iOS device (arm64)..."
mkdir -p "$BUILD_DIR/ios-arm64/Headers"
CGO_ENABLED=1 GOOS=ios GOARCH=arm64 \
  CC="$(xcrun --sdk iphoneos --find clang)" \
  CGO_CFLAGS="-isysroot $(xcrun --sdk iphoneos --show-sdk-path) -arch arm64 -miphoneos-version-min=15.1" \
  CGO_LDFLAGS="-isysroot $(xcrun --sdk iphoneos --show-sdk-path) -arch arm64 -miphoneos-version-min=15.1" \
  go build -buildmode=c-archive -o "$BUILD_DIR/ios-arm64/lib${LIB_NAME}.a" .
cp "$CLEAN_HEADER" "$BUILD_DIR/ios-arm64/Headers/"

# ── iOS simulator (arm64) ──
echo "[2/4] iOS simulator (arm64)..."
mkdir -p "$BUILD_DIR/sim-arm64"
CGO_ENABLED=1 GOOS=ios GOARCH=arm64 \
  CC="$(xcrun --sdk iphonesimulator --find clang)" \
  CGO_CFLAGS="-isysroot $(xcrun --sdk iphonesimulator --show-sdk-path) -arch arm64 -mios-simulator-version-min=15.1 -target arm64-apple-ios15.1-simulator" \
  CGO_LDFLAGS="-isysroot $(xcrun --sdk iphonesimulator --show-sdk-path) -arch arm64 -mios-simulator-version-min=15.1 -target arm64-apple-ios15.1-simulator" \
  go build -buildmode=c-archive -o "$BUILD_DIR/sim-arm64/lib${LIB_NAME}.a" .

# ── iOS simulator (x86_64) ──
echo "[3/4] iOS simulator (x86_64)..."
mkdir -p "$BUILD_DIR/sim-x86_64"
CGO_ENABLED=1 GOOS=ios GOARCH=amd64 \
  CC="$(xcrun --sdk iphonesimulator --find clang)" \
  CGO_CFLAGS="-isysroot $(xcrun --sdk iphonesimulator --show-sdk-path) -arch x86_64 -mios-simulator-version-min=15.1 -target x86_64-apple-ios15.1-simulator" \
  CGO_LDFLAGS="-isysroot $(xcrun --sdk iphonesimulator --show-sdk-path) -arch x86_64 -mios-simulator-version-min=15.1 -target x86_64-apple-ios15.1-simulator" \
  go build -buildmode=c-archive -o "$BUILD_DIR/sim-x86_64/lib${LIB_NAME}.a" .

# ── Combine simulator slices ──
echo "Combining simulator slices..."
mkdir -p "$BUILD_DIR/sim-combined/Headers"
lipo -create \
  "$BUILD_DIR/sim-arm64/lib${LIB_NAME}.a" \
  "$BUILD_DIR/sim-x86_64/lib${LIB_NAME}.a" \
  -output "$BUILD_DIR/sim-combined/lib${LIB_NAME}.a"
cp "$CLEAN_HEADER" "$BUILD_DIR/sim-combined/Headers/"

# ── Create XCFramework ──
echo "[4/4] Creating XCFramework..."
XCFW_PATH="$BUILD_DIR/${LIB_NAME}.xcframework"
xcodebuild -create-xcframework \
  -library "$BUILD_DIR/ios-arm64/lib${LIB_NAME}.a" -headers "$BUILD_DIR/ios-arm64/Headers" \
  -library "$BUILD_DIR/sim-combined/lib${LIB_NAME}.a" -headers "$BUILD_DIR/sim-combined/Headers" \
  -output "$XCFW_PATH"

# ── Deploy to both packages ──
echo "Deploying to ion-connect-proxy..."
rm -rf "$PROXY_IOS_DIR/tonutils-proxy.xcframework"
cp -R "$XCFW_PATH" "$PROXY_IOS_DIR/tonutils-proxy.xcframework"

echo "Deploying to ton-storage..."
rm -rf "$STORAGE_IOS_DIR/tonutils-storage.xcframework"
cp -R "$XCFW_PATH" "$STORAGE_IOS_DIR/tonutils-storage.xcframework"

echo ""
echo "=== Build complete ==="
echo "  Proxy:   $PROXY_IOS_DIR/tonutils-proxy.xcframework"
echo "  Storage: $STORAGE_IOS_DIR/tonutils-storage.xcframework"

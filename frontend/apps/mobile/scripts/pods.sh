#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$ROOT_DIR/ios"

cd "$ROOT_DIR"

# Keep local tools honest: mixed Ruby runtimes are a common source of flaky pod installs.
if [[ -f "$ROOT_DIR/.tool-versions" ]]; then
  expected_ruby="$(awk '$1 == "ruby" { print $2; exit }' "$ROOT_DIR/.tool-versions" || true)"
  if [[ -n "${expected_ruby:-}" ]]; then
    current_ruby="$(ruby -e 'print RUBY_VERSION')"
    if [[ "$current_ruby" != "$expected_ruby" ]]; then
      cat <<EOF
warning: Active Ruby is $current_ruby, but $ROOT_DIR/.tool-versions pins $expected_ruby.
warning: This mismatch can make bundler/cocoapods behavior inconsistent.
EOF
    fi
  fi
fi

# Podfile resolves scripts and podspecs from node_modules.
if [[ ! -f "$ROOT_DIR/node_modules/react-native/scripts/react_native_pods.rb" ]]; then
  cat <<EOF
error: React Native dependencies are missing in apps/mobile/node_modules.
hint: run 'pnpm install' from the monorepo root, then retry 'pnpm pods'.
EOF
  exit 1
fi

if ! bundle check >/dev/null 2>&1; then
  echo "Installing missing Ruby gems..."
  bundle install
fi

export COCOAPODS_DISABLE_STATS=1

echo "Running CocoaPods install..."
if ! bundle exec pod install --project-directory="$IOS_DIR"; then
  echo "pod install failed; retrying with spec repo update..."
  bundle exec pod install --repo-update --project-directory="$IOS_DIR"
fi

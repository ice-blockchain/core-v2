#!/usr/bin/env bash
set -euo pipefail

ENV="${1:?Usage: setup-env.sh <staging|testnet|production>}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS_DIR="${REPO_ROOT}/.secrets"

if [[ ! -d "${SECRETS_DIR}" ]]; then
  echo "error: .secrets/ directory not found at ${SECRETS_DIR}" >&2
  echo "Clone the core-v2-secrets repo into .secrets/ at the repo root." >&2
  exit 1
fi

if [[ ! -d "${SECRETS_DIR}/${ENV}" ]]; then
  echo "error: Unknown environment '${ENV}'. Valid values: staging, testnet, production" >&2
  exit 1
fi

echo "Setting up environment: ${ENV}"

# Copy shared files (xcconfigs + Xcode schemes — all 3 needed simultaneously)
cp -r "${SECRETS_DIR}/shared/mobile/" "${REPO_ROOT}/apps/mobile/"

# Copy env-specific files (.env, google-services.json, keystore, GoogleService-Info.plist)
cp -r "${SECRETS_DIR}/${ENV}/mobile/" "${REPO_ROOT}/apps/mobile/"
cp -r "${SECRETS_DIR}/${ENV}/web/"    "${REPO_ROOT}/apps/web/"

# Source build-time secrets into current shell (NOT bundled into app)
# shellcheck disable=SC1090
set -a && source "${REPO_ROOT}/apps/mobile/.env.secrets" && set +a

SCHEME="Ion-$(tr '[:lower:]' '[:upper:]' <<< "${ENV:0:1}")${ENV:1}"
echo "Done. iOS: react-native run-ios --scheme ${SCHEME}"
echo "      Android: react-native run-android --variant ${ENV}Debug"

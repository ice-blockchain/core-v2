#!/usr/bin/env bash
set -euo pipefail

ENV="${1:?Usage: setup-env.sh <staging|testnet|production>}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS_DIR="${REPO_ROOT}/.secrets/frontend"

SECRETS_ROOT="${REPO_ROOT}/.secrets"

if [[ -d "${SECRETS_ROOT}/.git" ]]; then
  echo "Pulling latest secrets..."
  git -C "${SECRETS_ROOT}" pull --ff-only
elif [[ ! -d "${SECRETS_DIR}" ]]; then
  echo "Secrets repo not found at ${SECRETS_ROOT}"
  read -rp "Enter the secrets repo URL: " SECRETS_URL
  if [[ -z "${SECRETS_URL}" ]]; then
    echo "error: No URL provided." >&2
    exit 1
  fi
  git clone "${SECRETS_URL}" "${SECRETS_ROOT}"
fi

if [[ ! -d "${SECRETS_DIR}/${ENV}" ]]; then
  echo "error: Unknown environment '${ENV}'. Valid values: staging, testnet, production" >&2
  exit 1
fi

echo "Setting up environment: ${ENV}"

# Copy shared files (android signing, xcconfigs, Xcode schemes, build-time secrets)
cp -r "${SECRETS_DIR}/shared/mobile/" "${REPO_ROOT}/apps/mobile/"

# Copy env-specific files (.env, google-services.json, sentry, fastlane keys)
cp -r "${SECRETS_DIR}/${ENV}/mobile/" "${REPO_ROOT}/apps/mobile/"
cp -r "${SECRETS_DIR}/${ENV}/web/"    "${REPO_ROOT}/apps/web/"

# Source build-time secrets into current shell (NOT bundled into app)
SECRETS_FILE="${REPO_ROOT}/apps/mobile/.env.secrets"
if [[ -f "${SECRETS_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a && source "${SECRETS_FILE}" && set +a
fi

echo "Done. iOS: pnpm ios:${ENV}"
echo "      Android: pnpm android:${ENV}"

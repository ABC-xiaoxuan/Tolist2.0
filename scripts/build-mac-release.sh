#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script must run on macOS to build .app and .dmg bundles." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PRIVATE_KEY_PATH="$ROOT_DIR/.tauri/updater.key"
UPDATER_CONFIG_ARGS=()

if [[ -f "$PRIVATE_KEY_PATH" ]]; then
  export TAURI_SIGNING_PRIVATE_KEY="$(cat "$PRIVATE_KEY_PATH")"
  export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="${TAURI_SIGNING_PRIVATE_KEY_PASSWORD:-}"
else
  echo "Updater private key not found: $PRIVATE_KEY_PATH" >&2
  echo "Building .app/.dmg without updater artifacts." >&2
  UPDATER_CONFIG_ARGS=(--config '{"bundle":{"createUpdaterArtifacts":false}}')
fi

cd "$ROOT_DIR"

npm run tauri -- build --bundles app,dmg "${UPDATER_CONFIG_ARGS[@]}" "$@"

echo "macOS bundles generated under:"
echo "  $ROOT_DIR/src-tauri/target/release/bundle"
echo "  $ROOT_DIR/src-tauri/target/<target-triple>/release/bundle (when --target is used)"

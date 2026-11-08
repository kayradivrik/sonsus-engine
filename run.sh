#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -f "$HOME/.cargo/env" ] && \. "$HOME/.cargo/env"

if [[ "${1:-}" == "--dev" ]]; then
  exec npm run tauri dev
fi

if [[ "${1:-}" == "--build" ]]; then
  echo "🚀 sonsus-engine release derleniyor..."
  npm run build
  cargo build --release --manifest-path src-tauri/Cargo.toml
  exec ./src-tauri/target/release/sonsus-engine
fi

if [[ -x "src-tauri/target/release/sonsus-engine" ]]; then
  exec ./src-tauri/target/release/sonsus-engine
elif [[ -x "src-tauri/target/debug/sonsus-engine" ]]; then
  exec ./src-tauri/target/debug/sonsus-engine
else
  exec npm run tauri dev
fi

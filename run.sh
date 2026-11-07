#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -f "$HOME/.cargo/env" ] && \. "$HOME/.cargo/env"

# Not: Intel Iris Xe / Mesa Wayland üzerinde tam GPU (DMA-BUF) hızlandırması varsayılan olarak açıktır.
# Yalnızca harici NVIDIA üzerinde siyah ekran yaşanırsa WEBKIT_DISABLE_DMABUF_RENDERER=1 verilebilir.

if [[ "${1:-}" == "--dev" ]]; then
  exec npm run tauri dev
fi

if [[ -x "src-tauri/target/release/krnl-launcher" ]]; then
  exec ./src-tauri/target/release/krnl-launcher
elif [[ -x "src-tauri/target/debug/krnl-launcher" ]]; then
  exec ./src-tauri/target/debug/krnl-launcher
else
  exec npm run tauri dev
fi

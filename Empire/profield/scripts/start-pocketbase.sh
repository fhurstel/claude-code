#!/usr/bin/env bash
set -euo pipefail

PB_DIR="${PB_DIR:-$(cd "$(dirname "$0")/.." && pwd)/pocketbase}"
PB_DATA_DIR="${PB_DATA_DIR:-$PB_DIR/pb_data}"
PB_BINARY="${PB_BINARY:-$PB_DIR/pocketbase}"
PB_HOST="${PB_HOST:-0.0.0.0}"
PB_PORT="${PB_PORT:-8090}"

mkdir -p "$PB_DATA_DIR"
cd "$PB_DIR"

exec "$PB_BINARY" serve --http "$PB_HOST:$PB_PORT" --dir "$PB_DATA_DIR"

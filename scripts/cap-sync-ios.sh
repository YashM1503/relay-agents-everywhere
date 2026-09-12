#!/usr/bin/env bash
# Sync Capacitor iOS shell — delegates to ios-demo.sh for full preflight + sync.
set -euo pipefail
exec "$(cd "$(dirname "$0")" && pwd)/ios-demo.sh" sync

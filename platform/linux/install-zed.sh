#!/usr/bin/env bash
set -euo pipefail
if ! command -v curl >/dev/null 2>&1; then echo 'curl is required.' >&2; exit 1; fi
# Fetch and execute Zed Industries' official installer over HTTPS.
curl -f --proto '=https' --tlsv1.2 https://zed.dev/install.sh | sh
printf 'Zed installation completed. Restart AIOF to refresh engine detection.\n'

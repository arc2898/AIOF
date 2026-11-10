#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# Clear old package artifacts only; per-user AIOF configuration is kept on upgrades.
rm -rf "$ROOT/release"

if ! command -v node >/dev/null 2>&1; then echo 'Node.js 22.12+ is required.' >&2; exit 1; fi
NODE_OK="$(node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.stdout.write(String(major > 22 || (major === 22 && minor >= 12) ? 1 : 0))')"
if [[ "$NODE_OK" != 1 ]]; then echo "Node.js 22.12+ required; found $(node --version)." >&2; exit 1; fi
for cmd in npm dpkg-deb; do command -v "$cmd" >/dev/null 2>&1 || { echo "Missing required command: $cmd" >&2; exit 1; }; done

if [[ -f package-lock.json ]]; then npm ci; else npm install; fi
npm run lint:syntax
npm test
npm run dist:deb
printf '\nAIOF Debian package(s): %s/release\n' "$ROOT"

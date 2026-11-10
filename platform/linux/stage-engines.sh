#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
copy_file() { local key="$1" source="$2" expected="$3"; [[ -n "$source" ]] || return 0; [[ -x "$source/$expected" ]] || { echo "$key: missing executable $source/$expected" >&2; exit 1; }; mkdir -p "$ROOT/resources/engines/linux/$key"; cp -a "$source"/. "$ROOT/resources/engines/linux/$key/"; echo "Staged $key from $source"; }
copy_file torrent "${AIOF_QBITTORRENT_DIR:-}" qbittorrent-nox

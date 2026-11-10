#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC="$ROOT/vendor/upstream/7zip/CPP/7zip"
OUT="$ROOT/resources/engines/linux/archive"
JOBS="${JOBS:-$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 2)}"
command -v make >/dev/null || { echo "make is required" >&2; exit 1; }
command -v g++ >/dev/null || { echo "g++ is required" >&2; exit 1; }
make -C "$SRC/UI/Console" -f makefile.gcc -j"$JOBS"
make -C "$SRC/Bundles/Format7zF" -f makefile.gcc -j"$JOBS"
install -d "$OUT"
install -m 0755 "$SRC/UI/Console/_o/7z" "$OUT/7z"
install -m 0755 "$SRC/Bundles/Format7zF/_o/7z.so" "$OUT/7z.so"
"$OUT/7z" i | head -n 18
printf 'Bundled Linux x86_64 7-Zip engine staged in %s\n' "$OUT"

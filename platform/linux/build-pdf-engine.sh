#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC="$ROOT/vendor/upstream/stirling-pdf-core"
OUT="$ROOT/resources/engines/common/pdf/stirling-pdf.jar"
command -v java >/dev/null 2>&1 || { echo 'JDK 25+ is required.' >&2; exit 1; }
JAVA_MAJOR="$(java -version 2>&1 | awk -F'[\".]' '/version/ {print $2; exit}')"
[[ "${JAVA_MAJOR:-0}" -ge 25 ]] || { echo "Java 25+ required; found ${JAVA_MAJOR:-unknown}." >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo 'Node.js 22+ is required to build the PDF frontend.' >&2; exit 1; }
[[ -d "$SRC" && -x "$SRC/gradlew" ]] || { echo 'Stirling PDF core source is missing.' >&2; exit 1; }
cd "$SRC"
export STIRLING_FLAVOR=core DISABLE_ADDITIONAL_FEATURES=true
./gradlew :stirling-pdf:bootJar -PbuildWithFrontend=true -PfrontendMode=core -PbuildWithPortal=false -PbundleOnnxRuntime=false -x test
JAR="$(find app/core/build/libs -maxdepth 1 -type f -name '*.jar' ! -name '*-plain.jar' -printf '%T@ %p\n' | sort -nr | head -n1 | cut -d' ' -f2-)"
[[ -n "$JAR" ]] || { echo 'Could not locate the generated boot JAR.' >&2; exit 1; }
mkdir -p "$(dirname "$OUT")"
cp "$JAR" "$OUT"
printf 'Staged Stirling PDF core: %s\n' "$OUT"

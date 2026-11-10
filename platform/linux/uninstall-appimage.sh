#!/usr/bin/env bash
set -euo pipefail

cat <<'NOTICE'
AIOF AppImage has no package-manager uninstaller.
This helper removes AIOF's settings, local cache, private temporary files,
and app-owned user data for the current account only.
It does not remove your personal files or shared/system caches.
After this completes, delete the AIOF .AppImage file manually.
NOTICE

if [[ "${1:-}" != "--purge" ]]; then
  echo
  echo "Run again with --purge to remove AIOF data for user: ${USER:-$(id -un)}"
  exit 2
fi

HOME_DIR="${HOME:?HOME is not set}"
case "$HOME_DIR" in
  /|"") echo 'Refusing to operate on an invalid HOME path.' >&2; exit 1 ;;
esac

for item in \
  "$HOME_DIR/.config/AIOF" \
  "$HOME_DIR/.config/aiof-desktop" \
  "$HOME_DIR/.cache/AIOF" \
  "$HOME_DIR/.cache/aiof-desktop" \
  "$HOME_DIR/.local/share/AIOF" \
  "$HOME_DIR/.local/share/aiof-desktop" \
  "$HOME_DIR/.local/state/AIOF" \
  "$HOME_DIR/.local/state/aiof-desktop"; do
  if [[ -L "$item" ]]; then
    rm -f -- "$item"
  elif [[ -d "$item" ]]; then
    rm -rf -- "$item"
  elif [[ -e "$item" ]]; then
    rm -f -- "$item"
  fi
done

echo 'AIOF user data removed. Delete the .AppImage file manually.'

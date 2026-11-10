#!/usr/bin/env bash
set -eu

# Debian passes `upgrade` while replacing a package. RPM passes `1` when
# another package instance remains after an upgrade. Never erase user data then.
case "${1:-}" in
  upgrade|failed-upgrade|abort-upgrade|1) exit 0 ;;
esac

# Remove only AIOF's exact per-user profile/cache/temp paths. This is an
# intentional destructive uninstall policy; shared ~/.cache and system logs
# are not touched. Ignore absent users and symlinked home directories.
for home in /home/* /root; do
  [ -d "$home" ] || continue
  [ ! -L "$home" ] || continue
  rm -rf -- \
    "$home/.config/AIOF" \
    "$home/.config/aiof-desktop" \
    "$home/.cache/AIOF" \
    "$home/.cache/aiof-desktop" \
    "$home/.local/share/AIOF" \
    "$home/.local/share/aiof-desktop" \
    "$home/.local/state/AIOF" \
    "$home/.local/state/aiof-desktop"
done
exit 0

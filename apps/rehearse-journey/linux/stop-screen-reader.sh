#!/usr/bin/env bash
# Local desktop helper. The web app cannot control an OS screen reader.
set -u
if command -v gsettings >/dev/null 2>&1; then
  gsettings set org.gnome.desktop.a11y.applications screen-reader-enabled false || exit 1
fi
pkill -TERM -x orca
result=$?
# pkill returns 1 when Orca is already stopped.
if [ "$result" -eq 0 ] || [ "$result" -eq 1 ]; then
  exit 0
fi
exit "$result"

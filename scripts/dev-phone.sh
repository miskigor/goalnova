#!/bin/sh
# Start Next on all interfaces and print the URL to open on a phone (same Wi‑Fi as this Mac).
# Do not use "localhost" on the phone — that refers to the phone itself.

set -e
cd "$(dirname "$0")/.."

PORT="${PORT:-3010}"
IP="$(ipconfig getifaddr en0 2>/dev/null || true)"
if [ -z "$IP" ]; then
  IP="$(ipconfig getifaddr en1 2>/dev/null || true)"
fi
if [ -z "$IP" ]; then
  echo "Could not read a Wi‑Fi IP (en0/en1). Connect this Mac to Wi‑Fi and try again."
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  On your iPhone (same Wi‑Fi as this Mac), open Safari:"
echo ""
echo "    http://${IP}:${PORT}/hr"
echo ""
echo "  If HTML loads but looks broken (no styling): restart this script"
echo "  so NEXT_DEV_LAN_HOST is set — it allows /_next assets on your IP."
echo "  Settings → Privacy → Local Network → Safari ON. VPN OFF."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

export NEXT_DISABLE_CROSS_SITE_DEV_BLOCK=1
export NEXT_DEV_LAN_HOST="$IP"
exec npx next dev --hostname 0.0.0.0 --port "$PORT" --webpack

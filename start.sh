#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  iPad Clock — servidor de desarrollo
#  Uso: ./start.sh [puerto]
#  Ejemplo: ./start.sh 8080
# ─────────────────────────────────────────────────────────

PORT=${1:-8080}
DIR="$(cd "$(dirname "$0")" && pwd)"

# Ensure Homebrew's node is on PATH (non-interactive shells don't source shell profiles)
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# Obtener IP local (primera interfaz con IPv4 no loopback)
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null \
  || ipconfig getifaddr en1 2>/dev/null \
  || hostname -I 2>/dev/null | awk '{print $1}' \
  || echo "localhost")

echo ""
echo "  ┌─────────────────────────────────────────────┐"
echo "  │   iPad Clock — Servidor de desarrollo       │"
echo "  ├─────────────────────────────────────────────┤"
echo "  │   Local:   http://localhost:${PORT}               │"
echo "  │   Red:     http://${LOCAL_IP}:${PORT}         │"
echo "  ├─────────────────────────────────────────────┤"
echo "  │   ⚠ Service Worker solo funciona en          │"
echo "  │     localhost (HTTP). Para el iPad usa       │"
echo "  │     node server.js (HTTPS con mkcert).      │"
echo "  └─────────────────────────────────────────────┘"
echo ""
echo "  Ctrl+C para detener"
echo ""

cd "$DIR"

# Abrir el navegador automáticamente (macOS)
if command -v open &>/dev/null; then
  sleep 0.5 && open "http://localhost:${PORT}" &
fi

PORT="$PORT" python3 server.py "$PORT"

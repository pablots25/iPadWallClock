#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  iPad Clock — servidor de producción (HTTPS + iPad)
#  Uso: ./start-https.sh [puerto]
#  Ejemplo: ./start-https.sh 8443
#
#  Primera vez: genera certificados mkcert y los instala.
#  Requiere: mkcert, node
# ─────────────────────────────────────────────────────────

set -e

PORT=${1:-8443}
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# ── 1. Detectar IP local ─────────────────────────────────
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null \
  || ipconfig getifaddr en1 2>/dev/null \
  || echo "127.0.0.1")

# ── 2. Comprobar dependencias ────────────────────────────
if ! command -v mkcert &>/dev/null; then
  echo "❌  mkcert no encontrado. Instálalo con:"
  echo "       brew install mkcert && mkcert -install"
  exit 1
fi

if ! command -v node &>/dev/null; then
  echo "❌  node no encontrado. Instálalo con:"
  echo "       brew install node"
  exit 1
fi

# ── 3. Generar certificados si no existen ────────────────
if [ ! -f cert.pem ] || [ ! -f key.pem ]; then
  echo ""
  echo "  🔐 Generando certificados HTTPS para ${LOCAL_IP} y localhost…"
  mkcert -key-file key.pem -cert-file cert.pem "${LOCAL_IP}" localhost 127.0.0.1
  echo "  ✔  cert.pem y key.pem creados."
  echo ""
  echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  PASO REQUERIDO EN EL IPAD (solo la primera vez):"
  echo ""
  echo "  1. Encuentra el archivo rootCA.pem:"
  echo "        $(mkcert -CAROOT)/rootCA.pem"
  echo ""
  echo "  2. Envíatelo al iPad (AirDrop, correo, etc.)"
  echo ""
  echo "  3. En el iPad:"
  echo "       • Toca el archivo → 'Perfil descargado'"
  echo "       • Ajustes → General → VPN y gestión → Instalar"
  echo "       • Ajustes → General → Información"
  echo "         → Configuración de confianza de certificados"
  echo "         → Activa el CA de mkcert"
  echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  read -p "  Pulsa INTRO cuando hayas confiado en el CA en el iPad…" _
fi

# ── 4. Regenerar cert si la IP cambió ────────────────────
# (comprueba que la IP actual esté en el cert)
if command -v openssl &>/dev/null; then
  if ! openssl x509 -in cert.pem -text -noout 2>/dev/null | grep -q "${LOCAL_IP}"; then
    echo ""
    echo "  ⚠  Tu IP local (${LOCAL_IP}) no está en el certificado actual."
    echo "  🔐 Regenerando certificados…"
    mkcert -key-file key.pem -cert-file cert.pem "${LOCAL_IP}" localhost 127.0.0.1
    echo "  ✔  Certificados actualizados."
    echo ""
  fi
fi

# ── 5. Arrancar servidor ─────────────────────────────────
echo ""
echo "  ┌─────────────────────────────────────────────┐"
echo "  │   iPad Clock — Servidor HTTPS               │"
echo "  ├─────────────────────────────────────────────┤"
echo "  │   Local:   https://localhost:${PORT}              │"
echo "  │   iPad:    https://${LOCAL_IP}:${PORT}        │"
echo "  ├─────────────────────────────────────────────┤"
echo "  │   En el iPad: Compartir → Añadir a pantalla │"
echo "  └─────────────────────────────────────────────┘"
echo ""
echo "  Ctrl+C para detener"
echo ""

# Abrir en navegador local (macOS)
if command -v open &>/dev/null; then
  sleep 0.8 && open "https://localhost:${PORT}" &
fi

PORT=$PORT node server.js

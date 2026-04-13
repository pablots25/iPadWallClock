#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  iPad Clock — Instalación completa en Raspberry Pi
#  Uso: curl/scp este script a la Raspberry y ejecútalo:
#       chmod +x install-raspberry.sh && ./install-raspberry.sh
#
#  Lo que hace:
#   1. Instala Node.js (si no está)
#   2. Instala mkcert (si no está)
#   3. Clona/copia la app a ~/ipadclock (si no existe)
#   4. Genera certificados HTTPS
#   5. Crea un servicio systemd para arrancado automático
#   6. Arranca el servidor
# ─────────────────────────────────────────────────────────

set -e

# ── Colores ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()    { echo -e "${CYAN}ℹ  $1${NC}"; }
success() { echo -e "${GREEN}✔  $1${NC}"; }
warn()    { echo -e "${YELLOW}⚠  $1${NC}"; }
error()   { echo -e "${RED}✖  $1${NC}"; exit 1; }

PORT=${1:-8443}
APP_DIR="${2:-$(pwd)}"
SERVICE_NAME="ipadclock"
CURRENT_USER=$(whoami)

echo ""
echo "  ┌─────────────────────────────────────────────┐"
echo "  │   iPad Clock — Instalador Raspberry Pi      │"
echo "  │   Puerto: ${PORT}                                │"
echo "  │   Directorio: ${APP_DIR}"
echo "  └─────────────────────────────────────────────┘"
echo ""

# ── 1. Detectar arquitectura ────────────────────────────
ARCH=$(uname -m)
case "$ARCH" in
  armv7l|armv6l) MKCERT_ARCH="linux-arm"   ;;
  aarch64)       MKCERT_ARCH="linux-arm64"  ;;
  x86_64)        MKCERT_ARCH="linux-amd64"  ;;
  *)             error "Arquitectura no soportada: $ARCH" ;;
esac
info "Arquitectura detectada: $ARCH → mkcert build: $MKCERT_ARCH"

# ── 2. Actualizar paquetes ───────────────────────────────
info "Actualizando lista de paquetes…"
sudo apt-get update -qq

# ── 3. Instalar Node.js ─────────────────────────────────
if command -v node &>/dev/null; then
  success "Node.js ya instalado: $(node --version)"
else
  info "Instalando Node.js…"
  # Intentar NodeSource primero (versión más reciente)
  if curl -fsSL https://deb.nodesource.com/setup_lts.x -o /tmp/nodesource_setup.sh 2>/dev/null; then
    sudo bash /tmp/nodesource_setup.sh
    sudo apt-get install -y nodejs
    rm -f /tmp/nodesource_setup.sh
  else
    # Fallback: paquete del sistema
    sudo apt-get install -y nodejs
  fi
  command -v node &>/dev/null || error "No se pudo instalar Node.js"
  success "Node.js instalado: $(node --version)"
fi

# ── 4. Instalar mkcert ──────────────────────────────────
if command -v mkcert &>/dev/null; then
  success "mkcert ya instalado: $(mkcert --version 2>&1 | head -1)"
else
  info "Instalando mkcert para $MKCERT_ARCH…"

  # Dependencias de mkcert
  sudo apt-get install -y libnss3-tools curl

  # Descargar binario
  MKCERT_URL="https://dl.filippo.io/mkcert/latest?for=${MKCERT_ARCH}"
  MKCERT_TMP="/tmp/mkcert"
  curl -fsSL "$MKCERT_URL" -o "$MKCERT_TMP" || error "No se pudo descargar mkcert desde $MKCERT_URL"
  chmod +x "$MKCERT_TMP"
  sudo mv "$MKCERT_TMP" /usr/local/bin/mkcert

  command -v mkcert &>/dev/null || error "No se pudo instalar mkcert"
  success "mkcert instalado"

  # Instalar CA raíz local
  info "Instalando CA raíz de mkcert…"
  mkcert -install
  success "CA raíz instalada"
fi

# ── 5. Verificar que el directorio de la app existe ──────
if [ ! -f "$APP_DIR/server.js" ]; then
  error "No se encuentra server.js en $APP_DIR. Ejecuta este script desde el directorio de la app, o pasa la ruta como segundo argumento: ./install-raspberry.sh 8443 /ruta/a/ipadclock"
fi
success "Directorio de la app: $APP_DIR"

# ── 6. Detectar IP local ────────────────────────────────
LOCAL_IP=$(hostname -I | awk '{print $1}')
if [ -z "$LOCAL_IP" ]; then
  error "No se pudo detectar la IP local. ¿Estás conectado a la red?"
fi
success "IP local: $LOCAL_IP"

# ── 7. Generar certificados HTTPS ────────────────────────
cd "$APP_DIR"

NEED_CERT=false
if [ ! -f cert.pem ] || [ ! -f key.pem ]; then
  NEED_CERT=true
elif command -v openssl &>/dev/null; then
  if ! openssl x509 -in cert.pem -text -noout 2>/dev/null | grep -q "$LOCAL_IP"; then
    warn "La IP actual ($LOCAL_IP) no coincide con el certificado. Regenerando…"
    NEED_CERT=true
  fi
fi

if [ "$NEED_CERT" = true ]; then
  info "Generando certificados HTTPS para $LOCAL_IP…"
  mkcert -key-file key.pem -cert-file cert.pem "$LOCAL_IP" localhost 127.0.0.1
  success "cert.pem y key.pem creados"
else
  success "Certificados HTTPS existentes son válidos"
fi

# ── 8. Mostrar info del CA para el iPad ──────────────────
CA_ROOT=$(mkcert -CAROOT 2>/dev/null)
echo ""
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  CONFIGURACIÓN DEL IPAD (solo la primera vez):"
echo ""
echo "  1. Copia el archivo CA al iPad:"
echo "       ${CA_ROOT}/rootCA.pem"
echo ""
echo "  Desde la Raspberry, puedes servirlo temporalmente:"
echo "       cd \"$CA_ROOT\" && python3 -m http.server 9999"
echo "  Y en el iPad abrir: http://${LOCAL_IP}:9999/rootCA.pem"
echo ""
echo "  2. En el iPad:"
echo "     • Toca el archivo → 'Perfil descargado'"
echo "     • Ajustes → General → VPN y gestión → Instalar"
echo "     • Ajustes → General → Información"
echo "       → Config. de confianza de certificados"
echo "       → Activa el CA de mkcert"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 9. Crear servicio systemd ────────────────────────────
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

info "Creando servicio systemd: ${SERVICE_NAME}…"

NODE_BIN=$(which node)

sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=iPad Clock — Servidor HTTPS
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${CURRENT_USER}
WorkingDirectory=${APP_DIR}
Environment=PORT=${PORT}
ExecStart=${NODE_BIN} ${APP_DIR}/server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
success "Servicio ${SERVICE_NAME} creado y habilitado en el arranque"

# ── 10. Arrancar (o reiniciar) el servicio ───────────────
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
  info "Reiniciando servicio…"
  sudo systemctl restart "$SERVICE_NAME"
else
  info "Arrancando servicio…"
  sudo systemctl start "$SERVICE_NAME"
fi

# Esperar un momento y verificar
sleep 2
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
  success "Servidor arrancado correctamente"
else
  warn "El servicio no arrancó. Revisa los logs con:"
  echo "       sudo journalctl -u ${SERVICE_NAME} -n 30 --no-pager"
fi

# ── Resumen final ────────────────────────────────────────
echo ""
echo "  ┌─────────────────────────────────────────────────┐"
echo "  │   ✔ Instalación completada                      │"
echo "  ├─────────────────────────────────────────────────┤"
echo "  │                                                  │"
echo "  │   URL iPad:  https://${LOCAL_IP}:${PORT}              │"
echo "  │                                                  │"
echo "  │   Comandos útiles:                               │"
echo "  │     Ver estado:   sudo systemctl status ${SERVICE_NAME}  │"
echo "  │     Ver logs:     sudo journalctl -u ${SERVICE_NAME} -f  │"
echo "  │     Reiniciar:    sudo systemctl restart ${SERVICE_NAME} │"
echo "  │     Detener:      sudo systemctl stop ${SERVICE_NAME}    │"
echo "  │     Desinstalar:  sudo systemctl disable ${SERVICE_NAME} │"
echo "  │                   sudo rm ${SERVICE_FILE}│"
echo "  │                                                  │"
echo "  └─────────────────────────────────────────────────┘"
echo ""

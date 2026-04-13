#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  iPad Clock — Configurar como servicio systemd
#
#  Uso:
#    ./setup-service.sh              # puerto 8443, directorio actual
#    ./setup-service.sh 9443         # puerto custom
#    ./setup-service.sh 8443 /ruta   # puerto + directorio custom
#
#  Acciones:
#    ./setup-service.sh              — instalar y arrancar
#    ./setup-service.sh uninstall    — desinstalar servicio
#    ./setup-service.sh status       — ver estado
#    ./setup-service.sh logs         — ver logs en vivo
#    ./setup-service.sh restart      — reiniciar
# ─────────────────────────────────────────────────────────

set -e

# ── Colores ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${CYAN}ℹ  $1${NC}"; }
success() { echo -e "${GREEN}✔  $1${NC}"; }
warn()    { echo -e "${YELLOW}⚠  $1${NC}"; }
error()   { echo -e "${RED}✖  $1${NC}"; exit 1; }

SERVICE_NAME="ipadclock"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# ── Subcomandos ──────────────────────────────────────────
case "${1}" in
  uninstall)
    info "Deteniendo servicio…"
    sudo systemctl stop "$SERVICE_NAME" 2>/dev/null || true
    sudo systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    sudo rm -f "$SERVICE_FILE"
    sudo systemctl daemon-reload
    success "Servicio ${SERVICE_NAME} desinstalado"
    exit 0
    ;;
  status)
    sudo systemctl status "$SERVICE_NAME" --no-pager
    exit $?
    ;;
  logs)
    sudo journalctl -u "$SERVICE_NAME" -f
    exit 0
    ;;
  restart)
    sudo systemctl restart "$SERVICE_NAME"
    success "Servicio reiniciado"
    sudo systemctl status "$SERVICE_NAME" --no-pager --lines=5
    exit 0
    ;;
esac

# ── Configuración ───────────────────────────────────────
PORT=${1:-8443}
APP_DIR="$(cd "${2:-.}" && pwd)"
CURRENT_USER=$(whoami)

# ── Validaciones ─────────────────────────────────────────
if [ ! -f "$APP_DIR/server.js" ]; then
  error "No se encuentra server.js en $APP_DIR
  Ejecuta este script desde el directorio de la app o pasa la ruta:
    ./setup-service.sh 8443 /home/pi/ipadclock"
fi

if ! command -v node &>/dev/null; then
  error "Node.js no está instalado. Instálalo primero:
    sudo apt install nodejs
  O ejecuta install-raspberry.sh para la instalación completa."
fi

NODE_BIN=$(which node)

echo ""
echo -e "${BOLD}  ┌─────────────────────────────────────────────┐${NC}"
echo -e "${BOLD}  │   iPad Clock — Configurar servicio          │${NC}"
echo -e "${BOLD}  ├─────────────────────────────────────────────┤${NC}"
echo "  │   Puerto:     ${PORT}"
echo "  │   Directorio: ${APP_DIR}"
echo "  │   Usuario:    ${CURRENT_USER}"
echo "  │   Node:       ${NODE_BIN}"
echo -e "${BOLD}  └─────────────────────────────────────────────┘${NC}"
echo ""

# ── Detener servicio anterior si existe ──────────────────
if sudo systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  info "Deteniendo servicio existente…"
  sudo systemctl stop "$SERVICE_NAME"
fi

# ── Crear archivo de servicio ────────────────────────────
info "Creando servicio systemd: ${SERVICE_NAME}…"

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
StandardOutput=journal
StandardError=journal

# Reiniciar automáticamente si se cae
StartLimitIntervalSec=60
StartLimitBurst=3

[Install]
WantedBy=multi-user.target
EOF

success "Archivo de servicio creado: ${SERVICE_FILE}"

# ── Recargar, habilitar y arrancar ───────────────────────
sudo systemctl daemon-reload
success "systemd recargado"

sudo systemctl enable "$SERVICE_NAME"
success "Servicio habilitado en el arranque"

info "Arrancando servicio…"
sudo systemctl start "$SERVICE_NAME"

# Esperar y verificar
sleep 2
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
  success "Servidor arrancado correctamente"
else
  warn "El servicio no arrancó. Revisa los logs:"
  echo "       sudo journalctl -u ${SERVICE_NAME} -n 30 --no-pager"
  exit 1
fi

# ── Detectar IP ──────────────────────────────────────────
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "???")

# ── Resumen ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}  ┌─────────────────────────────────────────────────┐${NC}"
echo -e "${GREEN}  │   ✔ Servicio configurado correctamente          │${NC}"
echo -e "${BOLD}  ├─────────────────────────────────────────────────┤${NC}"
echo "  │"
echo "  │   URL:  https://${LOCAL_IP}:${PORT}"
echo "  │"
echo -e "  │   ${BOLD}Comandos:${NC}"
echo "  │     Estado:       ./setup-service.sh status"
echo "  │     Logs:         ./setup-service.sh logs"
echo "  │     Reiniciar:    ./setup-service.sh restart"
echo "  │     Desinstalar:  ./setup-service.sh uninstall"
echo "  │"
echo "  │   (o directamente con systemctl):"
echo "  │     sudo systemctl status ${SERVICE_NAME}"
echo "  │     sudo journalctl -u ${SERVICE_NAME} -f"
echo "  │"
echo -e "${BOLD}  └─────────────────────────────────────────────────┘${NC}"
echo ""

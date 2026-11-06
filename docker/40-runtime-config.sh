#!/bin/sh
set -eu

API_URL=${ELO_API_BASE_URL:-https://elocampus-backend.a6ti6s.easypanel.host/api}
DATA_MODE=api
CONFIG_FILE=/usr/share/nginx/html/assets/js/runtime-config.js

escape_js() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/</\\u003c/g' -e 's/>/\\u003e/g'
}

# Reaproveita a versão definida no repositório (assets/js/runtime-config.js) antes de sobrescrever o arquivo.
# A variável de ambiente ELO_FRONTEND_VERSION, se existir, tem prioridade.
FRONTEND_VERSION=""
if [ -f "$CONFIG_FILE" ]; then
  FRONTEND_VERSION=$(sed -n 's/.*ELO_FRONTEND_VERSION = "\([^"]*\)".*/\1/p' "$CONFIG_FILE" | head -n 1)
fi
FRONTEND_VERSION=${ELO_FRONTEND_VERSION:-${FRONTEND_VERSION:-desconhecida}}

API_URL_ESCAPED=$(escape_js "$API_URL")
DATA_MODE_ESCAPED=$(escape_js "$DATA_MODE")
FRONTEND_VERSION_ESCAPED=$(escape_js "$FRONTEND_VERSION")
mkdir -p /usr/share/nginx/html/assets/js
printf 'window.ELO_API_BASE_URL = "%s";\nwindow.ELO_DATA_MODE = "%s";\nwindow.ELO_FRONTEND_VERSION = "%s";\n' "$API_URL_ESCAPED" "$DATA_MODE_ESCAPED" "$FRONTEND_VERSION_ESCAPED" > "$CONFIG_FILE"

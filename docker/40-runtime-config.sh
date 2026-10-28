#!/bin/sh
set -eu

API_URL=${ELO_API_BASE_URL:-https://elocampus-backend.a6ti6s.easypanel.host/api}
DATA_MODE=api
FRONTEND_VERSION=2026.10.28.10

escape_js() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/</\\u003c/g' -e 's/>/\\u003e/g'
}
API_URL_ESCAPED=$(escape_js "$API_URL")
DATA_MODE_ESCAPED=$(escape_js "$DATA_MODE")
FRONTEND_VERSION_ESCAPED=$(escape_js "$FRONTEND_VERSION")
mkdir -p /usr/share/nginx/html/assets/js
printf 'window.ELO_API_BASE_URL = "%s";\nwindow.ELO_DATA_MODE = "%s";\nwindow.ELO_FRONTEND_VERSION = "%s";\n' "$API_URL_ESCAPED" "$DATA_MODE_ESCAPED" "$FRONTEND_VERSION_ESCAPED" > /usr/share/nginx/html/assets/js/runtime-config.js

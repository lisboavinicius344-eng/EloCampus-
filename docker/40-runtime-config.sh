#!/bin/sh
set -eu

API_URL=${ELO_API_BASE_URL:-}
DATA_MODE=${ELO_DATA_MODE:-demo}
case "$DATA_MODE" in
  api|demo) ;;
  *) DATA_MODE=demo ;;
esac

escape_js() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/</\\u003c/g' -e 's/>/\\u003e/g'
}
API_URL_ESCAPED=$(escape_js "$API_URL")
DATA_MODE_ESCAPED=$(escape_js "$DATA_MODE")
mkdir -p /usr/share/nginx/html/assets/js
printf 'window.ELO_API_BASE_URL = "%s";\nwindow.ELO_DATA_MODE = "%s";\n' "$API_URL_ESCAPED" "$DATA_MODE_ESCAPED" > /usr/share/nginx/html/assets/js/runtime-config.js

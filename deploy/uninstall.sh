#!/usr/bin/env bash
# 卸载服务与程序目录；默认保留数据与配置（防误删）
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/team-report}"
DATA_DIR="${DATA_DIR:-/var/lib/team-report}"
CONFIG_DIR="${CONFIG_DIR:-/etc/team-report}"
SERVICE_NAME="${SERVICE_NAME:-team-report}"
REMOVE_DATA="${REMOVE_DATA:-0}"

log() { printf '\033[1;32m[uninstall]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[uninstall]\033[0m %s\n' "$*"; }

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "请使用 root: sudo bash deploy/uninstall.sh" >&2
  exit 1
fi

if systemctl is-active --quiet "${SERVICE_NAME}" 2>/dev/null; then
  systemctl stop "${SERVICE_NAME}"
fi
systemctl disable "${SERVICE_NAME}" 2>/dev/null || true
rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
systemctl daemon-reload

rm -rf "${INSTALL_DIR}"
log "已删除程序目录 ${INSTALL_DIR}"

if [[ "${REMOVE_DATA}" == "1" ]]; then
  rm -rf "${DATA_DIR}" "${CONFIG_DIR}"
  warn "已删除数据目录与配置"
else
  warn "已保留 ${DATA_DIR} 与 ${CONFIG_DIR}（重装可继续使用数据）"
  warn "若需彻底删除: REMOVE_DATA=1 sudo bash deploy/uninstall.sh"
fi

#!/usr/bin/env bash
# Team Report — Linux 一键安装/升级（在项目仓库根目录的 deploy/ 下执行）
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/team-report}"
DATA_DIR="${DATA_DIR:-/var/lib/team-report}"
CONFIG_DIR="${CONFIG_DIR:-/etc/team-report}"
CONFIG_FILE="${CONFIG_DIR}/config.env"
SERVICE_NAME="${SERVICE_NAME:-team-report}"
PORT="${PORT:-3000}"
RUN_USER="${RUN_USER:-team-report}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

log() { printf '\033[1;32m[install]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[install]\033[0m %s\n' "$*"; }
err() { printf '\033[1;31m[install]\033[0m %s\n' "$*" >&2; }

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    err "请使用 root 运行: sudo bash deploy/install.sh"
    exit 1
  fi
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "缺少命令: $1"
    exit 1
  fi
}

check_node() {
  require_cmd node
  require_cmd npm
  local major
  major="$(node -p "process.versions.node.split('.')[0]")"
  if [[ "$major" -lt 18 ]]; then
    err "需要 Node.js 18+，当前: $(node -v)"
    exit 1
  fi
  log "Node $(node -v) / npm $(npm -v)"
}

build_app() {
  log "构建前端…"
  (cd "${REPO_ROOT}/frontend" && npm ci && npm run build)
  log "安装后端生产依赖…"
  (cd "${REPO_ROOT}/backend" && npm ci --omit=dev)
}

install_files() {
  log "安装程序到 ${INSTALL_DIR}/app …"
  local app="${INSTALL_DIR}/app"
  mkdir -p "${app}/backend" "${app}/frontend"

  rsync -a --delete \
    --exclude node_modules \
    --exclude test \
    --exclude '*.db' \
    --exclude .env \
    "${REPO_ROOT}/backend/" "${app}/backend/"

  (cd "${app}/backend" && npm ci --omit=dev)

  rsync -a --delete "${REPO_ROOT}/frontend/dist/" "${app}/frontend/dist/"

  cat > "${INSTALL_DIR}/README.txt" <<EOF
Team Report 已安装。
程序目录: ${INSTALL_DIR}/app （升级可覆盖）
数据目录: ${DATA_DIR}/data （请勿删除）
配置: ${CONFIG_FILE}
服务: systemctl status ${SERVICE_NAME}
访问: http://<本机IP>:${PORT}
EOF
}

ensure_user() {
  if ! id "${RUN_USER}" >/dev/null 2>&1; then
    log "创建系统用户 ${RUN_USER} …"
    useradd --system --home "${DATA_DIR}" --shell /usr/sbin/nologin "${RUN_USER}" || \
      useradd --system --no-create-home --shell /usr/sbin/nologin "${RUN_USER}"
  fi
}

ensure_data_dir() {
  log "数据目录 ${DATA_DIR}/data …"
  mkdir -p "${DATA_DIR}/data" "${DATA_DIR}/backups"
  chown -R "${RUN_USER}:${RUN_USER}" "${DATA_DIR}"
  chmod 750 "${DATA_DIR}"
}

write_config() {
  mkdir -p "${CONFIG_DIR}"
  local static_dir="${INSTALL_DIR}/app/frontend/dist"
  local db_path="${DATA_DIR}/data/teamplan.db"

  if [[ -f "${CONFIG_FILE}" ]]; then
    warn "已存在 ${CONFIG_FILE}，保留 JWT_SECRET 等密钥，仅更新路径类变量"
    # shellcheck disable=SC1090
    set -a
    source "${CONFIG_FILE}" || true
    set +a
  fi

  local jwt="${JWT_SECRET:-}"
  if [[ -z "${jwt}" ]]; then
    if command -v openssl >/dev/null 2>&1; then
      jwt="$(openssl rand -hex 32)"
    else
      jwt="$(node -p "require('crypto').randomBytes(32).toString('hex')")"
    fi
    log "已生成新的 JWT_SECRET"
  fi

  cat > "${CONFIG_FILE}" <<EOF
# Team Report — 由 install.sh 维护（升级时保留 JWT_SECRET）
PORT=${PORT}
NODE_ENV=production
SERVE_STATIC=true
STATIC_DIR=${static_dir}
DB_PATH=${db_path}
JWT_SECRET=${jwt}
PUBLIC_REGISTRATION=${PUBLIC_REGISTRATION:-true}
EOF
  chmod 640 "${CONFIG_FILE}"
  chown root:"${RUN_USER}" "${CONFIG_FILE}" 2>/dev/null || chmod 600 "${CONFIG_FILE}"
}

install_systemd() {
  log "安装 systemd 单元 ${SERVICE_NAME}.service …"
  sed \
    -e "s|/opt/team-report|${INSTALL_DIR}|g" \
    -e "s|/var/lib/team-report|${DATA_DIR}|g" \
    -e "s|User=team-report|User=${RUN_USER}|g" \
    -e "s|Group=team-report|Group=${RUN_USER}|g" \
    "${SCRIPT_DIR}/team-report.service" > "/etc/systemd/system/${SERVICE_NAME}.service"

  chown -R "${RUN_USER}:${RUN_USER}" "${INSTALL_DIR}/app"
  systemctl daemon-reload
  systemctl enable "${SERVICE_NAME}"
  systemctl restart "${SERVICE_NAME}"
}

print_done() {
  local ip
  ip="$(hostname -I 2>/dev/null | awk '{print $1}' || echo '127.0.0.1')"
  log "安装完成"
  echo ""
  echo "  本机访问:   http://127.0.0.1:${PORT}"
  echo "  局域网访问: http://${ip}:${PORT}"
  echo "  数据库:     ${DATA_DIR}/data/teamplan.db"
  echo "  配置文件:   ${CONFIG_FILE}"
  echo "  服务状态:   systemctl status ${SERVICE_NAME}"
  echo "  查看日志:   journalctl -u ${SERVICE_NAME} -f"
  echo ""
  echo "  备份建议:   定期复制 ${DATA_DIR}/data/ 到 ${DATA_DIR}/backups/"
  echo "  升级:       在仓库目录再次 sudo bash deploy/install.sh"
  echo ""
}

main() {
  require_root
  check_node
  log "仓库路径: ${REPO_ROOT}"
  log "程序目录: ${INSTALL_DIR} | 数据目录: ${DATA_DIR} | 端口: ${PORT}"
  build_app
  install_files
  ensure_user
  ensure_data_dir
  write_config
  install_systemd
  print_done
}

main "$@"

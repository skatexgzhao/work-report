# Linux 一键部署

在**已克隆的本仓库**所在机器上，用 root 执行安装脚本。脚本会构建前后端、安装到 `/opt/team-report`，数据库与配置与程序分离，**升级重装不会删除已有数据**。

## 前置条件

- Linux（systemd）
- Node.js **18+** 与 npm（`node -v`）
- root 或 sudo
- 可选：`rsync`（多数发行版已自带）

## 一键安装

```bash
cd /path/to/team-report
sudo bash deploy/install.sh
```

安装完成后浏览器访问：`http://<服务器IP>:3000`

默认演示账号见开发文档（如 admin / admin123，以种子数据为准）。

## 自定义路径 / 端口

```bash
sudo INSTALL_DIR=/opt/team-report \
     DATA_DIR=/var/lib/team-report \
     PORT=8080 \
     bash deploy/install.sh
```

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `INSTALL_DIR` | `/opt/team-report` | 程序（升级可覆盖） |
| `DATA_DIR` | `/var/lib/team-report` | 数据根目录，库在 `data/teamplan.db` |
| `CONFIG_DIR` | `/etc/team-report` | `config.env` |
| `PORT` | `3000` | 监听端口 |
| `RUN_USER` | `team-report` | systemd 运行用户 |

## 升级

在仓库拉取新代码后再次执行（会保留 `JWT_SECRET` 与数据库）：

```bash
git pull
sudo bash deploy/install.sh
```

## 服务管理

```bash
sudo systemctl status team-report
sudo systemctl restart team-report
sudo journalctl -u team-report -f
```

## 卸载

```bash
sudo bash deploy/uninstall.sh
```

默认**保留** `/var/lib/team-report` 与 `/etc/team-report`。彻底删除数据：

```bash
sudo REMOVE_DATA=1 bash deploy/uninstall.sh
```

## 数据安全

- 数据库文件：`/var/lib/team-report/data/teamplan.db`（及 WAL 附属文件）
- 配置：`/etc/team-report/config.env`（含 `JWT_SECRET`，权限 640）
- 建议定时备份：`cp -a /var/lib/team-report/data /var/lib/team-report/backups/$(date +%F)`

## 防火墙

若外网访问，放行端口（示例）：

```bash
sudo firewall-cmd --add-port=3000/tcp --permanent && sudo firewall-cmd --reload
# 或 ufw allow 3000/tcp
```

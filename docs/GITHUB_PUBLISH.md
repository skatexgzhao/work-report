# 发布到 GitHub 指南

本文说明 **work-report** 公开仓库的安全边界与发布检查。公开版应为**独立 Git 仓库**，仅关联 GitHub remote，不要与任何内网/私有 monorepo 共用 remote 或推送历史。

## 禁止上传（已在 `.gitignore`）

| 类型 | 路径/模式 |
|------|-----------|
| 密钥与环境变量 | `backend/.env`、`deploy/config.env`、任意含真实值的 `.env.*` |
| 依赖与构建产物 | `node_modules/`、`frontend/dist/` |
| 数据库与日志 | `backend/teamplan.db*`、`backend/test/*.db`、`*.sqlite*`、`*.log` |
| 证书与凭据 | `*.pem`、`*.key`、`credentials.json` |
| 本地 / 内部工作流 | `.cursor/`、`.comet/`、`openspec/`、`COMET.md`、`docs/superpowers/` |
| 本地隔离 | `.dev/`、`.worktrees/` |

**可以上传**：`backend/.env.example`、`deploy/config.env.example`（仅占位符）。

## 发布前必跑

在仓库根目录：

```powershell
powershell -NoProfile -File scripts/publish-security-check.ps1
```

通过后再 `git push`。若曾误提交过 `.env` 或数据库，需用 `git filter-repo` / BFG 清理历史。

## 许可证（LICENSE）

- 根目录 [LICENSE](../LICENSE) 为 **MIT**，版权 **skatexg**。
- 若包含上游 MIT 代码，保留 [NOTICE.md](../NOTICE.md)。

## 推送到 GitHub（仅 GitHub 认证）

```powershell
git remote -v
# 只应出现 origin → https://github.com/skatexgzhao/work-report.git

git push -u origin main
```

使用 GitHub 账号：**HTTPS + Personal Access Token**，或 **SSH**（`git@github.com:skatexgzhao/work-report.git`）。不要在公开仓库的 remote 中配置公司内网 Git 地址。

公开仓库：[skatexgzhao/work-report](https://github.com/skatexgzhao/work-report)

## GitHub 仓库建议设置

- **Settings → General**：Public / Description。
- **Settings → Code security**：启用 Dependabot alerts（仓库含 `.github/dependabot.yml`）。
- 不要在 Issue/PR 中粘贴 `JWT_SECRET` 或 AI API Key。

## 克隆者快速启动

```powershell
git clone https://github.com/skatexgzhao/work-report.git
cd work-report
copy backend\.env.example backend\.env

cd backend && npm ci && npm test
cd ..\frontend && npm ci && npm run build
```

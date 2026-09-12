# work-report

[![CI](https://github.com/skatexgzhao/work-report/actions/workflows/ci.yml/badge.svg)](https://github.com/skatexgzhao/work-report/actions/workflows/ci.yml)

每天记一点工作内容，写周报、月报、季报时有现成素材；需要成稿时，可用 AI 帮你起稿，更省时省力地生成高质量汇报。

**作者：** [skatexg](https://github.com/skatexgzhao)  
**仓库：** [github.com/skatexgzhao/work-report](https://github.com/skatexgzhao/work-report)

## 功能概览

| 角色 | 能力 |
|------|------|
| 员工 | 日报填写与提交；个人周报/月报/季报；周期报告 AI 辅助生成 |
| 经理 | 团队周期报告、部门报告汇总；团队成员与进度相关管理 |
| 管理员 | 用户与角色、报告模板、团队、AI 提供商配置 |

### 核心能力

- **日报**：按模板记录「今日工作 / 风险 / 明日计划」，支持草稿、提交与修订。
- **周期报告**：个人与团队周报、月报、季报；可从日报或其它周期报告聚合素材。
- **AI 起稿**：对接 OpenAI 兼容 API（如 DeepSeek、通义、Kimi、智谱等，可配置）；未配置 Key 时相关功能优雅降级。
- **组织与权限**：部门、团队、JWT 登录；员工 / 经理 / 管理员角色隔离。

> 说明：仓库中仍保留部分早期「计划 + 旧版仪表盘」页面，日常主流程请使用登录后的 **`/app`** 工作台。

## 技术栈

- **前端：** Vue 3、Vite 6、Element Plus、Pinia、Vue Router  
- **后端：** Node.js、Express、SQLite3、JWT、bcryptjs  

## 项目结构

```
work-report/
├── backend/          # API、数据库迁移、测试
├── frontend/         # Vue 应用
├── deploy/           # Linux 部署脚本与配置示例
├── docs/             # 文档（含 GitHub 发布清单）
├── scripts/          # 开发/发布辅助脚本
└── package.json      # 根脚本：dev / build / start
```

## 快速开始

### 1. 安装依赖

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. 环境变量

复制 `backend/.env.example` 为 `backend/.env`，至少设置：

```env
JWT_SECRET=请改为足够长的随机字符串
PORT=3000
# 可选：AI_API_KEY 或 DEEPSEEK_API_KEY 等，详见 .env.example
```

也可在管理员界面 **AI 配置** 中填写模型与 Key（与环境变量二选一或互补）。

### 3. 启动

```bash
# 项目根目录：同时启动前后端
npm run dev

# 或分别启动
npm run dev:backend   # http://localhost:3000
npm run dev:frontend  # http://localhost:5173
```

生产环境可先 `npm run build` 构建前端，再 `npm start` 启动后端（详见 `deploy/README.md`）。

### 4. 演示账号（仅本地开发）

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 经理 | `manager` | `manager123` |
| 员工 | `employee` | `employee123` |

**切勿在生产环境保留默认密码。**

## 开发与验证

```bash
cd backend && npm test
cd ../frontend && npm run build
```

## 发布到 GitHub

推送前请阅读 [docs/GITHUB_PUBLISH.md](docs/GITHUB_PUBLISH.md)，并执行：

```powershell
powershell -NoProfile -File scripts/publish-security-check.ps1
```

安全策略见 [SECURITY.md](SECURITY.md)。

## 许可证

本项目以 [MIT License](LICENSE) 发布，版权归属 **skatexg**（2026）。

若包含自上游 MIT 项目衍生的代码，请同时保留 [NOTICE.md](NOTICE.md) 中的署名说明（MIT 要求）。

## 支持与反馈

- Bug 与功能建议：请在 [GitHub Issues](https://github.com/skatexgzhao/work-report/issues) 提交。  
- 部署与定制说明见 [SUPPORT.md](SUPPORT.md)。

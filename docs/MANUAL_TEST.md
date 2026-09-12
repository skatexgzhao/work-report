# 部门周期报告 V1 — 手工测试指南

## 1. 环境准备（推荐：一键重启）

**双击运行**（或在项目根目录执行）：

```powershell
d:\AI_Project\team-report\scripts\restart-dev.bat
```

脚本会自动：
- 停止旧进程（3000 / 5173 端口）
- 若缺少 `backend/.env` 则从 `.env.example` 创建
- 若依赖不完整则自动 `npm install`
- 在新窗口启动后端 + 前端

等待 5–10 秒后访问：**http://localhost:5173/login**

登录后进入 **首页**（`/app`）：可查看「使用地图」、按普通使用者/部门负责人角色说明的操作步骤，以及常用入口（管理功能在顶部菜单，不在首页展示）。

停止服务：双击 `scripts\stop-dev.bat`，或关闭两个 PowerShell 窗口。

---

### 手动启动（可选）

#### 后端

```powershell
cd d:\AI_Project\team-report\backend
copy .env.example .env
npm install
npm run dev
```

#### 前端

```powershell
cd d:\AI_Project\team-report\frontend
npm install
npm run dev
```

验证后端：

```powershell
curl http://localhost:3000/api/v1/health
```

应返回 `"status":"UP"`。

## 2. 演示账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 部门经理 | manager | manager123 |
| 普通员工 | employee | employee123 |

登录后进入 `/app` 新首页。

## 3. 测试路径 A — 员工日报 → 个人周报

1. 用 **employee** 登录
2. 进入 **我的日报** → 写今日日报 → 填写「今日完成」→ **保存草稿** → **提交**
3. 重复填写本周内至少 2–3 天日报并提交（素材用于周报）
4. 进入 **我的周期报告** → 选择「个人周报」→ **创建**
5. 在编辑页左侧查看素材来源（日报数量、缺失日期）
6. 右侧手动填写报告内容 → **保存草稿**
7. （可选）管理员先配置 AI Key，再点击 **AI 生成报告**
8. **提交** 个人周报
9. 底部查看 **版本链**（DRAFT → SUBMITTED）

## 4. 测试路径 B — 经理部门周报

1. 确保员工已提交本周 **个人周报**（路径 A 第 8 步）
2. 用 **manager** 登录
3. 进入 **部门报告** → 创建「部门周报」
4. 查看 **成员提交状态表**（employee 应为「已提交」）
5. 左侧素材区应显示已提交的个人周报内容
6. 保存草稿 / AI 生成 → 提交部门周报

## 5. 测试路径 C — 月报 / 季报

1. 用 **employee** 登录
2. **我的周期报告** → 选择「个人月报」或「个人季报」→ 创建
3. 确认周期边界正确（月：1 日~末日；季：Q1~Q4）

## 6. 测试路径 D — 管理员

1. 用 **admin** 登录
2. **AI 配置**：填写 Base URL、Model、API Key → 保存（Key 显示为 `****` 脱敏）
3. **模板管理**：点击模板 → 编辑 Prompt / Schema → **发布新版本**
4. 回到员工账号测试 AI 生成是否使用新模板

## 7. 权限验证

| 操作 | employee | manager | admin |
|------|----------|---------|-------|
| 查看他人日报草稿 | ✗ 403 | ✗ | ✗ |
| 部门报告列表 | ✗ | ✓ 本部门 | ✓ |
| 模板管理 | ✗ | ✗ | ✓ |
| AI 配置 | ✗ | ✗ | ✓ |

## 8. 自动化测试

```powershell
cd d:\AI_Project\team-report\backend
npm test
```

当前覆盖：权限矩阵、日报 CRUD、周期报告链路、部门汇总、管理员 API。

## 9. 常见问题

| 现象 | 处理 |
|------|------|
| AI 生成返回 503 | 管理员配置 AI Key，或设置环境变量 `AI_API_KEY` |
| 部门素材为空 | 确认员工已 **提交** 对应周期的个人报告 |
| 登录后 401 | 检查 `JWT_SECRET` 是否配置 |
| 数据库重置 | 删除 `backend/teamplan.db` 后重启服务 |

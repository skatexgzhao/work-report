# team-report 现有系统分析报告

> **分析日期**: 2026-09-11  
> **Comet Change**: `system-audit`  
> **项目代号**: team-report（基于 Weekly-Report Master / TeamPlan360）  
> **目的**: 为部门周期报告管理系统 V1 mega-change 提供改造依据

---

## 1. 当前架构

### 1.1 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端 | Vue 3 + Vite | 3.4 / 6.x |
| UI | Element Plus | 2.5 |
| 状态 | Pinia | — |
| 路由 | Vue Router | 4.3 |
| HTTP | Axios | — |
| 后端 | Node.js + Express | 4.19 |
| 数据库 | SQLite3 | 5.1.6 |
| 认证 | JWT + bcryptjs | — |
| AI | DeepSeek API（axios 直连） | — |

### 1.2 目录结构

```text
team-report/
├── backend/
│   ├── server.js              # 入口：DB 初始化、路由挂载
│   ├── middleware/auth.js     # JWT 验证、requireManager
│   └── routes/
│       ├── auth.js            # 登录、注册
│       ├── users.js           # 用户管理（经理）
│       ├── plans.js           # 年/月/周计划 CRUD
│       ├── reports.js         # 周/月/年报 + AI 亮点
│       └── ai-suggestions.js  # AI 计划分解、总结生成
├── frontend/
│   └── src/
│       ├── api/client.js      # Axios 实例 + Token 拦截
│       ├── router/index.js    # 3 路由 + 角色守卫
│       ├── stores/auth.js     # 认证状态
│       ├── views/             # Login, EmployeeDashboard, ManagerDashboard
│       └── components/        # 12 个业务组件
├── openspec/                  # OpenSpec 规格（Comet 新增）
└── docs/                      # 文档
```

### 1.3 请求流

```text
Browser (Vue, :5173)
    │  Axios + Bearer JWT
    ▼
Express (:3000)
    │  cors + express.json
    │  req.db = sqlite3('teamplan.db')
    ▼
Route Handler
    │  authenticateToken / requireManager
    ▼
SQLite (teamplan.db)
```

### 1.4 启动方式

```bash
npm run dev          # concurrently 启动前后端
npm run dev:backend  # nodemon backend/server.js
npm run dev:frontend # vite dev server
```

### 1.5 缺失的基础设施

| 项目 | 现状 |
|------|------|
| Docker | ❌ 无 Dockerfile / docker-compose |
| Migration | ❌ 无；Schema 在 server.js 内联 CREATE TABLE |
| 测试 | ❌ 无 unit/integration/e2e |
| 健康检查 | ❌ 无 /health / /ready |
| API 版本 | `/api/*`，非 `/api/v1` |
| 统一错误格式 | ❌ 各路由 `{ error: string }` 不一致 |

---

## 2. 当前数据库

### 2.1 初始化方式

- 文件：`backend/server.js` 第 24–147 行
- 方式：`CREATE TABLE IF NOT EXISTS` + `INSERT OR IGNORE` 默认用户
- 数据库文件：`backend/teamplan.db`（运行时生成）
- **未启用**: WAL、foreign_keys、busy_timeout（V1 要求启用）

### 2.2 表清单

#### users

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增 |
| username | TEXT UNIQUE | 登录名 |
| password | TEXT | bcrypt 哈希 |
| role | TEXT | `employee` / `manager` |
| department | TEXT | 部门名称（非 FK） |
| created_at | DATETIME | 默认 CURRENT_TIMESTAMP |

#### annual_plans

| 字段 | 类型 |
|------|------|
| id, user_id, year, title, description, objectives | — |
| status | DEFAULT 'pending' |
| created_at, updated_at | DATETIME |

FK: `user_id → users(id)`

#### monthly_plans

| 字段 | 类型 |
|------|------|
| id, user_id, year, month, title, description, objectives | — |
| tasks | TEXT（JSON 字符串） |
| annual_plan_id | INTEGER FK → annual_plans |
| status | DEFAULT 'pending' |

#### weekly_plans

| 字段 | 类型 |
|------|------|
| id, user_id, year, month, week, title, description, objectives | — |
| status | DEFAULT 'pending' |

#### weekly_reports

| 字段 | 类型 |
|------|------|
| id, user_id, year, month, week | — |
| achievements, challenges, next_week_plan | TEXT NOT NULL |
| highlights, summary | TEXT（AI 生成） |
| created_at | DATETIME |

#### monthly_reports

| 字段 | 类型 |
|------|------|
| id, user_id, year, month | — |
| summary, highlights | TEXT |
| created_at | DATETIME |

### 2.3 与 V1 目标模型差距

V1 需要 10 个新领域对象（departments, templates, daily_reports, period_reports 等），当前 **零重叠**。旧表将在 V1 中 **废弃**，不扩展。

---

## 3. 当前用户体系

### 3.1 角色

| 角色 | 创建方式 | 权限概览 |
|------|----------|----------|
| manager | 默认账号 `manager/manager123` | 注册员工、查看团队、进度监控 |
| employee | 默认账号或经理注册 | 计划、报告、AI 建议 |

**缺口**: 无 `admin` 角色（V1 需新增）。

### 3.2 部门

- `users.department` 为 **TEXT 字段**（如「技术部」）
- 无 `departments` 表、无 `user_departments` 关联表
- 无法做部门级数据隔离（经理可看任意 userId 的数据）

### 3.3 默认账号

| 用户名 | 密码 | 角色 | 部门 |
|--------|------|------|------|
| manager | manager123 | manager | 技术部 |
| employee | employee123 | employee | 技术部 |

---

## 4. 当前权限

### 4.1 认证中间件 (`backend/middleware/auth.js`)

```text
authenticateToken  → 解析 JWT，设置 req.user = { userId, username, role }
requireManager     → req.user.role === 'manager'
```

### 4.2 前端路由守卫 (`frontend/src/router/index.js`)

- `/employee` → `meta.role: 'employee'`
- `/manager` → `meta.role: 'manager'`
- 角色不匹配时重定向到对应 Dashboard

### 4.3 后端权限模式

| 模式 | 示例 | 问题 |
|------|------|------|
| 仅认证 | plans CRUD | 按 userId 过滤 |
| 经理可指定 userId | `GET /api/reports/weekly?userId=` | 无部门校验，可跨部门 |
| 经理专用 | users, register | requireManager |
| 资源归属 | `UPDATE ... WHERE user_id = ?` | 部分路由有，非统一 |

### 4.4 已知缺陷

- `users.js` 的 `lagging` 查询引用 `u.email`，但 **users 表无 email 列** → SQL 运行时报错
- 无统一 ownership 检查中间件
- 无 draft/submitted 状态隔离

---

## 5. 当前 AI 调用链路

### 5.1 两套 DeepSeek 集成（重复实现）

| 位置 | 函数 | 特点 |
|------|------|------|
| `routes/reports.js` | `generateAIContent(prompt)` | 简单调用，失败返回字符串 |
| `routes/ai-suggestions.js` | `generateAIContent(prompt, retries, tokens)` | 重试、JSON mode、超时 60s |

### 5.2 API 端点

| 路由 | 文件 | 用途 |
|------|------|------|
| POST `/api/reports/weekly` | reports.js | 提交周报时生成 highlights |
| POST `/api/reports/monthly/generate` | reports.js | 聚合周报 → 月报 AI |
| POST `/api/reports/annual/generate` | reports.js | 聚合月报 → 年报 AI（不落库） |
| POST `/api/reports/ai-suggestions` | reports.js | 工作建议 |
| POST `/api/ai-suggestions/annual-breakdown` | ai-suggestions.js | AI 分解年度计划 |
| POST `/api/ai-suggestions/monthly-breakdown` | ai-suggestions.js | AI 分解月度计划 |
| POST `/api/ai-suggestions/weekly-report-summary` | ai-suggestions.js | 周报 400 字总结 |
| POST `/api/ai-suggestions/summary-generation` | ai-suggestions.js | 周/月/年总结 JSON |

### 5.3 与 V1 差距

| V1 要求 | 现状 |
|---------|------|
| AIProvider 抽象 | ❌ 两处硬编码 DeepSeek |
| 结构化 JSON 输出 + Schema 校验 | 部分有，失败时 fallback 默认数据 |
| ai_executions 留痕 | ❌ 无 |
| 后端 Prompt 渲染 | ❌ 前端/路由内拼接 |
| Prompt 安全隔离 | ❌ 无 |
| API Key 加密存储 | ❌ 仅 .env |
| 并发控制（同 report 单 RUNNING） | ❌ 无 |

---

## 6. 当前 Report / Plan 实现

### 6.1 计划模块（⚠️ DEPRECATED — V1 废弃）

**路由前缀**: `/api/plans`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST/GET | `/annual` | 年度计划 |
| POST/GET | `/monthly` | 月度计划（含 tasks JSON） |
| POST/GET | `/weekly` | 周计划 |
| PUT/DELETE | `/:type/:id` | 更新/删除 |
| PUT | `/:type/:id/status` | 状态更新 |

**前端组件**: `AnnualPlans.vue`, `MonthlyPlans.vue`, `WeeklyPlans.vue`, `AnnualOverview.vue`

### 6.2 报告模块（⚠️ DEPRECATED — V1 废弃）

**路由前缀**: `/api/reports`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/weekly` | 提交周报 + AI highlights |
| PUT | `/weekly/:id` | 更新 summary |
| GET | `/weekly` | 列表（经理可 ?userId=） |
| POST | `/monthly/generate` | 从周报聚合生成月报 |
| GET | `/monthly` | 月报列表 |
| POST | `/annual/generate` | 从月报生成年报（仅返回 JSON，不存库） |
| POST | `/weekly/from-plan` | 从周计划提交周报 |
| POST | `/ai-suggestions` | AI 建议 |

**前端组件**: `WeeklyReports.vue`, `MonthlyReports.vue`, `AnnualSummary.vue`, `ReportGenerationFlow.vue`

### 6.3 业务流程（现有）

```text
年度计划 → AI 分解月计划 → 月计划 → 周计划 → 周报提交 → AI 亮点
                                              ↓
                                    月报聚合(AI) → 年报生成(AI, 不落库)
```

与 V1 目标流程（日报 → 周期报告 → 部门汇总）**完全不同**。

---

## 7. 可复用模块

| 模块 | 路径 | 复用建议 |
|------|------|----------|
| Express 入口结构 | `backend/server.js` | 保留框架，拆分 DB 初始化到 migration |
| JWT 认证 | `middleware/auth.js` | 扩展 role（+admin），增加 requireAdmin |
| 登录/注册 | `routes/auth.js` | 扩展 admin 注册逻辑 |
| bcrypt 密码 | auth.js, users.js | 直接复用 |
| Axios 客户端 | `frontend/src/api/client.js` | 扩展 baseURL 为 /api/v1 |
| Pinia auth store | `stores/auth.js` | 扩展 user 对象（department_id, role） |
| Element Plus UI | 全局 | 保留，新页面沿用 |
| Vue Router 守卫 | `router/index.js` | 扩展 admin 路由 |
| AI 重试逻辑 | `ai-suggestions.js` generateAIContent | 提取为 AIProvider 基础 |
| CI 前端构建 | `.github/workflows/ci.yml` | 扩展后端测试 |

---

## 8. 必须修改模块

| 模块 | 修改原因 | V1 动作 |
|------|----------|---------|
| `server.js` 内联 Schema | 无 Migration | 引入 migration 框架，新表独立 |
| `routes/plans.js` | V1 废弃 | 标记 deprecated，后期移除 |
| `routes/reports.js` | 模型不符 | 替换为 daily/period reports |
| `routes/ai-suggestions.js` | 非 V1 流程 | 重构为 AIProvider + ai_executions |
| `routes/users.js` | 无 admin、lagging SQL 有 bug | 扩展角色，修复 SQL |
| `users.department` TEXT | 无正规化 | 迁移到 departments 表 |
| 前端 Dashboard | 计划导向 UI | 重构为日报/周期报告页面 |
| 12 个旧组件 | 对应废弃模块 | 逐步替换，不一次性删除 |
| API 前缀 | V1 要求 /api/v1 | 新 API v1，旧 API 过渡期保留或 410 |

### 已确认决策

- 旧 plans + weekly/monthly_reports：**废弃**
- 新增 **`admin`** 角色
- Phase 0（本报告）完成后 → **单一 mega-change** 实施 V1

---

## 9. 兼容风险

| 风险 | 严重度 | 说明 |
|------|--------|------|
| 无 Migration 框架 | 🔴 高 | 任何 Schema 变更需从零引入 |
| 双 API 并存 | 🟡 中 | /api 旧 + /api/v1 新，前端需逐步切换 |
| 角色扩展 | 🟡 中 | JWT payload、路由守卫、中间件需同步 |
| 部门 TEXT → FK | 🟡 中 | 需数据迁移脚本（技术部 → department_id） |
| AI 双实现 | 🟡 中 | 合并为 AIProvider 避免行为不一致 |
| users.lagging SQL bug | 🟡 中 | 引用不存在的 email 列 |
| 无测试 | 🔴 高 | V1 要求 unit/integration/e2e |
| 无 Docker | 🟡 中 | V1 要求 docker-compose |
| demo 数据 | 🟢 低 | teamplan.db 可重建 |
| CI 仅前端 | 🟡 中 | 后端无 CI 步骤 |

---

## 10. 推荐改造方案

### 10.1 Change 策略

```text
[已完成] system-audit（本报告）
       ↓
[下一步] dept-period-report-v1（单一 mega-change，A2）
       ↓
  Phase 1 → Phase 7 按序实施
```

### 10.2 Mega-change 内部 Phase 映射

| Phase | 内容 | 依赖 |
|-------|------|------|
| **1. DB + Domain** | Migration 框架、10 新表、种子模板、SQLite WAL | audit ✅ |
| **2. 日报** | daily_reports CRUD/提交/权限 | Phase 1 |
| **3. 个人周报 + AI** | period_reports、AI 生成、版本链 | Phase 2 |
| **4. 部门周报** | 部门汇总、管理者视图 | Phase 3 |
| **5. 月报/季报** | 扩展 PeriodReport 抽象 | Phase 3 |
| **6. 模板 + AI 配置** | Template/Version 管理 UI、AIProvider | Phase 1 |
| **7. 测试 + Docker** | E2E 6 Case、docker-compose、/health | Phase 2-6 |

### 10.3 模块映射表（当前 → V1）

| 当前 | V1 替代 | 策略 |
|------|---------|------|
| weekly_plans | — | 废弃 |
| monthly_plans | — | 废弃 |
| annual_plans | — | 废弃 |
| weekly_reports | daily_reports + period_reports | 新建 |
| monthly_reports | period_reports (MONTHLY) | 新建 |
| users.department TEXT | departments + user_departments | 迁移 |
| role: employee/manager | + admin | 扩展 |
| /api/plans/* | — | 废弃 |
| /api/reports/* | /api/v1/daily-reports, period-reports | 新建 |
| generateAIContent ×2 | AIProvider + ai_executions | 重构 |
| EmployeeDashboard | 日报/周期报告页面 | 重构 |
| ManagerDashboard | 部门报告/团队状态 | 重构 |

### 10.4 建议实施原则

1. **扩展不重写**：保留 Express + Vue + SQLite + JWT 骨架
2. **新 API 走 /api/v1**：旧 API 标记 deprecated，mega-change 后期移除
3. **Migration 先行**：所有 Schema 变更必须通过 Migration
4. **AI 一次抽象**：Phase 3 前完成 AIProvider 接口
5. **权限统一中间件**：resource ownership + department + role 三层检查

---

## 附录 A：API 路由全覆盖清单

### 挂载点（server.js）

| 前缀 | 路由文件 |
|------|----------|
| `/api/auth` | auth.js |
| `/api/plans` | plans.js |
| `/api/reports` | reports.js |
| `/api/users` | users.js |
| `/api/ai-suggestions` | ai-suggestions.js |

### 端点明细（共 30 个）

**auth**: POST /login, POST /register  
**plans**: POST/GET /annual, POST/GET /monthly, POST/GET /weekly, PUT/DELETE /:type/:id, PUT /:type/:id/status  
**reports**: POST /weekly, PUT /weekly/:id, GET /weekly, POST /monthly/generate, GET /monthly, POST /annual/generate, POST /weekly/from-plan, POST /ai-suggestions  
**users**: GET /, GET /progress/:userId, GET /lagging, DELETE /:id, PUT /password  
**ai-suggestions**: POST /annual-breakdown, /monthly-breakdown, /weekly-report-summary, /summary-generation

---

## 附录 B：前端组件清单

| 组件 | 用途 | V1 状态 |
|------|------|---------|
| AISuggestions.vue | AI 建议 | 重构 |
| AnnualOverview.vue | 年度概览 | 废弃 |
| AnnualPlans.vue | 年度计划 | 废弃 |
| AnnualSummary.vue | 年度总结 | 废弃 |
| EmployeeManagement.vue | 员工管理 | 扩展 admin |
| MonthlyPlans.vue | 月度计划 | 废弃 |
| MonthlyReports.vue | 月度报告 | 废弃 |
| ProgressMonitoring.vue | 进度监控 | 重构为团队提交状态 |
| ReportGenerationFlow.vue | 报告生成流 | 重构 |
| TeamOverview.vue | 团队概览 | 保留/重构 |
| WeeklyPlans.vue | 周计划 | 废弃 |
| WeeklyReports.vue | 周报 | 废弃 |

---

## 附录 C：环境变量

| 变量 | 用途 | 必填 |
|------|------|------|
| JWT_SECRET | JWT 签名 | ✅（缺失则 exit） |
| DEEPSEEK_API_KEY | AI 功能 | 可选（缺失则 AI 降级） |
| PORT | 服务端口 | 默认 3000 |

---

*本报告由 Comet `system-audit` change 产出，不包含任何业务代码变更。*

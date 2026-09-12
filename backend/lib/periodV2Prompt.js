const { PERIOD_V2_OUTPUT_SCHEMA_DOC } = require('./periodContentV2')

const ANTI_FABRICATION = `【硬性约束】
1. 只能依据下方「素材」中的事实归纳，不得编造人名、项目、日期、指标或结论。
2. 素材中未出现的内容：不要写入成果/问题；若无法归纳某类内容，对应数组可为空数组。
3. 不得把缺失日期的日报当作已发生工作。`

const CONSOLIDATION_RULE = `【提炼与合并 — 务必遵守】
1. 成果（achievements）：同一项目/领域/服务对象下的多项任务、多条日报，必须合并为一条成果；禁止把同一项目拆成多条「成果1、成果2…」各写一个小任务。
2. 每条成果写清价值链条：domain=为谁/哪个业务或项目；title=合并后的主题；completion=1~2 句概括本周期做成了什么（不按日期流水）；outputs=合并去重后的关键产出（3~6 条为宜）；value=对业务/团队/项目的客观收益（效率、风险、质量、交付、成本等，素材无具体数字则写定性收益，勿编造指标）。
3. 全章 achievements 通常 3~5 条，宁可少而精，不要为了条数拆分。
4. 问题（issues）：同一根因/同一事项的多条现象合并为一条；计划（next_focus）：同一目标下的步骤合并为一条计划。`

const TEAM_DEPT_SUMMARY_RULE = `【汇总方式 — 务必遵守】
⚠ 这是汇总报告，不是日报搬运：请从素材中挑选对本周期最重要的成果、问题与计划（通常各 3~5 条），合并同类项。
⚠ 禁止按人按日逐条罗列日报流水账；禁止把每条日报原文复制进报告。
⚠ 同一业务线/项目下多人多任务，按项目或主题合并成果，不要按人头拆成大量碎条。`

function scopeKind(report) {
  if (report.report_type?.startsWith('DEPARTMENT_')) return 'department'
  if (report.report_type?.startsWith('TEAM_')) return 'team'
  return 'personal'
}

function buildScopeHint(report) {
  const kind = scopeKind(report)
  if (kind === 'department') {
    return `${TEAM_DEPT_SUMMARY_RULE}\n视角：部门管理者，面向部门整体进展与风险。`
  }
  if (kind === 'team') {
    return `${TEAM_DEPT_SUMMARY_RULE}\n视角：小组负责人，面向小组整体进展与风险。`
  }
  return '视角：个人本周期工作，从素材归纳，不要堆砌无关细节。'
}

function buildFocusBlock(focusTopics) {
  if (!focusTopics || !String(focusTopics).trim()) {
    return '【关注方向】用户未指定；请仍从素材中归纳最重要的内容。'
  }
  return `【关注方向】用户希望本报告侧重以下主题，请优先从素材中提取与之相关的事实进行归纳：\n${String(focusTopics).trim()}`
}

function buildPeriodV2Prompt(baseTemplate, vars) {
  const parts = [
    baseTemplate || '',
    '',
    ANTI_FABRICATION,
    CONSOLIDATION_RULE,
    vars.scopeHint || '',
    vars.focusBlock || '',
    '',
    `周期：${vars.startDate} ~ ${vars.endDate}`,
    `缺失日期（勿虚构这些日期的内容）：${vars.missingDates || '无'}`,
    '',
    '【素材】',
    vars.reportData || '（无素材）'
  ]
  return parts.filter(Boolean).join('\n')
}

function outputSchemaJsonForProvider() {
  return JSON.stringify(PERIOD_V2_OUTPUT_SCHEMA_DOC)
}

module.exports = {
  buildScopeHint,
  buildFocusBlock,
  buildPeriodV2Prompt,
  outputSchemaJsonForProvider,
  TEAM_DEPT_SUMMARY_RULE,
  CONSOLIDATION_RULE
}

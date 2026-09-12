export const PERIOD_PRINCIPLES_HEADLINE =
  '从素材归纳本周期重点；准确比篇幅更重要，生成后请核对事实。'

const BASE_PRINCIPLES = [
  {
    title: '写结果',
    body: '同一项目下多项任务合并成一条；写清为谁、做了什么、产出与收益，不要按日报条数拆成多条成果。'
  },
  {
    title: '问题写全',
    body: '影响、根因、已采取措施、方案与当前状态。'
  },
  {
    title: '计划可执行',
    body: '下周期写目标、预期产出与依赖，方便跟进。'
  }
]

const TEAM_DEPT_EXTRA = {
  title: '挑重点汇总',
  body: '⚠ 禁止把每人每天的工作流水账搬进周报；合并同类，只保留对团队/部门决策有价值的内容。'
}

export function periodPrinciplesForScope(scope) {
  if (scope === 'team' || scope === 'department') {
    return [TEAM_DEPT_EXTRA, ...BASE_PRINCIPLES]
  }
  return BASE_PRINCIPLES
}

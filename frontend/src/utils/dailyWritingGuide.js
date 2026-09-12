/** 日报写作引导（原则 + 短 hint + 追加范例） */

export const DAILY_PRINCIPLES_HEADLINE =
  '花 2 分钟记要点即可提交；准确比完整更重要，方便后续周报汇总。'

export const DAILY_PRINCIPLES = [
  {
    title: '写结果',
    body: '为谁、做了什么、产出什么写清楚，少写「跟进、调研」。'
  },
  {
    title: '会议记结论',
    body: '写定了什么、谁负责、何时完成，不必写「参加了某某会」。'
  },
  {
    title: '问题说全',
    body: '说明影响谁、试过什么、需要谁帮忙。'
  }
]

/** 输入框上方一行说明（勿放在左侧 label） */
export const DAILY_FIELD_HINTS = {
  completed:
    '每条建议写：为谁 / 哪件事 → 做了什么 → 产出什么（可看见的结果）。可分【已完成】【进行中】，进行中补充进度与卡点。',
  plan: '写明天要交付或推进的事，尽量写结果。',
  risk: '写影响、已尝试的办法、需要谁协助。'
}

export const DAILY_FIELD_ROWS = {
  completed: 10,
  risk: 6,
  plan: 5
}

/** 展示顺序（与模板 order 一致） */
export const DAILY_FIELD_ORDER = ['completed', 'risk', 'plan']

export const DAILY_FIELD_PLACEHOLDERS = {
  completed:
    '【已完成】例：\n1）订单组：修复登录验证码 → 产出测试通过的安装包\n2）部门例会：对齐发版时间 → 产出检查清单和负责人\n\n【进行中】例：\n1）报表导出（业务方）进度约七成，卡在分页性能',
  plan: '例：1）完成报表页自测并提交代码',
  risk: '例：测试机磁盘满，已清日志，需运维扩容'
}

/** 点击「追加范例」时追加到对应字段文末 */
export const DAILY_EXAMPLE_APPEND = {
  completed: `【已完成】
1）业务方（订单组）：修复登录验证码不显示 → 产出测试环境可登录、待上线版本
2）项目组例会：对齐本周五小版本 → 产出发版时间和检查清单（我负责核对）

【进行中】
1）报表导出（财务同事用）：开发约七成 → 卡在百万行导出超时，在试分页方案`,
  plan: `1）把导出功能自测完并提交代码
2）整理本周待办清单发给主管看一眼`,
  risk: `1）测试服务器磁盘快满了，导出可能失败；已清理临时文件，还需要运维帮忙扩容`
}

export function enrichDailyFormSchema(formSchema) {
  const orderIndex = Object.fromEntries(DAILY_FIELD_ORDER.map((key, i) => [key, i + 1]))
  const fields = (formSchema?.fields || []).map((field) => ({
    ...field,
    hint: DAILY_FIELD_HINTS[field.key] || field.hint,
    placeholder: DAILY_FIELD_PLACEHOLDERS[field.key] || field.placeholder,
    rows: DAILY_FIELD_ROWS[field.key] || field.rows,
    order: orderIndex[field.key] ?? field.order
  }))
  return { ...formSchema, fields }
}

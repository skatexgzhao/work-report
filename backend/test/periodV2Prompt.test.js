const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { buildPeriodV2Prompt, buildScopeHint, CONSOLIDATION_RULE } = require('../lib/periodV2Prompt')

describe('periodV2Prompt', () => {
  it('buildPeriodV2Prompt includes consolidation rules', () => {
    const prompt = buildPeriodV2Prompt('base', {
      startDate: '2026-01-01',
      endDate: '2026-01-07',
      missingDates: '无',
      reportData: '素材',
      scopeHint: buildScopeHint({ report_type: 'PERSONAL_WEEKLY' }),
      focusBlock: 'focus'
    })
    assert.match(prompt, /合并为一条成果/)
    assert.match(prompt, /提炼与合并/)
  })

  it('team scope hint mentions merge by project not by person', () => {
    const hint = buildScopeHint({ report_type: 'TEAM_WEEKLY' })
    assert.match(hint, /按项目或主题合并/)
  })
})

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const {
  enrichPeriodV2AfterAi,
  normalizePeriodV2Content,
  periodV2ContentFromEditor,
  formatPeriodV2ToSections,
  validatePeriodV2AchievementsRequired,
  validatePeriodReportContentForSave
} = require('../lib/periodContentV2')

describe('periodContentV2', () => {
  it('formatPeriodV2ToSections builds readable text', () => {
    const text = formatPeriodV2ToSections({
      achievements: [
        {
          domain: '授权中心',
          title: 'MySQL 升级',
          completion: '已完成',
          outputs: ['脚本', '回滚方案'],
          value: '降低风险'
        }
      ],
      issues: [],
      next_focus: []
    })
    assert.match(text.achievements, /【成果1】授权中心 · MySQL 升级/)
    assert.match(text.achievements, /关键产出/)
    assert.match(text.achievements, /- 脚本/)
  })

  it('normalizePeriodV2Content fills sections from arrays when missing', () => {
    const out = normalizePeriodV2Content({
      content_format: 'period_v2',
      achievements: [{ domain: 'A', title: 'B', completion: 'done', outputs: [], value: '' }],
      issues: [],
      next_focus: []
    })
    assert.ok(out.sections.achievements.includes('【成果1】'))
    assert.equal(out.sections.issues, '')
  })

  it('enrichPeriodV2AfterAi keeps arrays and sections', () => {
    const parsed = {
      achievements: [{ domain: 'X', title: 'Y', completion: 'c', outputs: ['o'], value: 'v' }],
      issues: [{ title: 'P', impact: 'i', root_cause: '', actions_taken: '', solution: '', status: '' }],
      next_focus: []
    }
    const out = enrichPeriodV2AfterAi(parsed)
    assert.equal(out.achievements.length, 1)
    assert.match(out.sections.achievements, /【成果1】/)
    assert.match(out.sections.issues, /【问题1】/)
  })

  it('validatePeriodV2AchievementsRequired rejects empty achievements', () => {
    assert.ok(
      validatePeriodV2AchievementsRequired({
        sections: { achievements: '', issues: '仅有问题', next_focus: '' }
      })
    )
    assert.equal(
      validatePeriodV2AchievementsRequired({
        sections: { achievements: '有成果', issues: '', next_focus: '' }
      }),
      null
    )
  })

  it('validatePeriodReportContentForSave accepts legacy key_results', () => {
    const err = validatePeriodReportContentForSave(
      { content_format: 'period_v1' },
      { key_results: ['上线完成'] }
    )
    assert.equal(err, null)
  })

  it('periodV2ContentFromEditor uses sections only', () => {
    const out = periodV2ContentFromEditor({
      sections: { achievements: '用户正文', issues: '', next_focus: '' },
      achievements: [{ domain: 'old' }]
    })
    assert.equal(out.sections.achievements, '用户正文')
    assert.deepEqual(out.achievements, [])
  })
})

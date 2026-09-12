const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const {
  defaultSourceTypes,
  defaultSourceConfig,
  allowedSourceTypes,
  validateSourceConfig,
  diffSourceConfig,
  hasSourceConfigChanges
} = require('../lib/sourceConfig')

describe('sourceConfig', () => {
  it('uses single-level defaults for personal reports', () => {
    assert.deepEqual(defaultSourceTypes('PERSONAL_WEEKLY'), ['DAILY'])
    assert.deepEqual(defaultSourceTypes('PERSONAL_MONTHLY'), ['PERSONAL_WEEKLY'])
    assert.deepEqual(defaultSourceTypes('PERSONAL_QUARTERLY'), ['PERSONAL_MONTHLY'])
  })

  it('uses team member scoped defaults for team reports', () => {
    assert.deepEqual(defaultSourceTypes('TEAM_WEEKLY'), ['PERSONAL_WEEKLY'])
    assert.deepEqual(defaultSourceTypes('TEAM_MONTHLY'), ['PERSONAL_MONTHLY'])
    assert.deepEqual(defaultSourceTypes('TEAM_QUARTERLY'), ['PERSONAL_QUARTERLY'])
  })

  it('team reports allow default personal source or daily (single choice)', () => {
    assert.equal(validateSourceConfig('TEAM_WEEKLY', { sourceTypes: ['PERSONAL_WEEKLY'] }), null)
    assert.equal(validateSourceConfig('TEAM_WEEKLY', { sourceTypes: ['DAILY'] }), null)
    assert.ok(validateSourceConfig('TEAM_WEEKLY', { sourceTypes: ['TEAM_WEEKLY'] }))
    assert.ok(validateSourceConfig('TEAM_WEEKLY', { sourceTypes: ['PERSONAL_WEEKLY', 'DAILY'] }))
  })

  it('uses team report defaults for department reports', () => {
    assert.deepEqual(defaultSourceTypes('DEPARTMENT_WEEKLY'), ['TEAM_WEEKLY'])
    assert.deepEqual(defaultSourceTypes('DEPARTMENT_MONTHLY'), ['TEAM_MONTHLY'])
    assert.deepEqual(defaultSourceTypes('DEPARTMENT_QUARTERLY'), ['TEAM_QUARTERLY'])
  })

  it('personal monthly defaults to weekly but may switch to daily', () => {
    const allowed = allowedSourceTypes('PERSONAL_MONTHLY')
    assert.deepEqual(allowed, ['PERSONAL_WEEKLY', 'DAILY'])
    assert.equal(validateSourceConfig('PERSONAL_MONTHLY', { sourceTypes: ['PERSONAL_WEEKLY'] }), null)
    assert.equal(validateSourceConfig('PERSONAL_MONTHLY', { sourceTypes: ['DAILY'] }), null)
  })

  it('rejects unsupported source type', () => {
    assert.ok(validateSourceConfig('PERSONAL_WEEKLY', { sourceTypes: ['TEAM_WEEKLY'] }))
  })

  it('department team scope may pick team weekly or personal weekly (not both)', () => {
    assert.equal(
      validateSourceConfig('DEPARTMENT_WEEKLY', { scopeMode: 'team', sourceTypes: ['PERSONAL_WEEKLY'] }),
      null
    )
    assert.equal(
      validateSourceConfig('DEPARTMENT_WEEKLY', { scopeMode: 'team', sourceTypes: ['DAILY'] }),
      null
    )
    assert.ok(
      validateSourceConfig('DEPARTMENT_WEEKLY', {
        scopeMode: 'team',
        sourceTypes: ['TEAM_WEEKLY', 'PERSONAL_WEEKLY']
      })
    )
  })

  it('defaults department reports to team scope mode', () => {
    const config = defaultSourceConfig('DEPARTMENT_WEEKLY')
    assert.equal(config.scopeMode, 'team')
    assert.deepEqual(config.sourceTypes, ['TEAM_WEEKLY'])
  })

  it('detects source config diff', () => {
    const diff = diffSourceConfig(
      { sourceTypes: ['PERSONAL_WEEKLY'], referenceUserIds: [], referenceTeamIds: [], includeAllMembers: true },
      { sourceTypes: ['DAILY', 'PERSONAL_WEEKLY'], referenceUserIds: [], referenceTeamIds: [], includeAllMembers: true }
    )
    assert.deepEqual(diff.sourceTypesAdded, ['DAILY'])
    assert.equal(hasSourceConfigChanges(diff), true)
  })
})

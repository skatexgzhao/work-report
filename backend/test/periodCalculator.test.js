const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const {
  weeklyRange,
  monthlyRange,
  quarterlyRange,
  calculatePeriodRange,
  eachDateInclusive
} = require('../lib/periodCalculator')

describe('periodCalculator', () => {
  it('calculates weekly range from Wednesday anchor', () => {
    const range = weeklyRange('2026-09-09')
    assert.equal(range.startDate, '2026-09-07')
    assert.equal(range.endDate, '2026-09-13')
  })

  it('calculates monthly range', () => {
    const range = monthlyRange('2026-09-15')
    assert.equal(range.startDate, '2026-09-01')
    assert.equal(range.endDate, '2026-09-30')
  })

  it('calculates quarterly range for Q3', () => {
    const range = quarterlyRange('2026-08-20')
    assert.equal(range.startDate, '2026-07-01')
    assert.equal(range.endDate, '2026-09-30')
  })

  it('supports PERSONAL_WEEKLY via calculatePeriodRange', () => {
    const range = calculatePeriodRange('PERSONAL_WEEKLY', '2026-09-09')
    assert.equal(range.startDate, '2026-09-07')
    assert.equal(range.endDate, '2026-09-13')
  })

  it('lists each date inclusive', () => {
    const dates = eachDateInclusive('2026-09-01', '2026-09-03')
    assert.deepEqual(dates, ['2026-09-01', '2026-09-02', '2026-09-03'])
  })
})

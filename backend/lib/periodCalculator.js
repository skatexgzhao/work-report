function padDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function startOfWeekMonday(date) {
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const start = new Date(date)
  start.setDate(date.getDate() + diff)
  start.setHours(0, 0, 0, 0)
  return start
}

function endOfWeekSunday(date) {
  const start = startOfWeekMonday(date)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

function weeklyRange(anchorDate) {
  const date = typeof anchorDate === 'string' ? parseDate(anchorDate) : anchorDate
  const start = startOfWeekMonday(date)
  const end = endOfWeekSunday(date)
  return { startDate: padDate(start), endDate: padDate(end) }
}

function monthlyRange(anchorDate) {
  const date = typeof anchorDate === 'string' ? parseDate(anchorDate) : anchorDate
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { startDate: padDate(start), endDate: padDate(end) }
}

function quarterlyRange(anchorDate) {
  const date = typeof anchorDate === 'string' ? parseDate(anchorDate) : anchorDate
  const month = date.getMonth()
  const quarter = Math.floor(month / 3)
  const startMonth = quarter * 3
  const start = new Date(date.getFullYear(), startMonth, 1)
  const end = new Date(date.getFullYear(), startMonth + 3, 0, 23, 59, 59, 999)
  return { startDate: padDate(start), endDate: padDate(end) }
}

function calculatePeriodRange(reportType, anchorDate) {
  const anchor = anchorDate || padDate(new Date())
  switch (reportType) {
    case 'PERSONAL_WEEKLY':
    case 'DEPARTMENT_WEEKLY':
    case 'TEAM_WEEKLY':
      return weeklyRange(anchor)
    case 'PERSONAL_MONTHLY':
    case 'DEPARTMENT_MONTHLY':
    case 'TEAM_MONTHLY':
      return monthlyRange(anchor)
    case 'PERSONAL_QUARTERLY':
    case 'DEPARTMENT_QUARTERLY':
    case 'TEAM_QUARTERLY':
      return quarterlyRange(anchor)
    default:
      throw new Error(`Unsupported report type: ${reportType}`)
  }
}

function eachDateInclusive(startDate, endDate) {
  const dates = []
  const current = parseDate(startDate)
  const end = parseDate(endDate)
  while (current <= end) {
    dates.push(padDate(current))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

function assertRangeMatches(reportType, anchorDate, startDate, endDate) {
  const calculated = calculatePeriodRange(reportType, anchorDate)
  if (calculated.startDate !== startDate || calculated.endDate !== endDate) {
    return calculated
  }
  return null
}

module.exports = {
  padDate,
  parseDate,
  weeklyRange,
  monthlyRange,
  quarterlyRange,
  calculatePeriodRange,
  eachDateInclusive,
  assertRangeMatches
}

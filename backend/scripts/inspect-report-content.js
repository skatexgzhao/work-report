const sqlite3 = require('sqlite3')
const path = require('path')

const reportId = Number(process.argv[2] || 17)
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'teamplan.db')
const db = new sqlite3.Database(dbPath)

db.get('SELECT * FROM period_reports WHERE id = ?', [reportId], (err, report) => {
  console.log('report:', report)
  db.get(
    'SELECT id, version, version_type, content_json FROM period_report_versions WHERE id = ?',
    [report?.current_version_id],
    (err2, ver) => {
      console.log('current version:', ver)
      db.close()
    }
  )
})

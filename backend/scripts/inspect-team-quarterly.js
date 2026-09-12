const sqlite3 = require('sqlite3')
const path = require('path')

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'teamplan.db')
const db = new sqlite3.Database(dbPath)

db.all(
  `SELECT pr.id, pr.report_type, pr.status, pr.current_version_id, pr.content_format
   FROM period_reports pr
   WHERE pr.report_type = 'TEAM_QUARTERLY'
   ORDER BY pr.id DESC LIMIT 5`,
  [],
  (err, reports) => {
    if (err) {
      console.error(err)
      db.close()
      return
    }
    console.log('TEAM_QUARTERLY reports:', JSON.stringify(reports, null, 2))
    const id = reports?.[0]?.id
    if (!id) {
      db.close()
      return
    }
    db.all(
      `SELECT id, version, version_type, length(content_json) AS len,
              substr(content_json, 1, 200) AS preview
       FROM period_report_versions WHERE report_id = ? ORDER BY version DESC LIMIT 5`,
      [id],
      (err2, versions) => {
        console.log(`versions for report ${id}:`, JSON.stringify(versions, null, 2))
        db.all(
          `SELECT report_id, version, length(content_json) AS len
           FROM period_report_versions
           WHERE length(content_json) > 140
           ORDER BY id DESC LIMIT 10`,
          [],
          (err3, nonempty) => {
            console.log('recent versions with content_json len > 140:', JSON.stringify(nonempty, null, 2))
            db.close()
          }
        )
      }
    )
  }
)

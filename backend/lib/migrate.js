const fs = require('fs')
const path = require('path')

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations')

function runSql(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err)
      else resolve(this)
    })
  })
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
}

async function ensureMigrationsTable(db) {
  await runSql(db, `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

async function runMigrations(db) {
  await ensureMigrationsTable(db)

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return { applied: [] }
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  const applied = []

  for (const file of files) {
    const existing = await all(db, 'SELECT name FROM schema_migrations WHERE name = ?', [file])
    if (existing.length > 0) {
      continue
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
    await runSql(db, sql)
    await run(db, 'INSERT INTO schema_migrations (name) VALUES (?)', [file])
    applied.push(file)
    console.log(`Migration applied: ${file}`)
  }

  return { applied }
}

module.exports = { runMigrations, MIGRATIONS_DIR }

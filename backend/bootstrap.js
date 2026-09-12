const { initDb } = require('./lib/db')
const { runMigrations } = require('./lib/migrate')
const { seedAdminUser } = require('./lib/seed')

function runSql(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

async function initLegacySchema(db) {
  await runSql(db, `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS annual_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      objectives TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS monthly_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      objectives TEXT,
      tasks TEXT,
      annual_plan_id INTEGER,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (annual_plan_id) REFERENCES annual_plans (id)
    );

    CREATE TABLE IF NOT EXISTS weekly_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      week INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      objectives TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS weekly_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      week INTEGER NOT NULL,
      achievements TEXT NOT NULL,
      challenges TEXT NOT NULL,
      next_week_plan TEXT NOT NULL,
      highlights TEXT,
      summary TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS monthly_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      summary TEXT NOT NULL,
      highlights TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `)
}

async function seedDefaultUsers(db) {
  const bcrypt = require('bcryptjs')
  const managerHash = await bcrypt.hash('manager123', 10)
  const employeeHash = await bcrypt.hash('employee123', 10)

  await new Promise((resolve, reject) => {
    db.run(
      `INSERT OR IGNORE INTO users (username, password, role, department) VALUES (?, ?, ?, ?)`,
      ['manager', managerHash, 'manager', '技术部'],
      (err) => (err ? reject(err) : resolve())
    )
  })

  await new Promise((resolve, reject) => {
    db.run(
      `INSERT OR IGNORE INTO users (username, password, role, department) VALUES (?, ?, ?, ?)`,
      ['employee', employeeHash, 'employee', '技术部'],
      (err) => (err ? reject(err) : resolve())
    )
  })
}

async function bootstrapDatabase() {
  const db = await initDb()
  await initLegacySchema(db)
  await seedDefaultUsers(db)
  await runMigrations(db)
  await seedAdminUser(db)
  return db
}

module.exports = { bootstrapDatabase, initLegacySchema, seedDefaultUsers }

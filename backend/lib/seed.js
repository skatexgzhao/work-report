const bcrypt = require('bcryptjs')

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err)
      else resolve(this)
    })
  })
}

async function seedAdminUser(db) {
  const hash = await bcrypt.hash('admin123', 10)
  await run(
    db,
    `INSERT OR IGNORE INTO users (username, password, role, department) VALUES (?, ?, ?, ?)`,
    ['admin', hash, 'admin', '技术部']
  )

  await run(
    db,
    `INSERT OR IGNORE INTO user_departments (user_id, department_id)
     SELECT u.id, d.id FROM users u, departments d
     WHERE u.username = 'admin' AND d.name = '技术部'`
  )
}

module.exports = { seedAdminUser }

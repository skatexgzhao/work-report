const { get } = require('./dbUtil')

async function findUserWithDepartment(db, userId) {
  return get(
    db,
    `SELECT u.id, u.username, u.role, u.department, ud.department_id
     FROM users u
     LEFT JOIN user_departments ud ON ud.user_id = u.id
     WHERE u.id = ?`,
    [userId]
  )
}

async function findUserByUsername(db, username) {
  return get(db, 'SELECT * FROM users WHERE username = ?', [username])
}

module.exports = { findUserWithDepartment, findUserByUsername }

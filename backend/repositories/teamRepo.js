const { get, all, run } = require('../lib/dbUtil')

async function findById(db, id) {
  return get(
    db,
    `SELECT t.*, u.username AS leader_username
     FROM teams t
     LEFT JOIN users u ON u.id = t.leader_user_id
     WHERE t.id = ?`,
    [id]
  )
}

async function listByDepartment(db, departmentId) {
  return all(
    db,
    `SELECT t.*, u.username AS leader_username,
      (SELECT COUNT(*) FROM user_teams ut WHERE ut.team_id = t.id) AS member_count
     FROM teams t
     LEFT JOIN users u ON u.id = t.leader_user_id
     WHERE t.department_id = ?
     ORDER BY t.name`,
    [departmentId]
  )
}

async function insertTeam(db, { departmentId, name, leaderUserId }) {
  const result = await run(
    db,
    `INSERT INTO teams (department_id, name, leader_user_id, status) VALUES (?, ?, ?, 'ACTIVE')`,
    [departmentId, name, leaderUserId ?? null]
  )
  return findById(db, result.lastID)
}

async function updateTeam(db, id, { name, leaderUserId, status }) {
  await run(
    db,
    `UPDATE teams SET
      name = COALESCE(?, name),
      leader_user_id = COALESCE(?, leader_user_id),
      status = COALESCE(?, status),
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name ?? null, leaderUserId ?? null, status ?? null, id]
  )
  return findById(db, id)
}

async function listMembers(db, teamId) {
  return all(
    db,
    `SELECT u.id, u.username, u.role
     FROM users u
     JOIN user_teams ut ON ut.user_id = u.id
     WHERE ut.team_id = ?
     ORDER BY u.username`,
    [teamId]
  )
}

async function setMembers(db, teamId, userIds) {
  await run(db, 'DELETE FROM user_teams WHERE team_id = ?', [teamId])
  for (const userId of userIds) {
    await run(db, 'INSERT OR REPLACE INTO user_teams (user_id, team_id) VALUES (?, ?)', [userId, teamId])
  }
  return listMembers(db, teamId)
}

module.exports = {
  findById,
  listByDepartment,
  insertTeam,
  updateTeam,
  listMembers,
  setMembers
}

const { AppError } = require('../lib/errors')
const { all } = require('../lib/dbUtil')
const teamRepo = require('../repositories/teamRepo')

function assertCanManageTeams(user) {
  if (user.role === 'admin' || user.role === 'manager') return
  throw new AppError('FORBIDDEN', '需要管理者权限', 403)
}

async function assertTeamInDepartment(db, teamId, departmentId) {
  const team = await teamRepo.findById(db, teamId)
  if (!team) {
    throw new AppError('TEAM_NOT_FOUND', '小组不存在', 404)
  }
  if (team.department_id !== departmentId) {
    throw new AppError('FORBIDDEN', '无权访问该小组', 403)
  }
  return team
}

async function listTeams(db, user, { departmentId } = {}) {
  assertCanManageTeams(user)
  const targetDepartmentId = user.role === 'admin' && departmentId ? departmentId : user.departmentId
  if (!targetDepartmentId) {
    throw new AppError('DEPARTMENT_REQUIRED', '用户未分配部门', 400)
  }
  if (user.role === 'manager' && departmentId && departmentId !== user.departmentId) {
    throw new AppError('FORBIDDEN', '无权查看其他部门小组', 403)
  }
  return teamRepo.listByDepartment(db, targetDepartmentId)
}

async function getTeam(db, user, teamId) {
  if (!user.departmentId && user.role !== 'admin') {
    throw new AppError('DEPARTMENT_REQUIRED', '用户未分配部门', 400)
  }
  const team = await teamRepo.findById(db, teamId)
  if (!team) {
    throw new AppError('TEAM_NOT_FOUND', '小组不存在', 404)
  }
  if (user.role !== 'admin' && team.department_id !== user.departmentId) {
    throw new AppError('FORBIDDEN', '无权访问该小组', 403)
  }
  const members = await teamRepo.listMembers(db, teamId)
  return { ...team, members }
}

async function createTeam(db, user, { name, leaderUserId, memberUserIds = [] }) {
  assertCanManageTeams(user)
  if (!user.departmentId) {
    throw new AppError('DEPARTMENT_REQUIRED', '用户未分配部门', 400)
  }
  if (!name?.trim()) {
    throw new AppError('VALIDATION_ERROR', '小组名称不能为空', 400)
  }

  const team = await teamRepo.insertTeam(db, {
    departmentId: user.departmentId,
    name: name.trim(),
    leaderUserId
  })

  if (memberUserIds.length) {
    await validateDepartmentMembers(db, user.departmentId, memberUserIds)
    await teamRepo.setMembers(db, team.id, memberUserIds)
  }

  return getTeam(db, user, team.id)
}

async function updateTeam(db, user, teamId, payload) {
  assertCanManageTeams(user)
  await assertTeamInDepartment(db, teamId, user.departmentId)
  await teamRepo.updateTeam(db, teamId, payload)
  if (payload.memberUserIds) {
    await validateDepartmentMembers(db, user.departmentId, payload.memberUserIds)
    await teamRepo.setMembers(db, teamId, payload.memberUserIds)
  }
  return getTeam(db, user, teamId)
}

async function validateDepartmentMembers(db, departmentId, userIds) {
  const rows = await all(
    db,
    `SELECT u.id FROM users u
     JOIN user_departments ud ON ud.user_id = u.id
     WHERE ud.department_id = ? AND u.id IN (${userIds.map(() => '?').join(',')})`,
    [departmentId, ...userIds]
  )
  if (rows.length !== userIds.length) {
    throw new AppError('VALIDATION_ERROR', '成员必须属于同一部门', 400)
  }
}

async function listDepartmentMembers(db, user) {
  if (!user.departmentId) {
    throw new AppError('DEPARTMENT_REQUIRED', '用户未分配部门', 400)
  }
  return all(
    db,
    `SELECT u.id, u.username, u.role
     FROM users u
     JOIN user_departments ud ON ud.user_id = u.id
     WHERE ud.department_id = ?
     ORDER BY u.username`,
    [user.departmentId]
  )
}

module.exports = {
  listTeams,
  getTeam,
  createTeam,
  updateTeam,
  listDepartmentMembers
}

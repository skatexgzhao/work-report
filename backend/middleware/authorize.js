const { v1Error } = require('./v1Respond')

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return v1Error(res, 'FORBIDDEN', '需要管理员权限', 403)
  }
  next()
}

function requireManager(req, res, next) {
  if (req.user.role !== 'manager' && req.user.role !== 'admin') {
    return v1Error(res, 'FORBIDDEN', '需要管理者权限', 403)
  }
  next()
}

function requireManagerOrAdmin(req, res, next) {
  return requireManager(req, res, next)
}

function assertSameDepartmentUnlessAdmin(req, res, targetDepartmentId) {
  if (req.user.role === 'admin') {
    return true
  }
  if (!req.user.departmentId || req.user.departmentId !== targetDepartmentId) {
    v1Error(res, 'FORBIDDEN', '无权访问其他部门数据', 403)
    return false
  }
  return true
}

function assertResourceOwner(req, res, ownerUserId) {
  if (req.user.role === 'admin') {
    return true
  }
  if (req.user.userId !== ownerUserId) {
    v1Error(res, 'FORBIDDEN', '无权访问他人资源', 403)
    return false
  }
  return true
}

function requireResourceOwner(getOwnerUserId) {
  return (req, res, next) => {
    Promise.resolve(getOwnerUserId(req))
      .then((ownerUserId) => {
        if (ownerUserId == null) {
          return v1Error(res, 'NOT_FOUND', '资源不存在', 404)
        }
        if (!assertResourceOwner(req, res, ownerUserId)) {
          return
        }
        next()
      })
      .catch(next)
  }
}

module.exports = {
  requireAdmin,
  requireManager,
  requireManagerOrAdmin,
  assertSameDepartmentUnlessAdmin,
  assertResourceOwner,
  requireResourceOwner
}

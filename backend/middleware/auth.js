const jwt = require('jsonwebtoken')
const { v1Error } = require('./v1Respond')

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]
  const isV1 = req.originalUrl.startsWith('/api/v1')

  if (!token) {
    if (isV1) {
      return v1Error(res, 'UNAUTHORIZED', '需要登录', 401)
    }
    return res.status(401).json({ error: 'Access token required' })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (isV1) {
        return v1Error(res, 'INVALID_TOKEN', '登录已失效', 403)
      }
      return res.status(403).json({ error: 'Invalid token' })
    }

    req.user = user
    next()
  })
}

function requireManager(req, res, next) {
  if (req.user.role !== 'manager' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Manager access required' })
  }
  next()
}

module.exports = {
  authenticateToken,
  requireManager
}

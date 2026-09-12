const crypto = require('crypto')

function requestIdMiddleware(req, res, next) {
  const requestId = crypto.randomUUID()
  res.locals.requestId = requestId
  req.requestId = requestId
  next()
}

module.exports = requestIdMiddleware

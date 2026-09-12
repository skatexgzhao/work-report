function v1Error(res, code, message, statusCode = 400) {
  return res.status(statusCode).json({
    code,
    message,
    requestId: res.locals.requestId || 'unknown'
  })
}

module.exports = { v1Error }

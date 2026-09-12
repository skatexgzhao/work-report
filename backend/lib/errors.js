class AppError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message)
    this.code = code
    this.statusCode = statusCode
    this.name = 'AppError'
  }
}

function errorHandler(err, req, res, _next) {
  const requestId = res.locals.requestId || 'unknown'

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      requestId
    })
  }

  console.error(`[${requestId}]`, err.stack || err)
  return res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: '服务器内部错误',
    requestId
  })
}

module.exports = { AppError, errorHandler }

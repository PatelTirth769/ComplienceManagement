const { ValidationError } = require('../services/scoringService');

/**
 * Centralized Error Handling Middleware
 */
function errorHandler(err, req, res, next) {
  const isValidationError = err instanceof ValidationError || err.name === 'ValidationError';

  if (!isValidationError && process.env.NODE_ENV !== 'test') {
    console.error('[Error Middleware]:', err);
  }

  if (isValidationError) {
    const errorResponse = {
      code: err.code || 'VALIDATION_ERROR',
      message: err.message
    };
    if (err.itemId) {
      errorResponse.itemId = err.itemId;
    }
    return res.status(400).json({
      success: false,
      error: errorResponse
    });
  }

  // Syntax error from bad JSON payload
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Invalid JSON request body payload.'
      }
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    success: false,
    error: err.message || 'An unexpected error occurred.',
    code: err.code || 'INTERNAL_SERVER_ERROR'
  });
}

module.exports = errorHandler;

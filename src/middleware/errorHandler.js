const { apiResponse } = require('../utils/helpers');

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  if (err.code === 'P2002') {
    return apiResponse(res, 409, 'Data sudah ada (duplikat)');
  }

  if (err.code === 'P2025') {
    return apiResponse(res, 404, 'Data tidak ditemukan');
  }

  return apiResponse(
    res,
    err.statusCode || 500,
    err.message || 'Terjadi kesalahan pada server'
  );
}

/**
 * 404 handler
 */
function notFoundHandler(req, res) {
  return apiResponse(res, 404, `Route ${req.method} ${req.originalUrl} tidak ditemukan`);
}

module.exports = { errorHandler, notFoundHandler };

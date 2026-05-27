const supabase = require('../config/supabase');
const { apiResponse } = require('../utils/helpers');

/**
 * Middleware to protect routes using Supabase Auth JWT
 */
async function protect(req, res, next) {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
      // Fallback for file downloads (window.open) which pass token in URL
      token = req.query.token;
    }

    if (!token) {
      return apiResponse(res, 401, 'Akses ditolak. Token tidak ditemukan.');
    }

    // Verify token using Supabase Client
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Supabase auth.getUser error:', error);
      return apiResponse(res, 401, 'Sesi tidak valid atau telah berakhir.');
    }

    // Attach user information to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    return apiResponse(res, 401, 'Terjadi kesalahan autentikasi.');
  }
}

module.exports = { protect };

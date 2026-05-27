const supabase = require('../config/supabase');
const supabaseAdmin = require('../config/supabaseAdmin');
const { apiResponse } = require('../utils/helpers');

class AuthController {
  /**
   * POST /api/login - Sign in user with email and password using Supabase Auth
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return apiResponse(res, 400, 'Email dan password wajib diisi');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return apiResponse(res, 400, error.message);
      }

      return apiResponse(res, 200, 'Login berhasil', {
        user: data.user,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/logout - Sign out user
   */
  async logout(req, res, next) {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return apiResponse(res, 400, error.message);
      }
      return apiResponse(res, 200, 'Logout berhasil');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users - List all registered users (protected, admin only)
   */
  async listUsers(req, res, next) {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers();

      if (error) {
        return apiResponse(res, 500, error.message);
      }

      const users = data.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }));

      return apiResponse(res, 200, 'Daftar panitia berhasil diambil', { users });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/users - Create a new panitia user (protected, admin only)
   */
  async createUser(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return apiResponse(res, 400, 'Email dan password wajib diisi');
      }

      if (password.length < 6) {
        return apiResponse(res, 400, 'Password minimal 6 karakter');
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm so they can login immediately
      });

      if (error) {
        return apiResponse(res, 400, error.message);
      }

      return apiResponse(res, 201, 'Akun panitia baru berhasil dibuat', {
        user: {
          id: data.user.id,
          email: data.user.email,
          created_at: data.user.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/users/:id - Delete a panitia user (protected, admin only)
   */
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;

      // Prevent deleting yourself
      if (req.user.id === id) {
        return apiResponse(res, 400, 'Tidak bisa menghapus akun Anda sendiri');
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

      if (error) {
        return apiResponse(res, 400, error.message);
      }

      return apiResponse(res, 200, 'Akun panitia berhasil dihapus');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();

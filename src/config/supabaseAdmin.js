const { createClient } = require('@supabase/supabase-js');
const config = require('./index');

// Admin client with service_role key — can create/delete users
// This should NEVER be exposed to the frontend
const supabaseAdmin = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey || 'placeholder',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

module.exports = supabaseAdmin;

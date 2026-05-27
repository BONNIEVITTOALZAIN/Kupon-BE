const { createClient } = require('@supabase/supabase-js');
const config = require('./index');

if (!config.supabaseUrl || !config.supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials are not fully configured. Auth middleware may fail.');
}

const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey || 'placeholder');

module.exports = supabase;

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn(
    '[supabase] WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. ' +
    'Supabase client will not function correctly.'
  );
}

// Service role client — bypasses RLS. Use only in the agent process (server-side).
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseServiceRoleKey ?? 'placeholder-service-role-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

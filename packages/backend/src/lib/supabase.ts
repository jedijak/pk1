import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) throw new Error('Missing env var: SUPABASE_URL');
if (!SUPABASE_ANON_KEY) throw new Error('Missing env var: SUPABASE_ANON_KEY');

/**
 * Creates a Supabase client scoped to the given user JWT.
 * Row-Level Security policies will apply based on the token's sub claim.
 */
export function createSupabaseClient(token: string) {
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * A singleton Supabase client using the service role key.
 * Bypasses RLS — use only for agent/admin operations.
 */
export const supabaseAdmin = createClient(
  SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

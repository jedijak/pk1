import type { Context, Next } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseClient } from '../lib/supabase.js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or malformed Authorization header' }, 401);
  }

  const token = authHeader.slice(7); // strip "Bearer "

  // Verify token by fetching the user
  const verifyClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await verifyClient.auth.getUser(token);

  if (error || !data.user) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  // Set user and a RLS-scoped client on context
  c.set('user', data.user);
  c.set('supabase', createSupabaseClient(token));

  await next();
}

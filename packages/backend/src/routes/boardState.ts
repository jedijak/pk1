import { Hono } from 'hono';
import type { AppVariables, UpdateBoardStateBody } from '../types/index.js';

const boardState = new Hono<{ Variables: AppVariables }>();

// GET /board-state?project_id=<id> — get board state for a project
boardState.get('/', async (c) => {
  const supabase = c.get('supabase');
  const user = c.get('user');
  const projectId = c.req.query('project_id');

  if (!projectId) {
    return c.json({ error: 'project_id query param is required' }, 400);
  }

  try {
    const { data, error } = await supabase
      .from('board_state')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    // Return empty state if none exists yet
    if (!data) {
      return c.json({
        project_id: projectId,
        user_id: user.id,
        card_order: null,
        current_view_id: null,
        updated_at: null,
      });
    }

    return c.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// PATCH /board-state?project_id=<id> — upsert board state
boardState.patch('/', async (c) => {
  const supabase = c.get('supabase');
  const user = c.get('user');
  const projectId = c.req.query('project_id');

  if (!projectId) {
    return c.json({ error: 'project_id query param is required' }, 400);
  }

  try {
    const body = await c.req.json<UpdateBoardStateBody>();

    const updates: Record<string, unknown> = {
      project_id: projectId,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    if (body.card_order !== undefined) updates.card_order = body.card_order;
    if (body.current_view_id !== undefined) updates.current_view_id = body.current_view_id;

    const { data, error } = await supabase
      .from('board_state')
      .upsert(updates, { onConflict: 'project_id,user_id' })
      .select()
      .single();

    if (error) throw error;
    return c.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

export default boardState;

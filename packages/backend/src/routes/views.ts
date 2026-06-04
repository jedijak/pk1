import { Hono } from 'hono';
import type { AppVariables, CreateViewBody, UpdateViewBody } from '../types/index.js';

const views = new Hono<{ Variables: AppVariables }>();

// GET /views — list view configurations (optionally filtered by project)
views.get('/', async (c) => {
  const supabase = c.get('supabase');
  const user = c.get('user');
  const projectId = c.req.query('project_id');

  try {
    let query = supabase
      .from('view_configurations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return c.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// POST /views — create a view configuration
views.post('/', async (c) => {
  const supabase = c.get('supabase');
  const user = c.get('user');

  try {
    const body = await c.req.json<CreateViewBody>();

    if (!body.project_id) return c.json({ error: 'project_id is required' }, 400);
    if (!body.name || body.name.trim() === '') return c.json({ error: 'name is required' }, 400);

    const { data, error } = await supabase
      .from('view_configurations')
      .insert({
        project_id: body.project_id,
        user_id: user.id,
        name: body.name.trim(),
        filters: body.filters ?? null,
        grouping: body.grouping ?? null,
        sort_order: body.sort_order ?? null,
        is_default: body.is_default ?? false,
      })
      .select()
      .single();

    if (error) throw error;
    return c.json(data, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// GET /views/:id — get a single view
views.get('/:id', async (c) => {
  const supabase = c.get('supabase');
  const id = c.req.param('id');

  try {
    const { data, error } = await supabase
      .from('view_configurations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return c.json({ error: 'Not found' }, 404);
      throw error;
    }

    return c.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// PATCH /views/:id — update a view configuration
views.patch('/:id', async (c) => {
  const supabase = c.get('supabase');
  const id = c.req.param('id');

  try {
    const body = await c.req.json<UpdateViewBody>();

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.filters !== undefined) updates.filters = body.filters;
    if (body.grouping !== undefined) updates.grouping = body.grouping;
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
    if (body.is_default !== undefined) updates.is_default = body.is_default;

    if (Object.keys(updates).length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('view_configurations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return c.json({ error: 'Not found' }, 404);
      throw error;
    }

    return c.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// DELETE /views/:id — delete a view configuration
views.delete('/:id', async (c) => {
  const supabase = c.get('supabase');
  const id = c.req.param('id');

  try {
    const { error } = await supabase
      .from('view_configurations')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return c.body(null, 204);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

export default views;

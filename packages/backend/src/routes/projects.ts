import { Hono } from 'hono';
import type { AppVariables, CreateProjectBody, UpdateProjectBody } from '../types/index.js';

const projects = new Hono<{ Variables: AppVariables }>();

// GET /projects — list all projects for the authenticated user
projects.get('/', async (c) => {
  const supabase = c.get('supabase');
  const user = c.get('user');

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return c.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// POST /projects — create a new project
projects.post('/', async (c) => {
  const supabase = c.get('supabase');
  const user = c.get('user');

  try {
    const body = await c.req.json<CreateProjectBody>();

    if (!body.name || body.name.trim() === '') {
      return c.json({ error: 'name is required' }, 400);
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: body.name.trim(),
        description: body.description ?? null,
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

// GET /projects/:id — get a single project
projects.get('/:id', async (c) => {
  const supabase = c.get('supabase');
  const id = c.req.param('id');

  try {
    const { data, error } = await supabase
      .from('projects')
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

// PATCH /projects/:id — update a project
projects.patch('/:id', async (c) => {
  const supabase = c.get('supabase');
  const id = c.req.param('id');

  try {
    const body = await c.req.json<UpdateProjectBody>();

    const updates: Partial<UpdateProjectBody> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description;

    if (Object.keys(updates).length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    const { data, error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
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

// DELETE /projects/:id — delete a project
projects.delete('/:id', async (c) => {
  const supabase = c.get('supabase');
  const id = c.req.param('id');

  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return c.body(null, 204);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

export default projects;

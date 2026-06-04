import { Hono } from 'hono';
import type {
  AppVariables,
  CreateCardBody,
  UpdateCardBody,
  MoveCardBody,
} from '../types/index.js';

const cards = new Hono<{ Variables: AppVariables }>();

// GET /projects/:projectId/cards — list cards for a project
cards.get('/projects/:projectId/cards', async (c) => {
  const supabase = c.get('supabase');
  const projectId = c.req.param('projectId');

  try {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true });

    if (error) throw error;
    return c.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// POST /projects/:projectId/cards — create a card
cards.post('/projects/:projectId/cards', async (c) => {
  const supabase = c.get('supabase');
  const projectId = c.req.param('projectId');

  try {
    const body = await c.req.json<CreateCardBody>();

    if (!body.title || body.title.trim() === '') {
      return c.json({ error: 'title is required' }, 400);
    }

    const { data, error } = await supabase
      .from('cards')
      .insert({
        project_id: projectId,
        title: body.title.trim(),
        description: body.description ?? null,
        card_type: body.card_type ?? 'human_touchpoint',
        card_status: body.card_status ?? 'backlog',
        card_priority: body.card_priority ?? 'medium',
        card_bg_color: body.card_bg_color ?? null,
        assignee_id: body.assignee_id ?? null,
        position: body.position ?? 0,
        due_date: body.due_date ?? null,
        tags: body.tags ?? null,
        metadata: body.metadata ?? null,
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

// GET /cards/:id — get a single card
cards.get('/cards/:id', async (c) => {
  const supabase = c.get('supabase');
  const id = c.req.param('id');

  try {
    const { data, error } = await supabase
      .from('cards')
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

// PATCH /cards/:id — update a card (status, position, priority, assignee, etc.)
cards.patch('/cards/:id', async (c) => {
  const supabase = c.get('supabase');
  const id = c.req.param('id');

  try {
    const body = await c.req.json<UpdateCardBody>();

    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.description !== undefined) updates.description = body.description;
    if (body.card_type !== undefined) updates.card_type = body.card_type;
    if (body.card_status !== undefined) updates.card_status = body.card_status;
    if (body.card_priority !== undefined) updates.card_priority = body.card_priority;
    if (body.card_bg_color !== undefined) updates.card_bg_color = body.card_bg_color;
    if (body.assignee_id !== undefined) updates.assignee_id = body.assignee_id;
    if (body.position !== undefined) updates.position = body.position;
    if (body.due_date !== undefined) updates.due_date = body.due_date;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.metadata !== undefined) updates.metadata = body.metadata;

    if (Object.keys(updates).length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('cards')
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

// DELETE /cards/:id — delete a card
cards.delete('/cards/:id', async (c) => {
  const supabase = c.get('supabase');
  const id = c.req.param('id');

  try {
    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return c.body(null, 204);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// PATCH /cards/:id/position — drag-and-drop reposition
cards.patch('/cards/:id/position', async (c) => {
  const supabase = c.get('supabase');
  const id = c.req.param('id');

  try {
    const body = await c.req.json<MoveCardBody>();

    if (!body.status) {
      return c.json({ error: 'status is required' }, 400);
    }
    if (body.position === undefined || body.position === null) {
      return c.json({ error: 'position is required' }, 400);
    }

    const { data, error } = await supabase
      .from('cards')
      .update({
        card_status: body.status,
        position: body.position,
        updated_at: new Date().toISOString(),
      })
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

export default cards;

import { Hono } from 'hono';
import { supabaseAdmin } from '../lib/supabase.js';
import type {
  AppVariables,
  UpdateRecommendationBody,
  CreateRecommendationBody,
  RecommendationStatus,
} from '../types/index.js';

const recommendations = new Hono<{ Variables: AppVariables }>();

// GET /recommendations — list recommendations (filter by status, project)
recommendations.get('/', async (c) => {
  const supabase = c.get('supabase');
  const status = c.req.query('status') as RecommendationStatus | undefined;
  const projectId = c.req.query('project_id');

  try {
    let query = supabase
      .from('recommendations')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('recommendation_status', status);
    }

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

// PATCH /recommendations/:id — approve / reject / modify a recommendation
recommendations.patch('/:id', async (c) => {
  const supabase = c.get('supabase');
  const user = c.get('user');
  const id = c.req.param('id');

  try {
    const body = await c.req.json<UpdateRecommendationBody>();

    if (!body.recommendation_status) {
      return c.json({ error: 'recommendation_status is required' }, 400);
    }

    const resolvedStatuses: RecommendationStatus[] = [
      'approved',
      'rejected',
      'auto_approved',
      'modified',
    ];

    const updates: Record<string, unknown> = {
      recommendation_status: body.recommendation_status,
      updated_at: new Date().toISOString(),
    };

    if (body.payload !== undefined) updates.payload = body.payload;

    // Set resolved metadata when transitioning to a resolved state
    if (resolvedStatuses.includes(body.recommendation_status)) {
      updates.resolved_at = new Date().toISOString();
      updates.resolved_by = user.id;
    }

    const { data, error } = await supabase
      .from('recommendations')
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

// POST /recommendations — agent writes recommendations (requires service role header)
recommendations.post('/', async (c) => {
  const serviceHeader = c.req.header('X-Service-Role');
  const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!expectedKey || serviceHeader !== expectedKey) {
    return c.json({ error: 'Forbidden: service role required' }, 403);
  }

  try {
    const body = await c.req.json<CreateRecommendationBody>();

    if (!body.project_id) return c.json({ error: 'project_id is required' }, 400);
    if (!body.title || body.title.trim() === '') return c.json({ error: 'title is required' }, 400);

    const { data, error } = await supabaseAdmin
      .from('recommendations')
      .insert({
        project_id: body.project_id,
        card_id: body.card_id ?? null,
        created_by_agent_scan_id: body.created_by_agent_scan_id ?? null,
        title: body.title.trim(),
        description: body.description ?? null,
        recommendation_status: 'pending',
        payload: body.payload ?? null,
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

export default recommendations;

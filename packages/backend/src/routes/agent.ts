import { Hono } from 'hono';
import { supabaseAdmin } from '../lib/supabase.js';
import type { AppVariables, AgentWebhookBody } from '../types/index.js';

const agent = new Hono<{ Variables: AppVariables }>();

// POST /agent/invoke — trigger an agent scan for a project
agent.post('/invoke', async (c) => {
  const supabase = c.get('supabase');
  const user = c.get('user');

  try {
    const body = await c.req.json<{ project_id: string }>();

    if (!body.project_id) {
      return c.json({ error: 'project_id is required' }, 400);
    }

    // Create a scan record in queued state
    const { data, error } = await supabase
      .from('agent_scans')
      .insert({
        project_id: body.project_id,
        triggered_by: user.id,
        status: 'queued',
      })
      .select()
      .single();

    if (error) throw error;

    return c.json({ job_id: data.id, status: 'queued' }, 202);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// POST /agent/webhook — agent posts scan results (requires service role header)
agent.post('/webhook', async (c) => {
  const serviceHeader = c.req.header('X-Service-Role');
  const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!expectedKey || serviceHeader !== expectedKey) {
    return c.json({ error: 'Forbidden: service role required' }, 403);
  }

  try {
    const body = await c.req.json<AgentWebhookBody>();

    if (!body.scan_id) return c.json({ error: 'scan_id is required' }, 400);
    if (!body.status) return c.json({ error: 'status is required' }, 400);

    // Update the scan record
    const scanUpdates: Record<string, unknown> = {
      status: body.status,
      completed_at: new Date().toISOString(),
    };

    if (body.result_summary !== undefined) scanUpdates.result_summary = body.result_summary;
    if (body.prompt_tokens !== undefined) scanUpdates.prompt_tokens = body.prompt_tokens;
    if (body.completion_tokens !== undefined) scanUpdates.completion_tokens = body.completion_tokens;
    if (body.total_cost_usd !== undefined) scanUpdates.total_cost_usd = body.total_cost_usd;

    const { data: scanData, error: scanError } = await supabaseAdmin
      .from('agent_scans')
      .update(scanUpdates)
      .eq('id', body.scan_id)
      .select()
      .single();

    if (scanError) {
      if (scanError.code === 'PGRST116') return c.json({ error: 'Scan not found' }, 404);
      throw scanError;
    }

    // Insert any recommendations bundled in the webhook payload
    let insertedRecommendations: unknown[] = [];
    if (body.recommendations && body.recommendations.length > 0) {
      const rows = body.recommendations.map((r) => ({
        project_id: r.project_id,
        card_id: r.card_id ?? null,
        created_by_agent_scan_id: body.scan_id,
        title: r.title,
        description: r.description ?? null,
        recommendation_status: 'pending' as const,
        payload: r.payload ?? null,
      }));

      const { data: recData, error: recError } = await supabaseAdmin
        .from('recommendations')
        .insert(rows)
        .select();

      if (recError) throw recError;
      insertedRecommendations = recData ?? [];
    }

    return c.json({
      scan: scanData,
      recommendations_created: insertedRecommendations.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// GET /agent/scans — list recent scans with token costs
agent.get('/scans', async (c) => {
  const supabase = c.get('supabase');
  const projectId = c.req.query('project_id');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '20', 10), 100);

  try {
    let query = supabase
      .from('agent_scans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

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

export default agent;

import { supabaseAdmin } from './lib/supabase.js';
import { analyzeBoard } from './lib/claude.js';
import type {
  Card,
  Project,
  CardWithMeta,
  BoardSnapshot,
  AgentRecommendation,
  RuleFilterResult,
} from './types.js';

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] [scanner] ${message}`);
}

// ─── Build Board Snapshot ─────────────────────────────────────────────────────

export async function buildBoardSnapshot(): Promise<BoardSnapshot> {
  log('Building board snapshot...');

  const now = new Date();

  // Fetch all projects
  const { data: projects, error: projectsError } = await supabaseAdmin
    .from('projects')
    .select('*');

  if (projectsError) {
    throw new Error(`Failed to fetch projects: ${projectsError.message}`);
  }

  // Fetch all active cards (not archived / done)
  const { data: rawCards, error: cardsError } = await supabaseAdmin
    .from('cards')
    .select('*')
    .not('card_status', 'eq', 'done');

  if (cardsError) {
    throw new Error(`Failed to fetch cards: ${cardsError.message}`);
  }

  const cards: Card[] = rawCards ?? [];

  // Enrich cards with computed fields
  const enriched: CardWithMeta[] = cards.map((card) => {
    const meta: CardWithMeta = { ...card };

    // Calculate days overdue
    if (card.due_date) {
      const dueDate = new Date(card.due_date);
      if (dueDate < now) {
        meta.days_overdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    // Calculate days in progress
    if (card.card_status === 'in_progress') {
      const updatedAt = new Date(card.updated_at);
      meta.days_in_progress = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      meta.is_stuck = meta.days_in_progress > 5;
    }

    return meta;
  });

  // Categorize
  const overdueCards = enriched.filter(
    (c) => c.days_overdue !== undefined && c.days_overdue > 0
  );
  const inProgressCards = enriched.filter((c) => c.card_status === 'in_progress');
  const highPriorityBacklog = enriched.filter(
    (c) =>
      (c.card_status === 'backlog' || c.card_status === 'ready') &&
      (c.card_priority === 'critical' || c.card_priority === 'high')
  );
  const stuckCards = enriched.filter((c) => c.is_stuck === true);
  const missingInfoCards = enriched.filter(
    (c) => !c.description || !c.assignee_id
  );

  const snapshot: BoardSnapshot = {
    timestamp: now.toISOString(),
    projects: (projects as Project[]) ?? [],
    all_cards: enriched,
    overdue_cards: overdueCards,
    in_progress_cards: inProgressCards,
    high_priority_backlog: highPriorityBacklog,
    stuck_cards: stuckCards,
    missing_info_cards: missingInfoCards,
    stats: {
      total_active: enriched.length,
      overdue_count: overdueCards.length,
      stuck_count: stuckCards.length,
      in_progress_count: inProgressCards.length,
      high_priority_backlog_count: highPriorityBacklog.length,
    },
  };

  log(
    `Snapshot built: ${snapshot.stats.total_active} active cards, ` +
    `${snapshot.stats.overdue_count} overdue, ` +
    `${snapshot.stats.stuck_count} stuck, ` +
    `${snapshot.stats.in_progress_count} in progress`
  );

  return snapshot;
}

// ─── Rule-Based Filter ────────────────────────────────────────────────────────

export function runRuleBasedFilter(snapshot: BoardSnapshot): RuleFilterResult {
  const issues: string[] = [];

  if (snapshot.stats.overdue_count > 0) {
    issues.push(`${snapshot.stats.overdue_count} overdue card(s)`);
  }

  if (snapshot.stats.stuck_count > 0) {
    issues.push(`${snapshot.stats.stuck_count} stuck card(s) (in_progress > 5 days)`);
  }

  // Critical cards with no assignee
  const criticalUnassigned = snapshot.all_cards.filter(
    (c) => c.card_priority === 'critical' && !c.assignee_id
  );
  if (criticalUnassigned.length > 0) {
    issues.push(`${criticalUnassigned.length} unassigned critical card(s)`);
  }

  if (snapshot.stats.high_priority_backlog_count >= 5) {
    issues.push(`${snapshot.stats.high_priority_backlog_count} high-priority cards stuck in backlog`);
  }

  if (issues.length === 0) {
    return {
      hasProblems: false,
      summary: 'Board looks clean — no rule-based issues detected. Skipping LLM call.',
    };
  }

  return {
    hasProblems: true,
    summary: `Issues detected: ${issues.join('; ')}.`,
  };
}

// ─── Write Results to Supabase ────────────────────────────────────────────────

async function writeAgentScan(
  projectId: string,
  status: 'complete' | 'failed',
  recommendations: AgentRecommendation[],
  summary: string
): Promise<string> {
  const { data: scan, error } = await supabaseAdmin
    .from('agent_scans')
    .insert({
      project_id: projectId,
      triggered_by: 'cron',
      status,
      result_summary: summary,
      completed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !scan) {
    throw new Error(`Failed to write agent_scan: ${error?.message ?? 'no data returned'}`);
  }

  return scan.id as string;
}

async function writeRecommendations(
  projectId: string,
  scanId: string,
  recommendations: AgentRecommendation[]
): Promise<number> {
  if (recommendations.length === 0) return 0;

  const rows = recommendations.map((rec) => ({
    project_id: projectId,
    card_id: rec.card_id ?? null,
    created_by_agent_scan_id: scanId,
    title: `[${rec.type.toUpperCase()}] ${rec.card_title}`,
    description: `${rec.suggested_action}\n\nReasoning: ${rec.reasoning}`,
    recommendation_status: 'pending',
    payload: {
      type: rec.type,
      card_title: rec.card_title,
      suggested_action: rec.suggested_action,
      reasoning: rec.reasoning,
      confidence: rec.confidence,
      integration_actions: rec.integration_actions,
    },
  }));

  const { error } = await supabaseAdmin.from('recommendations').insert(rows);

  if (error) {
    throw new Error(`Failed to write recommendations: ${error.message}`);
  }

  return rows.length;
}

// ─── Main Scan Orchestrator ───────────────────────────────────────────────────

export async function runScan(): Promise<number> {
  log('=== Starting board scan ===');

  let snapshot: BoardSnapshot;
  try {
    snapshot = await buildBoardSnapshot();
  } catch (err) {
    log(`ERROR building board snapshot: ${err instanceof Error ? err.message : String(err)}`);
    return 0;
  }

  const filterResult = runRuleBasedFilter(snapshot);
  log(`Rule filter: ${filterResult.summary}`);

  if (!filterResult.hasProblems) {
    log('Board is clean — no LLM call needed.');
    return 0;
  }

  log('Problems detected — calling Claude for analysis...');

  let recommendations: AgentRecommendation[] = [];
  try {
    recommendations = await analyzeBoard(snapshot);
  } catch (err) {
    log(`ERROR during Claude analysis: ${err instanceof Error ? err.message : String(err)}`);
    recommendations = [];
  }

  log(`Claude returned ${recommendations.length} recommendation(s).`);

  if (recommendations.length === 0) {
    log('No recommendations to write.');
    return 0;
  }

  // Use the first project ID for now (prototype: single-project board)
  const projectId = snapshot.projects[0]?.id;
  if (!projectId) {
    log('WARNING: No projects found — cannot write scan results.');
    return 0;
  }

  let writtenCount = 0;
  try {
    const summary = `${recommendations.length} recommendation(s) generated. ${filterResult.summary}`;
    const scanId = await writeAgentScan(projectId, 'complete', recommendations, summary);
    log(`Agent scan record written: ${scanId}`);

    writtenCount = await writeRecommendations(projectId, scanId, recommendations);
    log(`${writtenCount} recommendation(s) written to database.`);
  } catch (err) {
    log(`ERROR writing to database: ${err instanceof Error ? err.message : String(err)}`);
  }

  log('=== Scan complete ===');
  return writtenCount;
}

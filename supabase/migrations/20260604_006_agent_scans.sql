-- =============================================================================
-- Migration 006: Agent Scans table
-- Records each time the AA agent runs: metadata, token usage, outcome.
-- Idempotent: IF NOT EXISTS on table.
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_scans (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- which project this scan was run against
  project_id           uuid        REFERENCES projects(id) ON DELETE CASCADE NOT NULL,

  -- which user triggered the scan (NULL for scheduled/system triggers)
  triggered_by         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- lifecycle state
  status               text        NOT NULL DEFAULT 'queued'
                                   CHECK (status IN ('queued', 'running', 'complete', 'failed')),

  -- token usage and cost
  prompt_tokens        integer,
  completion_tokens    integer,
  total_cost_usd       numeric(10, 6),

  -- summary text from the agent
  result_summary       text,

  created_at           timestamptz DEFAULT now(),
  completed_at         timestamptz
);

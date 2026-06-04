-- =============================================================================
-- Migration 006: Agent Scans table
-- Records each time the AA agent runs: metadata, token usage, outcome.
-- Idempotent: IF NOT EXISTS on table.
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_scans (
  id                   uuid              PRIMARY KEY DEFAULT gen_random_uuid(),

  -- what initiated the scan
  trigger_type         scan_trigger_type NOT NULL DEFAULT 'scheduled',

  started_at           timestamptz       DEFAULT now(),
  completed_at         timestamptz,

  -- e.g. "claude-sonnet-4-6"
  model_used           text,

  -- total tokens consumed across input + output
  tokens_used          integer           DEFAULT 0,

  -- how many recommendations were generated in this scan
  recommendation_count integer           DEFAULT 0,

  -- populated if the scan failed or produced a partial result
  error                text
);

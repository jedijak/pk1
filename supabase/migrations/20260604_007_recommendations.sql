-- =============================================================================
-- Migration 007: Recommendations table
-- Each row is one actionable suggestion produced by the AA agent for a card.
-- Idempotent: IF NOT EXISTS on table.
-- =============================================================================

CREATE TABLE IF NOT EXISTS recommendations (
  id                 uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),

  -- which scan produced this recommendation
  scan_id            uuid                   REFERENCES agent_scans(id) ON DELETE CASCADE,

  -- which card the recommendation applies to
  card_id            uuid                   REFERENCES cards(id) ON DELETE CASCADE,

  -- e.g. "priority_change", "due_date_warning", "status_update", "blocker_detected"
  type               text                   NOT NULL,

  -- human-readable description of what the agent suggests doing
  suggested_action   text                   NOT NULL,

  -- agent's explanation for why this recommendation was made
  reasoning          text,

  -- 0.0–1.0 confidence score from the model
  confidence         float                  CHECK (confidence >= 0 AND confidence <= 1),

  status             recommendation_status  NOT NULL DEFAULT 'pending',

  -- optional downstream actions the agent proposes: [{service, action, payload}]
  integration_actions jsonb                 DEFAULT '[]',

  -- when and by whom the recommendation was acted on (NULL = still open)
  resolved_at        timestamptz,
  resolved_by        uuid                   REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at         timestamptz            DEFAULT now()
);

-- =============================================================================
-- Migration 009: Indexes
-- Performance indexes for common query patterns. All idempotent via IF NOT EXISTS.
-- =============================================================================

-- cards: single-column lookup indexes
CREATE INDEX IF NOT EXISTS idx_cards_project_id
  ON cards(project_id);

CREATE INDEX IF NOT EXISTS idx_cards_assignee_id
  ON cards(assignee_id);

CREATE INDEX IF NOT EXISTS idx_cards_card_status
  ON cards(card_status);

CREATE INDEX IF NOT EXISTS idx_cards_card_priority
  ON cards(card_priority);

-- Partial index: only rows with an actual due date (avoids indexing NULLs)
CREATE INDEX IF NOT EXISTS idx_cards_due_date
  ON cards(due_date)
  WHERE due_date IS NOT NULL;

-- Composite index: most common board query — all cards in a project by column
CREATE INDEX IF NOT EXISTS idx_cards_project_card_status
  ON cards(project_id, card_status);

-- agent_scans: look up scans by project
CREATE INDEX IF NOT EXISTS idx_agent_scans_project_id
  ON agent_scans(project_id);

-- Partial index: queued/running scans (hot path for background worker polling)
CREATE INDEX IF NOT EXISTS idx_agent_scans_status_active
  ON agent_scans(status)
  WHERE status IN ('queued', 'running');

-- recommendations: pending queue (agent dashboard hot path)
CREATE INDEX IF NOT EXISTS idx_recommendations_recommendation_status
  ON recommendations(recommendation_status)
  WHERE recommendation_status = 'pending';

-- recommendations: all recommendations for a given project
CREATE INDEX IF NOT EXISTS idx_recommendations_project_id
  ON recommendations(project_id);

-- recommendations: all recommendations for a given card
CREATE INDEX IF NOT EXISTS idx_recommendations_card_id
  ON recommendations(card_id);

-- audit_log: look up history for any record by table + PK
CREATE INDEX IF NOT EXISTS idx_audit_log_record
  ON audit_log(table_name, record_id);

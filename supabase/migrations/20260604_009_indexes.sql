-- =============================================================================
-- Migration 009: Indexes
-- Performance indexes for common query patterns. All idempotent via IF NOT EXISTS.
-- =============================================================================

-- cards: single-column lookup indexes
CREATE INDEX IF NOT EXISTS idx_cards_project_id
  ON cards(project_id);

CREATE INDEX IF NOT EXISTS idx_cards_assignee_id
  ON cards(assignee_id);

CREATE INDEX IF NOT EXISTS idx_cards_status
  ON cards(status);

CREATE INDEX IF NOT EXISTS idx_cards_priority
  ON cards(priority);

-- Partial index: only rows with an actual due date (avoids indexing NULLs)
CREATE INDEX IF NOT EXISTS idx_cards_due_date
  ON cards(due_date)
  WHERE due_date IS NOT NULL;

-- Composite index: most common board query — all cards in a project by column
CREATE INDEX IF NOT EXISTS idx_cards_project_status
  ON cards(project_id, status);

-- Partial index: agent dashboard — only flagged cards
CREATE INDEX IF NOT EXISTS idx_cards_agent_flagged
  ON cards(agent_flagged)
  WHERE agent_flagged = true;

-- recommendations: pending queue (agent dashboard hot path)
CREATE INDEX IF NOT EXISTS idx_recommendations_status
  ON recommendations(status)
  WHERE status = 'pending';

-- recommendations: all recommendations for a given card
CREATE INDEX IF NOT EXISTS idx_recommendations_card_id
  ON recommendations(card_id);

-- audit_log: look up history for any record by table + PK
CREATE INDEX IF NOT EXISTS idx_audit_log_record
  ON audit_log(table_name, record_id);

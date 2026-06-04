-- =============================================================================
-- Migration 007: Recommendations table
-- Each row is one actionable suggestion produced by the AA agent.
-- Idempotent: IF NOT EXISTS on table.
-- =============================================================================

CREATE TABLE IF NOT EXISTS recommendations (
  id                        uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),

  -- which project this recommendation belongs to (direct FK for efficient queries)
  project_id                uuid                   REFERENCES projects(id) ON DELETE CASCADE NOT NULL,

  -- which card the recommendation applies to (NULL = project-level recommendation)
  card_id                   uuid                   REFERENCES cards(id) ON DELETE CASCADE,

  -- which agent scan produced this recommendation
  created_by_agent_scan_id  uuid                   REFERENCES agent_scans(id) ON DELETE SET NULL,

  -- human-readable title (required)
  title                     text                   NOT NULL,

  -- optional longer description
  description               text,

  -- lifecycle state
  recommendation_status     recommendation_status  NOT NULL DEFAULT 'pending',

  -- arbitrary agent payload (proposed changes, structured data, etc.)
  payload                   jsonb,

  -- when and by whom the recommendation was acted on (NULL = still open)
  resolved_at               timestamptz,
  resolved_by               uuid                   REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at                timestamptz            DEFAULT now(),
  updated_at                timestamptz            DEFAULT now()
);

-- Trigger: auto-update updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_recommendations_updated_at'
      AND tgrelid = 'recommendations'::regclass
  ) THEN
    CREATE TRIGGER trg_recommendations_updated_at
      BEFORE UPDATE ON recommendations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- =============================================================================
-- Migration 004: View Configurations table
-- Saved named views that define how cards are grouped/filtered on the board.
-- Idempotent: IF NOT EXISTS on table; guarded trigger creation.
-- =============================================================================

CREATE TABLE IF NOT EXISTS view_configurations (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid        REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id      uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name         text        NOT NULL,

  -- flexible filter rules: arbitrary JSON object
  filters      jsonb,

  -- how cards are grouped in this view (free-form string, e.g. 'status', 'assignee')
  grouping     text,

  -- sort rules: arbitrary JSON object
  sort_order   jsonb,

  -- whether this is the user's default view for the project
  is_default   boolean     NOT NULL DEFAULT false,

  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Trigger: auto-update updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_view_configurations_updated_at'
      AND tgrelid = 'view_configurations'::regclass
  ) THEN
    CREATE TRIGGER trg_view_configurations_updated_at
      BEFORE UPDATE ON view_configurations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

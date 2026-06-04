-- =============================================================================
-- Migration 004: View Configurations table
-- Saved named views that define how cards are grouped/filtered on the board.
-- Idempotent: IF NOT EXISTS on table; guarded trigger creation.
-- =============================================================================

CREATE TABLE IF NOT EXISTS view_configurations (
  id                 uuid             PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULL project_id means global / cross-project view
  project_id         uuid             REFERENCES projects(id) ON DELETE CASCADE,

  name               text             NOT NULL,
  description        text,

  -- how cards are grouped in this view
  grouping_principle view_grouping    NOT NULL DEFAULT 'project',

  -- flexible filter/sort rules: {filters: [...], sort: [...], columns: [...]}
  filter_logic       jsonb            DEFAULT '{}',

  -- who can see this view
  visibility         view_visibility  NOT NULL DEFAULT 'personal',

  created_by         uuid             REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at         timestamptz      DEFAULT now(),
  updated_at         timestamptz      DEFAULT now()
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

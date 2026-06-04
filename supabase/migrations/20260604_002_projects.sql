-- =============================================================================
-- Migration 002: Projects table + shared trigger function
-- Idempotent: IF NOT EXISTS guards on table and function.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Shared trigger function: keeps updated_at current on any table that uses it.
-- Used by: projects, cards, view_configurations, board_state
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- projects: top-level organizational unit; owned by one user
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name            text        NOT NULL,
  description     text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Trigger: auto-update updated_at on every row change
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_projects_updated_at'
      AND tgrelid = 'projects'::regclass
  ) THEN
    CREATE TRIGGER trg_projects_updated_at
      BEFORE UPDATE ON projects
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

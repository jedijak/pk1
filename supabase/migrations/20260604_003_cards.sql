-- =============================================================================
-- Migration 003: Cards table
-- Core Kanban unit. Belongs to a project; optionally assigned to a user.
-- Idempotent: IF NOT EXISTS on table; guarded trigger creation.
-- =============================================================================

CREATE TABLE IF NOT EXISTS cards (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid          REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title            text          NOT NULL,
  description      text,

  -- card classification (prefixed column names to match backend types)
  card_type        card_type     NOT NULL DEFAULT 'human_touchpoint',
  card_status      card_status   NOT NULL DEFAULT 'backlog',
  card_priority    card_priority NOT NULL DEFAULT 'medium',
  card_bg_color    card_bg_color,

  -- ownership / scheduling
  assignee_id      uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date         timestamptz,

  -- display order within its column/view (lower = higher)
  position         integer       NOT NULL DEFAULT 0,

  -- free-form labels
  tags             text[],

  -- arbitrary agent/integration metadata
  metadata         jsonb,

  created_at       timestamptz   DEFAULT now(),
  updated_at       timestamptz   DEFAULT now()
);

-- Trigger: auto-update updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_cards_updated_at'
      AND tgrelid = 'cards'::regclass
  ) THEN
    CREATE TRIGGER trg_cards_updated_at
      BEFORE UPDATE ON cards
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

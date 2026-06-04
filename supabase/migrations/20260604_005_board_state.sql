-- =============================================================================
-- Migration 005: Board State table
-- One row per user; persists their current view selection and card ordering.
-- Idempotent: IF NOT EXISTS on table; guarded trigger creation.
-- =============================================================================

CREATE TABLE IF NOT EXISTS board_state (
  id                uuid             PRIMARY KEY DEFAULT gen_random_uuid(),

  -- one record per user; enforced by UNIQUE
  user_id           uuid             REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- which saved view the user is currently looking at
  current_view_id   uuid             REFERENCES view_configurations(id) ON DELETE SET NULL,

  -- per-column or per-view card ordering: {column_or_view_key: [card_id, ...]}
  card_order        jsonb            DEFAULT '{}',

  -- timestamp of the last AA agent scan the user is aware of
  last_agent_scan   timestamptz,

  updated_at        timestamptz      DEFAULT now()
);

-- Trigger: auto-update updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_board_state_updated_at'
      AND tgrelid = 'board_state'::regclass
  ) THEN
    CREATE TRIGGER trg_board_state_updated_at
      BEFORE UPDATE ON board_state
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- =============================================================================
-- Migration 011: Realtime Publication
-- Adds key tables to the supabase_realtime publication so the React frontend
-- receives live updates via Supabase Realtime channels.
--
-- Wrapped in a DO block that catches the "already a member" error (42710)
-- so this migration is safe to re-run.
-- =============================================================================

DO $$
BEGIN
  -- cards: primary board data — clients need live column/position updates
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE cards;
  EXCEPTION
    WHEN sqlstate '42710' THEN
      -- already a member of this publication; nothing to do
      NULL;
  END;

  -- recommendations: AA agent pushes new suggestions in real time
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE recommendations;
  EXCEPTION
    WHEN sqlstate '42710' THEN
      NULL;
  END;

  -- board_state: reflects view/order changes across sessions or devices
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE board_state;
  EXCEPTION
    WHEN sqlstate '42710' THEN
      NULL;
  END;
END $$;

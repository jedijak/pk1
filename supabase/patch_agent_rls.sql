-- Prototype patch: allow authenticated users to write agent data directly.
-- Run this in the SQL editor AFTER combined_migrations.sql
-- https://supabase.com/dashboard/project/bcrqjzkjxzwmzilyubnq/sql/new

-- agent_scans: allow authenticated users to insert (backend writes on their behalf)
DROP POLICY IF EXISTS "agent_scans_insert" ON agent_scans;
CREATE POLICY "agent_scans_insert" ON agent_scans
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "agent_scans_update" ON agent_scans;
CREATE POLICY "agent_scans_update" ON agent_scans
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- recommendations: board-level recs (card_id IS NULL) need a looser insert policy
DROP POLICY IF EXISTS "recommendations_insert_board" ON recommendations;
CREATE POLICY "recommendations_insert_board" ON recommendations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      card_id IS NULL
      OR card_id IN (
        SELECT c.id FROM cards c
        WHERE c.project_id IN (
          SELECT p.id FROM projects p
          WHERE p.user_id = auth.uid()
        )
      )
    )
  );

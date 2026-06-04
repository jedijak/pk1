-- =============================================================================
-- Migration 010: Row Level Security Policies
-- Enables RLS on all tables and creates per-table access policies.
-- Idempotent: DROP POLICY IF EXISTS before each CREATE POLICY.
-- =============================================================================

-- =============================================================================
-- PROJECTS
-- =============================================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- SELECT: owner or a listed member
DROP POLICY IF EXISTS "projects_select" ON projects;
CREATE POLICY "projects_select" ON projects
  FOR SELECT USING (
    owner_id = auth.uid()
    OR auth.uid() = ANY(member_ids)
  );

-- INSERT: authenticated user sets themselves as owner
DROP POLICY IF EXISTS "projects_insert" ON projects;
CREATE POLICY "projects_insert" ON projects
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- UPDATE: only owner
DROP POLICY IF EXISTS "projects_update" ON projects;
CREATE POLICY "projects_update" ON projects
  FOR UPDATE USING (owner_id = auth.uid());

-- DELETE: only owner
DROP POLICY IF EXISTS "projects_delete" ON projects;
CREATE POLICY "projects_delete" ON projects
  FOR DELETE USING (owner_id = auth.uid());

-- =============================================================================
-- CARDS
-- =============================================================================
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Reusable subquery: is the current user a member or owner of the card's project?
-- Inlined in each policy for clarity and RLS compatibility.

DROP POLICY IF EXISTS "cards_select" ON cards;
CREATE POLICY "cards_select" ON cards
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects
      WHERE owner_id = auth.uid()
        OR auth.uid() = ANY(member_ids)
    )
  );

DROP POLICY IF EXISTS "cards_insert" ON cards;
CREATE POLICY "cards_insert" ON cards
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects
      WHERE owner_id = auth.uid()
        OR auth.uid() = ANY(member_ids)
    )
  );

DROP POLICY IF EXISTS "cards_update" ON cards;
CREATE POLICY "cards_update" ON cards
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects
      WHERE owner_id = auth.uid()
        OR auth.uid() = ANY(member_ids)
    )
  );

DROP POLICY IF EXISTS "cards_delete" ON cards;
CREATE POLICY "cards_delete" ON cards
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects
      WHERE owner_id = auth.uid()
        OR auth.uid() = ANY(member_ids)
    )
  );

-- =============================================================================
-- VIEW CONFIGURATIONS
-- =============================================================================
ALTER TABLE view_configurations ENABLE ROW LEVEL SECURITY;

-- SELECT: own views, or any team/public view
DROP POLICY IF EXISTS "view_configurations_select" ON view_configurations;
CREATE POLICY "view_configurations_select" ON view_configurations
  FOR SELECT USING (
    created_by = auth.uid()
    OR visibility IN ('team', 'public')
  );

DROP POLICY IF EXISTS "view_configurations_insert" ON view_configurations;
CREATE POLICY "view_configurations_insert" ON view_configurations
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "view_configurations_update" ON view_configurations;
CREATE POLICY "view_configurations_update" ON view_configurations
  FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "view_configurations_delete" ON view_configurations;
CREATE POLICY "view_configurations_delete" ON view_configurations
  FOR DELETE USING (created_by = auth.uid());

-- =============================================================================
-- BOARD STATE
-- =============================================================================
ALTER TABLE board_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "board_state_select" ON board_state;
CREATE POLICY "board_state_select" ON board_state
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "board_state_insert" ON board_state;
CREATE POLICY "board_state_insert" ON board_state
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "board_state_update" ON board_state;
CREATE POLICY "board_state_update" ON board_state
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "board_state_delete" ON board_state;
CREATE POLICY "board_state_delete" ON board_state
  FOR DELETE USING (user_id = auth.uid());

-- =============================================================================
-- RECOMMENDATIONS
-- =============================================================================
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- Access flows: recommendation → card → project → membership check
DROP POLICY IF EXISTS "recommendations_select" ON recommendations;
CREATE POLICY "recommendations_select" ON recommendations
  FOR SELECT USING (
    card_id IN (
      SELECT c.id FROM cards c
      WHERE c.project_id IN (
        SELECT p.id FROM projects p
        WHERE p.owner_id = auth.uid()
          OR auth.uid() = ANY(p.member_ids)
      )
    )
  );

DROP POLICY IF EXISTS "recommendations_insert" ON recommendations;
CREATE POLICY "recommendations_insert" ON recommendations
  FOR INSERT WITH CHECK (
    card_id IN (
      SELECT c.id FROM cards c
      WHERE c.project_id IN (
        SELECT p.id FROM projects p
        WHERE p.owner_id = auth.uid()
          OR auth.uid() = ANY(p.member_ids)
      )
    )
  );

DROP POLICY IF EXISTS "recommendations_update" ON recommendations;
CREATE POLICY "recommendations_update" ON recommendations
  FOR UPDATE USING (
    card_id IN (
      SELECT c.id FROM cards c
      WHERE c.project_id IN (
        SELECT p.id FROM projects p
        WHERE p.owner_id = auth.uid()
          OR auth.uid() = ANY(p.member_ids)
      )
    )
  );

-- =============================================================================
-- AGENT SCANS
-- =============================================================================
ALTER TABLE agent_scans ENABLE ROW LEVEL SECURITY;

-- SELECT only; scans are written by the backend service role, not by end users
DROP POLICY IF EXISTS "agent_scans_select" ON agent_scans;
CREATE POLICY "agent_scans_select" ON agent_scans
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- AUDIT LOG
-- =============================================================================
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- SELECT only for authenticated users; no INSERT/UPDATE/DELETE from client
-- The backend service role writes audit entries; clients can only read.
DROP POLICY IF EXISTS "audit_log_select" ON audit_log;
CREATE POLICY "audit_log_select" ON audit_log
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Intentionally no INSERT, UPDATE, or DELETE policies on audit_log.
-- Only the Postgres service role (backend) may write to this table.

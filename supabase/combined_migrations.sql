-- =============================================================================
-- PK1 Combined Migrations — paste this entire file into the Supabase SQL editor
-- URL: https://supabase.com/dashboard/project/bcrqjzkjxzwmzilyubnq/sql/new
-- =============================================================================

-- === Migration 001: Enums ===

-- card_type: distinguishes human-driven vs AI-agent-driven work
DO $$ BEGIN
  CREATE TYPE card_type AS ENUM ('human_touchpoint', 'code_agent_work');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- card_bg_color: visual theming for card backgrounds
DO $$ BEGIN
  CREATE TYPE card_bg_color AS ENUM ('dark_tan', 'light_gray');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- card_status: Kanban column positions
DO $$ BEGIN
  CREATE TYPE card_status AS ENUM ('backlog', 'ready', 'in_progress', 'review', 'done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- card_priority: urgency / importance ranking
DO $$ BEGIN
  CREATE TYPE card_priority AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- recommendation_status: lifecycle state of an AA agent recommendation
DO $$ BEGIN
  CREATE TYPE recommendation_status AS ENUM ('pending','approved','rejected','auto_approved','modified');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- === Migration 002: Projects ===

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE IF NOT EXISTS projects (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        text        NOT NULL,
  description text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_projects_updated_at' AND tgrelid='projects'::regclass) THEN
    CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- === Migration 003: Cards ===

CREATE TABLE IF NOT EXISTS cards (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid          REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title         text          NOT NULL,
  description   text,
  card_type     card_type     NOT NULL DEFAULT 'human_touchpoint',
  card_status   card_status   NOT NULL DEFAULT 'backlog',
  card_priority card_priority NOT NULL DEFAULT 'medium',
  card_bg_color card_bg_color,
  assignee_id   uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date      timestamptz,
  position      integer       NOT NULL DEFAULT 0,
  tags          text[],
  metadata      jsonb,
  created_at    timestamptz   DEFAULT now(),
  updated_at    timestamptz   DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_cards_updated_at' AND tgrelid='cards'::regclass) THEN
    CREATE TRIGGER trg_cards_updated_at BEFORE UPDATE ON cards FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- === Migration 004: View Configurations ===

CREATE TABLE IF NOT EXISTS view_configurations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        text        NOT NULL,
  filters     jsonb,
  grouping    text,
  sort_order  jsonb,
  is_default  boolean     NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_view_configurations_updated_at' AND tgrelid='view_configurations'::regclass) THEN
    CREATE TRIGGER trg_view_configurations_updated_at BEFORE UPDATE ON view_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- === Migration 005: Board State ===

CREATE TABLE IF NOT EXISTS board_state (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid        REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id         uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  current_view_id uuid        REFERENCES view_configurations(id) ON DELETE SET NULL,
  card_order      jsonb,
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (project_id, user_id)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_board_state_updated_at' AND tgrelid='board_state'::regclass) THEN
    CREATE TRIGGER trg_board_state_updated_at BEFORE UPDATE ON board_state FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- === Migration 006: Agent Scans ===

CREATE TABLE IF NOT EXISTS agent_scans (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid        REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  triggered_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  status            text        NOT NULL DEFAULT 'queued'
                                CHECK (status IN ('queued', 'running', 'complete', 'failed')),
  prompt_tokens     integer,
  completion_tokens integer,
  total_cost_usd    numeric(10, 6),
  result_summary    text,
  created_at        timestamptz DEFAULT now(),
  completed_at      timestamptz
);

-- === Migration 007: Recommendations ===

CREATE TABLE IF NOT EXISTS recommendations (
  id                       uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               uuid                  REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  card_id                  uuid                  REFERENCES cards(id) ON DELETE CASCADE,
  created_by_agent_scan_id uuid                  REFERENCES agent_scans(id) ON DELETE SET NULL,
  title                    text                  NOT NULL,
  description              text,
  recommendation_status    recommendation_status NOT NULL DEFAULT 'pending',
  payload                  jsonb,
  resolved_at              timestamptz,
  resolved_by              uuid                  REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at               timestamptz           DEFAULT now(),
  updated_at               timestamptz           DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_recommendations_updated_at' AND tgrelid='recommendations'::regclass) THEN
    CREATE TRIGGER trg_recommendations_updated_at BEFORE UPDATE ON recommendations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- === Migration 008: Audit Log ===

CREATE TABLE IF NOT EXISTS audit_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name   text        NOT NULL,
  record_id    uuid        NOT NULL,
  action       text        NOT NULL,
  old_values   jsonb,
  new_values   jsonb,
  performed_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at timestamptz DEFAULT now()
);

-- === Migration 009: Indexes ===

CREATE INDEX IF NOT EXISTS idx_cards_project_id          ON cards(project_id);
CREATE INDEX IF NOT EXISTS idx_cards_assignee_id         ON cards(assignee_id);
CREATE INDEX IF NOT EXISTS idx_cards_card_status         ON cards(card_status);
CREATE INDEX IF NOT EXISTS idx_cards_card_priority       ON cards(card_priority);
CREATE INDEX IF NOT EXISTS idx_cards_due_date            ON cards(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cards_project_card_status ON cards(project_id, card_status);

CREATE INDEX IF NOT EXISTS idx_agent_scans_project_id    ON agent_scans(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_scans_status_active ON agent_scans(status) WHERE status IN ('queued', 'running');

CREATE INDEX IF NOT EXISTS idx_recommendations_recommendation_status ON recommendations(recommendation_status) WHERE recommendation_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_recommendations_project_id            ON recommendations(project_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_card_id               ON recommendations(card_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_record ON audit_log(table_name, record_id);

-- === Migration 010: RLS Policies ===

ALTER TABLE projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards               ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_state         ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_scans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;

-- projects
DROP POLICY IF EXISTS "projects_select" ON projects;
CREATE POLICY "projects_select" ON projects FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "projects_insert" ON projects;
CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "projects_update" ON projects;
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "projects_delete" ON projects;
CREATE POLICY "projects_delete" ON projects FOR DELETE USING (user_id = auth.uid());

-- cards
DROP POLICY IF EXISTS "cards_select" ON cards;
CREATE POLICY "cards_select" ON cards FOR SELECT USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "cards_insert" ON cards;
CREATE POLICY "cards_insert" ON cards FOR INSERT WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "cards_update" ON cards;
CREATE POLICY "cards_update" ON cards FOR UPDATE USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "cards_delete" ON cards;
CREATE POLICY "cards_delete" ON cards FOR DELETE USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- view_configurations
DROP POLICY IF EXISTS "view_configurations_select" ON view_configurations;
CREATE POLICY "view_configurations_select" ON view_configurations FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "view_configurations_insert" ON view_configurations;
CREATE POLICY "view_configurations_insert" ON view_configurations FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "view_configurations_update" ON view_configurations;
CREATE POLICY "view_configurations_update" ON view_configurations FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "view_configurations_delete" ON view_configurations;
CREATE POLICY "view_configurations_delete" ON view_configurations FOR DELETE USING (user_id = auth.uid());

-- board_state
DROP POLICY IF EXISTS "board_state_select" ON board_state;
CREATE POLICY "board_state_select" ON board_state FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "board_state_insert" ON board_state;
CREATE POLICY "board_state_insert" ON board_state FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "board_state_update" ON board_state;
CREATE POLICY "board_state_update" ON board_state FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "board_state_delete" ON board_state;
CREATE POLICY "board_state_delete" ON board_state FOR DELETE USING (user_id = auth.uid());

-- recommendations
DROP POLICY IF EXISTS "recommendations_select" ON recommendations;
CREATE POLICY "recommendations_select" ON recommendations FOR SELECT USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "recommendations_insert" ON recommendations;
CREATE POLICY "recommendations_insert" ON recommendations FOR INSERT WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "recommendations_update" ON recommendations;
CREATE POLICY "recommendations_update" ON recommendations FOR UPDATE USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- agent_scans
DROP POLICY IF EXISTS "agent_scans_select" ON agent_scans;
CREATE POLICY "agent_scans_select" ON agent_scans FOR SELECT USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- audit_log
DROP POLICY IF EXISTS "audit_log_select" ON audit_log;
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT USING (auth.uid() IS NOT NULL);

-- === Migration 011: Realtime ===

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE cards;
  EXCEPTION WHEN sqlstate '42710' THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE recommendations;
  EXCEPTION WHEN sqlstate '42710' THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE board_state;
  EXCEPTION WHEN sqlstate '42710' THEN NULL; END;
END $$;

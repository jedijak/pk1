-- =============================================================================
-- Migration 001: Enums
-- Creates all custom enum types used throughout the PK1 schema.
-- Idempotent: uses DO $$ blocks to skip creation if type already exists.
-- =============================================================================

-- card_type: distinguishes human-driven vs AI-agent-driven work
DO $$ BEGIN
  CREATE TYPE card_type AS ENUM ('human_touchpoint', 'code_agent_work');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- card_bg_color: visual theming for card backgrounds
DO $$ BEGIN
  CREATE TYPE card_bg_color AS ENUM ('dark_tan', 'light_gray');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- card_status: Kanban column positions
DO $$ BEGIN
  CREATE TYPE card_status AS ENUM ('backlog', 'ready', 'in_progress', 'review', 'done');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- card_priority: urgency / importance ranking
DO $$ BEGIN
  CREATE TYPE card_priority AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- view_grouping: how cards are organized in a saved view
DO $$ BEGIN
  CREATE TYPE view_grouping AS ENUM (
    'project',
    'assignee',
    'code_function',
    'budget_approval',
    'risk_deadline',
    'custom'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- view_visibility: access scope for saved view configurations
DO $$ BEGIN
  CREATE TYPE view_visibility AS ENUM ('personal', 'team', 'public');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- nested_item_type: types of sub-items embedded in a card's nested_items JSONB
DO $$ BEGIN
  CREATE TYPE nested_item_type AS ENUM (
    'checklist_item',
    'question',
    'decision_point',
    'note'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- recommendation_status: lifecycle state of an AA agent recommendation
DO $$ BEGIN
  CREATE TYPE recommendation_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'auto_approved',
    'modified'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- scan_trigger_type: what caused an agent scan to run
DO $$ BEGIN
  CREATE TYPE scan_trigger_type AS ENUM ('scheduled', 'user_action', 'external');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

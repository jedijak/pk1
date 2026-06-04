-- =============================================================================
-- Migration 008: Audit Log table
-- Append-only record of every significant data mutation across the schema.
-- No UPDATE or DELETE policies are granted (enforced in migration 010).
-- Idempotent: IF NOT EXISTS on table.
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- which table the change occurred in
  table_name    text        NOT NULL,

  -- the PK of the affected row
  record_id     uuid        NOT NULL,

  -- 'INSERT', 'UPDATE', 'DELETE', or custom domain verbs e.g. 'ARCHIVE'
  action        text        NOT NULL,

  -- snapshot of the row before the change (NULL for INSERT)
  old_values    jsonb,

  -- snapshot of the row after the change (NULL for DELETE)
  new_values    jsonb,

  -- NULL if performed by the system / agent
  performed_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  performed_at  timestamptz DEFAULT now()
);

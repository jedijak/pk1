# PROJECT.md — PK1

## 1. Overview
- **Purpose:** Personal Kanban board for Jak (The Exercise Coach franchise, St. Petersburg FL) with an Administrative Assistant (AA) Agent that scans the board, surfaces problems, and proposes actions. Human always approves before any external action; automation expands progressively as the recommendation acceptance rate climbs.
- **Key values:** Human-in-the-loop by default (no external action without approval); progressive automation gated on trust/acceptance metrics; protect Jak's time; move ASAP; clear audit trail for every change.
- **Hosting:** Cloudflare (Pages for frontend, Workers for API + AA Agent). Supabase (managed Postgres + Auth + Realtime) for data.
- **Serving:** Frontend served as a static SPA from Cloudflare Pages. API and Agent served as Cloudflare Workers. DB/Auth/Realtime served by Supabase directly to the browser (reads/subscriptions) and to Workers via service role (privileged writes).
- **Stack:** React + TypeScript (Vite, dnd-kit, Zustand) → Cloudflare Pages | Hono on Cloudflare Workers (REST API + Agent workers) | Supabase Postgres + Auth + Realtime | Claude API (Haiku for routine scans, Sonnet for deep analysis) | Cloudflare Cron Triggers, Queues, Durable Objects | GitHub Actions CI/CD.

## 2. Folder Structure
Monorepo at `github.com/jedijak/pk1` (npm workspaces). Local path: `/Users/jakplihal/workspaces/business/Kanban`.

| Path | What lives here | When to reference |
|---|---|---|
| `packages/frontend/` | React SPA → Cloudflare Pages (board UI, views, agent panel) | Building/changing any UI, views, drag-drop, auth screen |
| `packages/frontend/src/components/` | board / card / nested / views / agent / shared component groups | Adding or editing visual components |
| `packages/frontend/src/hooks/` | `useBoard`, `useCards`, `useAgent`, `useAuth` | Wiring data/realtime/auth into UI |
| `packages/frontend/src/lib/` | `supabase.ts` (client + realtime), `api.ts` (REST to backend) | Touching data access or realtime subscriptions |
| `packages/frontend/src/store/` | `boardStore.ts` (Zustand UI state) | View config, card order, drag/UI state |
| `packages/frontend/src/types/` | shared FE types (Card, Project, NestedItem, ViewConfig, BoardState) | Any type change; build this first |
| `packages/backend/` | Hono Worker = REST API (`pk1-backend`) | Endpoints, auth middleware, CRUD, approval routing |
| `packages/agent/` | Hono/Workers AA Agent (`pk1-agent`): cron, queue consumer, durable object, integration consumer | Scan logic, prompts, learning loop, integrations |
| `supabase/migrations/` | Numbered SQL migrations (enums → tables → indexes → RLS → realtime) | Any schema, RLS, index, or realtime change |
| `.github/workflows/` | `deploy-frontend.yml`, `deploy-workers.yml` | CI/CD changes |
| `wrangler.toml` | Root multi-env Workers config (vars per env; secrets via `wrangler secret put`) | Worker bindings, env vars, routes |
| `.env.example` | Template for local non-secret env | Onboarding a dev machine |

**Critical files:**
| File | Section pointers |
|---|---|
| `packages/frontend/src/types/index.ts` | §4 fe1-*, §9 (canonical field names, esp. `assignee_id`) |
| `packages/frontend/src/lib/supabase.ts` | §3 (realtime path), §10 (RLS-or-silent-drop gotcha) |
| `packages/backend/src/index.ts` (Hono app + routes) | §3, §4 be1-*, §5 wt/be1 |
| `packages/agent/` cron/consumer/DO entrypoints | §3, §4 ag1-*, §5 wt/ag1, §8 |
| `supabase/migrations/2024001*_*.sql` | §4 db1-*, §5 wt/db1, §10 (enum/realtime gotchas) |
| `supabase/migrations/20240010_rls_policies.sql` | §4 db1-04/05, §10 (RLS is the primary auth boundary) |
| `wrangler.toml` + `.github/workflows/*` | §4 in1-*, §5 wt/in1 |

## 3. Pipeline / Architecture

```
        ┌─────────────────────────── Browser (Cloudflare Pages SPA) ───────────────────────────┐
        │  React + Zustand UI                                                                    │
        │   ├─ reads/subscribes ──► Supabase Realtime (cards, recommendations, board_state)      │
        │   └─ all writes ────────► Hono API Worker (Authorization: Bearer <Supabase JWT>)       │
        └────────────────────────────────────────┬──────────────────────────────────────────────┘
                                                  │ (writes, CRUD, approvals)
                                                  ▼
                          ┌──────────────── pk1-backend (Hono on Workers) ────────────────┐
                          │  verify JWT → RLS-scoped writes via Supabase                   │
                          │  emits card-mutation events ─► Cloudflare Queue                │
                          │  /approvals approve ─► flips recommendation status             │
                          └───────────┬───────────────────────────────────┬───────────────┘
                                      │ (privileged service-role)         │ (events)
                                      ▼                                    ▼
                              Supabase Postgres                 ┌─ pk1-agent (Workers) ─┐
                       (RLS, Realtime publication,              │ agent-cron (30 min)   │
                        AuditLog, indexes)  ◄───writes─────────│ agent-consumer        │──► Claude API
                                      ▲                         │   (Haiku/Sonnet)      │   (Haiku/Sonnet)
                                      │ Realtime broadcast       │ agent-do (dedup +     │
                                      └─────────────────────────│   integration state)  │
                                                                │ integration-consumer  │──► Calendar / Telegram
                                                                └───────────────────────┘   (only after approval)
```

One paragraph naming each stage: **Browser SPA** renders the board, holds UI state in Zustand, subscribes to Supabase Realtime for live data, and routes every mutation through the API (never direct DB writes). **pk1-backend** (Hono Worker) verifies the Supabase JWT, performs RLS-scoped writes, emits card-mutation events to a Cloudflare Queue, and handles the approval endpoints. **Supabase Postgres** is the source of truth with RLS as the primary auth boundary, an append-only AuditLog, and a Realtime publication that broadcasts `cards`/`recommendations`/`board_state` changes back to all clients. **agent-cron** fires every 30 minutes, pulls a board snapshot, runs a zero-cost rule-based pre-filter, and enqueues an LLM task only when problems exist. **agent-consumer** drains the queue, injects a learning summary, calls Claude (Haiku routine / Sonnet deep), and writes recommendations to the DB. **agent-do** (Durable Object) dedups in-flight scans and holds integration-action state until approval. **integration-consumer** executes external actions (calendar, Telegram) only after a recommendation reaches `approved` or `auto_approved`.

## 4. Features
| ID | Section | Description | Definition of passing | Status |
|---|---|---|---|---|
| db1-01 | DB | Enums created | `\dT` shows all 9 enums | Planned |
| db1-02 | DB | All tables created | `\dt` shows 8 tables with correct columns | Planned |
| db1-03 | DB | Foreign keys enforced | Insert card with invalid project_id → FK error | Planned |
| db1-04 | DB | RLS blocks cross-user access | User B cannot SELECT User A's personal view | Planned |
| db1-05 | DB | Service role bypasses RLS | Service key can INSERT to agent_scans | Planned |
| db1-06 | DB | Realtime fires on card update | Subscription receives event within 1s of UPDATE | Planned |
| db1-07 | DB | Indexes exist | `\di` shows all 9 indexes | Planned |
| db1-08 | DB | Migrations run cleanly | `supabase db reset` completes with 0 errors | Planned |
| db1-09 | DB | Audit log append-only | RLS blocks DELETE on audit_log for anon/authed | Planned |
| db1-10 | DB | Card position ordering works | `ORDER BY position` returns consistent sort | Planned |
| be1-01 | BE | Hono scaffold + deploy to Workers | `curl /health` returns 200 from workers.dev | Planned |
| be1-02 | BE | JWT auth middleware | No/invalid token → 401; valid token passes | Planned |
| be1-03 | BE | Projects CRUD | All 4 ops return correct status codes + DB rows | Planned |
| be1-04 | BE | Cards CRUD | Create/update/delete; status transitions validated | Planned |
| be1-05 | BE | Views CRUD | View configs persist, return for correct user only | Planned |
| be1-06 | BE | Board state GET/PATCH | State persists per user_id across requests | Planned |
| be1-07 | BE | Approval queue endpoints | Approve flips recommendation status + emits integration action | Planned |
| be1-08 | BE | Agent webhook ingest | `POST /agent/webhook` stores recommendation; 202 | Planned |
| be1-09 | BE | Agent invoke endpoint | `POST /agent/invoke` enqueues job; returns job_id | Planned |
| be1-10 | BE | RLS validation via API | User A cannot read/modify User B's cards via API | Planned |
| fe1-01 | FE | Auth (login/logout) | Login persists on refresh; logout clears session | Planned |
| fe1-02 | FE | Project View (default) | Columns per project; cards show correct bg color | Planned |
| fe1-03 | FE | Card compact display | Priority badge, title, assignee avatar, due date, status, tags visible | Planned |
| fe1-04 | FE | Card drag-and-drop | Drag between columns; order persists after reload | Planned |
| fe1-05 | FE | Card detail expand | Modal: description, nested items, links, agent recs, activity log | Planned |
| fe1-06 | FE | Nested item management | Add/check/delete checklist items; saves without reload | Planned |
| fe1-07 | FE | View switching | All 6 views re-group/re-filter cards correctly | Planned |
| fe1-08 | FE | Agent recommendation panel | Recs surface in card detail; no action without approval click | Planned |
| fe1-09 | FE | Realtime sync | Other-session card update appears within 3s, no refresh | Planned |
| fe1-10 | FE | Assignee View | Cards grouped by `assignee_id`; count + workload indicator | Planned |
| fe1-11 | FE | Risk & Deadline View | Sorted by priority weight + days-to-due; overdue flagged | Planned |
| fe1-12 | FE | Problems in Flow View | Agent blocked/overdue/missing list; read-only except approve/dismiss | Planned |
| ag1-01 | AI | Cron scan every 30 min | CF log shows invocation; DB row written | Planned |
| ag1-02 | AI | Rule-based pre-filter | Overdue card detected with zero LLM call | Planned |
| ag1-03 | AI | LLM recommendation generation | Valid schema-matching JSON for seeded board | Planned |
| ag1-04 | AI | Recommendation stored in DB | Row queryable via API within 5s of scan | Planned |
| ag1-05 | AI | Approve/reject endpoint | Status PATCH updates row, triggers integration queue | Planned |
| ag1-06 | AI | Integration action queued on approval | Queue msg appears after approval, NOT before | Planned |
| ag1-07 | AI | Learning summary injected | Logged system prompt contains accept-rate block | Planned |
| ag1-08 | AI | Auto-approve threshold logic | High-accept type auto_approved without UI action | Planned |
| ag1-09 | AI | Token spend tracked per scan | `agent_scans` row has `tokens_used`, `model_used` | Planned |
| ag1-10 | AI | Dedup via Durable Object | Concurrent cron fire produces no duplicate rows | Planned |
| in1-01 | Infra | Repo created, structure committed | `gh repo view jedijak/pk1` returns 200; structure exists | Planned |
| in1-02 | Infra | Pages deploys on push to main | Dummy commit → Pages build succeeds | Planned |
| in1-03 | Infra | Workers deploy via wrangler CI | `wrangler deploy` in Actions completes clean | Planned |
| in1-04 | Infra | PR preview URL generated | Open PR → Pages posts preview URL | Planned |
| in1-05 | Infra | All secrets set in production env | `wrangler secret list --env production` shows all keys | Planned |
| in1-06 | Infra | Branch protection active | Direct push to main rejected | Planned |
| in1-07 | Infra | Staging env functional | Push to staging → staging worker responds | Planned |

## 5. Worktrees

Dependency map:
```
wt/db1 → wt/be1 → wt/fe1
              ↘ wt/ag1
wt/in1 (parallel, but needs db1 + be1 for env vars / route config)
```

### wt/db1 — Database (Supabase/Postgres)
- **Branch:** `wt/db1` | **ID:** db1
- **Serving:** Supabase managed Postgres + Auth + Realtime.
- **Dependencies:** None (start first).
- **Contains:** 11 numbered migrations (enums → projects → cards → view_configurations → board_state → agent_scans → recommendations → audit_log → indexes → RLS → realtime publication); RLS policies; index strategy; realtime publication. Canonical field name `assignee_id` (not `owner_id`). `card_order` JSONB contract `{ "<status>": [uuid,...] }`.
- **Definition of done:** db1-01..db1-10 pass; `supabase db reset` runs with 0 errors; RLS verified for cross-user block + service-role bypass; realtime fires <1s.
- **Mergeable when:** All migrations idempotent and applied to staging; RLS + realtime smoke tests green; schema published to be1 (URL, anon key, service-role key).
- **How to test:** `supabase db reset` + seed (1 project, 5 cards, 2 users); dashboard SQL `SET role` RLS test; Table Editor realtime watch; `EXPLAIN ANALYZE` on 3 key queries.

### wt/be1 — Backend API (Hono on Cloudflare Workers)
- **Branch:** `wt/be1` | **ID:** be1
- **Serving:** Cloudflare Worker `pk1-backend` (REST). NOT Express — Hono, Workers-native.
- **Dependencies:** db1 (hard — needs URL, anon key, service-role key, applied schema + active RLS).
- **Contains:** Hono app + route surface (auth/verify, projects, cards, views, board-state, approvals, agent/webhook, agent/invoke, recommendations); JWT middleware; CORS for Pages origin; card-mutation event emission to Cloudflare Queue; approval → recommendation-status flip. LLM/external work is async (queue + job_id), never synchronous in a handler.
- **Definition of done:** be1-01..be1-10 pass; `/health` 200; JWT enforced; CRUD round-trips through Supabase; cross-user blocked via API.
- **Mergeable when:** Deployed to staging worker; integration tests against db1 staging green; CORS whitelists Pages origin; route/binding config handed to in1.
- **How to test:** F1 deploy + `/health`; F2 JWT via `auth.getUser()`; F3 Cards POST+GET round-trip Hono → Supabase → back.

### wt/fe1 — Frontend (React/TypeScript → Cloudflare Pages)
- **Branch:** `wt/fe1` | **ID:** fe1
- **Serving:** Static SPA on Cloudflare Pages (no SSR; `_redirects` SPA fallback day 1).
- **Dependencies:** be1 (API for all writes), db1 (Realtime + anon key for reads/subscriptions).
- **Contains:** Component groups (board/card/nested/views/agent/shared); hooks (useAuth, useBoard, useCards, useAgent); `lib/supabase.ts` (client + Realtime), `lib/api.ts` (REST writes); Zustand `boardStore`; shared types. NO `ws.ts`/custom WebSocket — Supabase Realtime only. All writes go through the API.
- **Definition of done:** fe1-01..fe1-12 pass; 6 views render correctly; drag order persists; realtime sync <3s; agent panel strictly read-only except approve/reject/modify.
- **Mergeable when:** Deployed to Pages preview; auth + board + views + agent panel work against be1 staging; no direct Supabase writes anywhere in code.
- **How to test:** Two-tab realtime test (<3s); dnd-kit column-to-column order test; CF Pages Hello-World deploy before full build.

### wt/ag1 — AA Agent (Cloudflare Workers + Claude API)
- **Branch:** `wt/ag1` | **ID:** ag1
- **Serving:** Cloudflare Workers `pk1-agent`: `agent-cron`, `agent-consumer`, `agent-do` (Durable Object), `integration-consumer`. Claude API (Haiku routine / Sonnet deep).
- **Dependencies:** be1 (API for board snapshot + recommendation writes), db1 (schema for recommendations, agent_scans, learning outcomes).
- **Contains:** 30-min cron + rule-based pre-filter; queue-driven LLM scans; recommendation schema; learning loop (90-day accept-rate per type → ≤200-token summary injected into prompt; >85% accept over ≥20 samples → auto_approve); integration queue gated on approval; Durable Object dedup (idempotent upsert on `scan_id`).
- **Definition of done:** ag1-01..ag1-10 pass; valid JSON recs; learning summary present in prompt; auto-approve threshold honored; no duplicate rows on concurrent cron; token spend tracked.
- **Mergeable when:** Deployed to staging; recs visible via be1 API <5s; integration action provably queued only after approval; dedup proven.
- **How to test:** Local Wrangler cron fire + snapshot log; seed 5 cards (1 overdue) → Haiku → assert schema; approval stub → assert integration queue entry; DO duplicate-block test.

### wt/in1 — Infrastructure (Cloudflare, GitHub Actions, CI/CD)
- **Branch:** `wt/in1` | **ID:** in1
- **Serving:** GitHub Actions → Cloudflare Pages + Workers deploys; repo `github.com/jedijak/pk1`.
- **Dependencies:** Runs largely in parallel, but in1-05 needs db1 Supabase URLs (prod+staging) and in1-03 needs be1 Worker route/binding config.
- **Contains:** Monorepo scaffold (packages/frontend, packages/backend, packages/agent); two workflows (deploy-frontend path-filtered, deploy-workers path-filtered); env matrix (prod/staging/local); secrets via `wrangler secret put` (SERVICE_ROLE_KEY, CLAUDE_API_KEY, TELEGRAM_BOT_TOKEN, + Supabase anon/url as vars); branch protection; PR preview URLs.
- **Definition of done:** in1-01..in1-07 pass; repo + structure committed; Pages/Workers deploy on push to main; PR previews; all prod secrets set; branch protection on; staging functional.
- **Mergeable when:** CI green for a trivial change across all three packages; secrets listed in prod env; staging worker responds. NOTE: all workflows fail until Jak completes the Cloudflare dashboard checklist (account ID, Pages connect, API token).
- **How to test:** `npm create cloudflare@latest` scaffold <5 min; `wrangler dev` against staging Supabase <10 min; `wrangler pages deploy dist` <5 min.

## 6. Feasibility Tests
| Test | What it validates | Pass criteria |
|---|---|---|
| Supabase `db reset` + seed | Migrations apply end-to-end | 1 project, 5 cards, 2 users seed with 0 errors |
| RLS `SET role` smoke | Row-level ownership enforced | User B cannot read User A rows; service role can |
| Realtime watch + update | Realtime publication works | Subscription fires <1s on UPDATE |
| `EXPLAIN ANALYZE` on key queries | Index strategy effective | Indexes used; no seq-scan on hot paths |
| Hono scaffold + `/health` | Workers deploy pipeline | `curl /health` 200 from workers.dev |
| JWT middleware via `auth.getUser()` | Auth integration | Invalid token 401; valid passes |
| Cards POST+GET round-trip | DB connectivity from Worker | Card created and read back through Hono |
| Two-tab Supabase realtime (FE) | Live board sync | Update in tab A appears in tab B <3s |
| dnd-kit column-to-column | Drag/reorder state | Order state updates correctly between mock columns |
| CF Pages Hello-World deploy | Pages build pipeline | React app builds and serves on Pages before full build |
| Cron Worker fires + logs snapshot | Cron + snapshot assembly | Wrangler local cron fires; board snapshot logged |
| Seed overdue → Haiku schema | LLM produces valid recs | Valid schema-matching JSON returned |
| Approval stub → integration queue | Approval gating | Queue entry created only after approval |
| Durable Object dedup | Concurrent-scan safety | Second concurrent fire produces no duplicate rows |
| `wrangler dev` vs staging Supabase | Local dev loop | Backend runs locally against staging <10 min |
| `wrangler pages deploy dist` | Manual Pages deploy | Deploy succeeds <5 min |

## 7. End-to-End Tests
| Test | Flow | Pass criteria |
|---|---|---|
| E2E-1 Login → board | Jak logs in (Supabase JWT) → SPA loads Project View → cards render | Session persists on refresh; correct cards/colors; logout clears session |
| E2E-2 Create + move card | Create card via API → appears in column → drag to new column → reload | Card persists; drag order survives reload; AuditLog row written |
| E2E-3 Realtime cross-session | Tab A moves card → Tab B (no refresh) | Tab B reflects change <3s via Supabase Realtime |
| E2E-4 Agent scan → recommendation | Seed overdue card → cron (or invoke) → pre-filter → Haiku → rec stored → surfaces in Problems in Flow | Rec visible via API <5s and in UI; matches schema; no external action taken |
| E2E-5 Approve → external action | Jak taps Approve on a rec with `integration_actions` → status flips → integration-consumer executes | Calendar/Telegram action fires ONLY after approval; `executed_at` set; pre-approval queue empty |
| E2E-6 Auto-approve threshold | Type history >85% accept over ≥20 samples → new rec of that type | Rec auto_approved without UI; still logged + auditable; non-qualifying types stay pending |
| E2E-7 RLS isolation | User B authenticates → attempts to read/modify User A card via API + via direct anon client | Both blocked (API 403/empty; anon RLS-filtered); service-role agent unaffected |
| E2E-8 CI deploy | PR merged to main touching frontend + backend | Pages + Workers deploy via Actions; PR preview existed; staging stayed green |

## 8. Improvements / Auto-Research Hook
- **Sections to optimize:** AA Agent recommendation quality.
- **Metric per section:** acceptance rate per recommendation type (overdue, stuck, dependency_conflict, overallocation, missing_info, priority_change).
- **Benchmark size:** start with 60 train / 20 validation / 20 holdout once 100 recommendations exist.
- **Win condition:** ≥10% acceptance-rate improvement per iteration with no regression on already-approved types. Auto-approve only types holding >85% accept over ≥20 samples.

## 9. Coding Conventions
Project-specific overrides only:
- **Canonical card-owner field is `assignee_id`** (DB rename of `owner_id`). FE component `OwnerAvatar` and AI `owner` must read `assignee_id`. Never reintroduce `owner_id`.
- **All writes go through the Hono API.** The browser never writes to Supabase directly — preserves AuditLog + approval gate. Browser may only READ and SUBSCRIBE via the anon key (RLS-enforced).
- **Realtime is Supabase Realtime only.** No custom WebSocket client, no relay through Workers. Do not create `lib/ws.ts`.
- **Framework is Hono on Workers, not Express.** Ignore any "Express" reference in early FE notes.
- **LLM/external calls are always async** (Cloudflare Queue + return `job_id`); never block a request/cron handler on Claude.
- **Consumers must be idempotent** — Cloudflare Queues are at-least-once; upsert on `scan_id`.
- **Secrets via `wrangler secret put` only** — never in `wrangler.toml`; non-secret vars in `[vars]`.
- **Migrations idempotent** (`CREATE IF NOT EXISTS` / guarded `DO $$`); numbered sequentially.
- **AuditLog is append-only** — no RLS path may DELETE it.
- **`card_order` JSONB contract:** `{ "<status>": [uuid, ...] }`; last-write-wins acceptable at solo scale.
- **Agent UI is strictly read-only** except Approve / Reject / Modify; any approval-UX ambiguity is a trust/safety defect.

## 10. Gotchas
Append-only. Newest at bottom.

- **[Resolved conflict — Realtime transport]** FE plan referenced a `lib/ws.ts` WebSocket client; BE/DB plans standardize on Supabase Realtime with no Worker relay (Workers can't hold persistent connections). Resolution: Supabase Realtime only; `ws.ts` removed from scope.
- **[Resolved conflict — backend framework]** FE plan mentioned "Express API"; BE plan chose Hono on Workers (Express needs a latency shim on Workers). Resolution: Hono everywhere; "Express" is dead wording.
- **[Resolved conflict — owner field name]** FE/AI used `owner_id`/`owner`; DB renamed to `assignee_id`. Resolution: `assignee_id` is canonical across all layers.
- **[Resolved conflict — approval/recommendation endpoints]** BE exposes `/approvals/:id/approve|reject`; AI plan PATCHes `/recommendations/:id`. Resolution: both map to the same state machine — `/recommendations/:id` (PATCH status) is the canonical mutation; `/approvals/*` are convenience aliases that flip the same recommendation row and emit the gated integration action. Implement once, alias the route.
- **[Resolved conflict — Durable Object scope]** DO is scoped narrowly to `AgentSession`: (a) dedup of in-flight scans (idempotent on `scan_id`) and (b) holding integration-action state until approval. DOs are NOT used for board-sync/WebSocket fan-out (that's Supabase Realtime). Keeps DO footprint minimal.
- **CF Pages has no SSR** — all routing client-side; add `_redirects` SPA fallback on day 1 or deep links 404.
- **Supabase Realtime needs SELECT RLS policies** — missing policies silently DROP events (no error). Verify RLS before debugging "realtime not firing."
- **RLS is the primary auth boundary**, the API is a second layer — never rely on the API alone; the anon key is in the browser by design.
- **Workers CPU limit** (10ms–30s depending on plan/trigger) — Claude calls must be queued, never synchronous. AA Agent likely needs the Paid $5/mo plan if scans exceed 10ms.
- **Cloudflare Queues are at-least-once** — every consumer must be idempotent (upsert on `scan_id`).
- **Postgres enum additions are destructive/non-transactional** — `ALTER TYPE ... ADD VALUE` can't run inside a transaction; plan enum values up front.
- **`card_order` / `board_state` last-write-wins** — fine solo; multi-user drag needs CRDT/optimistic locking (deferred).
- **`member_ids uuid[]` on Project** drives RLS without a join table — fine solo; add `project_members` table if team features grow.
- **Boards >200 cards** exceed comfortable LLM context — paginate/summarize snapshot before prompt injection.
- **All CI/CD fails until Jak completes the Cloudflare dashboard checklist** (account ID, Pages → connect `jedijak/pk1`, API token → GitHub secrets). This is the critical-path manual step for in1.
- **Repo does not yet exist** — `github.com/jedijak/pk1` must be created (code currently only at `/Users/jakplihal/workspaces/business/Kanban`, not its own repo). in1-01 is the unblocker for CI.

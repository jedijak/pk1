# KEY.md — PK1 Routing Table

Read this first. It tells you where to look in 10 seconds. Canonical spec is `PROJECT.md`.

## A. Task-Based Routing — "I'm doing X, read Y"

| If you are... | Read | Worktree |
|---|---|---|
| Changing the DB schema / RLS / indexes / realtime | `supabase/migrations/*`, PROJECT.md §5 wt/db1, §10 (enum + realtime gotchas) | wt/db1 |
| Adding/changing an API endpoint | `packages/backend/`, PROJECT.md §3, §5 wt/be1 | wt/be1 |
| Building UI / views / drag-drop / agent panel | `packages/frontend/`, PROJECT.md §5 wt/fe1, §9 | wt/fe1 |
| Touching realtime/data access in the browser | `packages/frontend/src/lib/supabase.ts`, §9, §10 (RLS-silent-drop) | wt/fe1 |
| Changing agent scan / prompt / learning loop | `packages/agent/`, PROJECT.md §5 wt/ag1, §8 | wt/ag1 |
| Working on integrations (calendar/Telegram) | `packages/agent/` integration-consumer, §3, §10 (approval gating) | wt/ag1 |
| CI/CD, deploys, secrets, repo, branch protection | `.github/workflows/`, `wrangler.toml`, PROJECT.md §5 wt/in1 | wt/in1 |
| Adding a field that crosses layers (e.g. card field) | `types/index.ts` + migration + API + agent schema; §9 (assignee_id rule) | db1+be1+fe1+ag1 |
| Resolving a conflict between plans | PROJECT.md §10 (Resolved-conflict entries) | — |
| Defining "done" for a feature | PROJECT.md §4 (per-feature pass criteria) | — |
| Verifying a worktree is mergeable | PROJECT.md §5 (per-worktree "mergeable when") | — |
| Tuning agent recommendation quality | PROJECT.md §8 (metrics, benchmark, win condition) | wt/ag1 |
| Running spikes before building | PROJECT.md §6 (feasibility tests) | per-domain |
| Validating a golden path end-to-end | PROJECT.md §7 (E2E tests) | full-stack |

## B. File-Based Routing — "What is this file for?"

| File / Path | Purpose |
|---|---|
| `PROJECT.md` | Single source of truth: overview, features, worktrees, tests, conventions, gotchas |
| `KEY.md` | This routing table |
| `packages/frontend/src/types/index.ts` | Shared FE types. Build first. Canonical field names |
| `packages/frontend/src/lib/supabase.ts` | Supabase client + Realtime subscriptions (READ/SUBSCRIBE only) |
| `packages/frontend/src/lib/api.ts` | REST calls to backend (ALL writes go here) |
| `packages/frontend/src/store/boardStore.ts` | Zustand UI state (view, selection, drag, filters) |
| `packages/frontend/src/components/agent/` | Agent recommendation panel — strictly read-only + approve/reject/modify |
| `packages/backend/` (Hono app + routes) | REST API, JWT middleware, CRUD, approval/recommendation state machine, event emit |
| `packages/agent/` agent-cron | 30-min cron, board snapshot, rule pre-filter, enqueue |
| `packages/agent/` agent-consumer | Queue consumer, Claude call (Haiku/Sonnet), learning summary, write recs |
| `packages/agent/` agent-do | Durable Object: scan dedup + integration-action state until approval |
| `packages/agent/` integration-consumer | Executes calendar/Telegram ONLY after approval |
| `supabase/migrations/2024000*_*.sql` | Enums, tables, schema |
| `supabase/migrations/20240009_indexes.sql` | Index strategy |
| `supabase/migrations/20240010_rls_policies.sql` | RLS — primary auth boundary |
| `supabase/migrations/20240011_realtime_publication.sql` | Realtime publication (cards, recommendations, board_state) |
| `wrangler.toml` | Workers multi-env config; `[vars]` non-secrets only |
| `.github/workflows/deploy-frontend.yml` | Pages deploy on push to main (frontend path) |
| `.github/workflows/deploy-workers.yml` | Workers deploy on push to main (backend/agent path) |
| `.env.example` | Local non-secret env template |

## C. PROJECT.md Section Index (§1–§10)

| § | Section | Go here when you need... |
|---|---|---|
| §1 | Overview | Purpose, values, hosting, serving, stack |
| §2 | Folder Structure | Where code lives; critical-file pointers |
| §3 | Pipeline / Architecture | Data/control flow diagram + stage descriptions |
| §4 | Features | All features (db1/be1/fe1/ag1/in1) + pass criteria + status |
| §5 | Worktrees | Dependency map + per-worktree branch/deps/DoD/test |
| §6 | Feasibility Tests | Pre-build spikes (≤60 min each) |
| §7 | End-to-End Tests | Golden-path full-stack tests (E2E-1..8) |
| §8 | Improvements / Auto-Research | Agent quality metric, benchmark split, win condition |
| §9 | Coding Conventions | Project-specific overrides (assignee_id, writes-via-API, Hono, async LLM) |
| §10 | Gotchas | Resolved conflicts + landmines (append-only) |

## D. Worktree Dependency Map (build order)

```
wt/db1 → wt/be1 → wt/fe1
              ↘ wt/ag1
wt/in1 (parallel; needs db1 URLs + be1 routes for env/secrets)
```
Start db1. be1 unblocks fe1 and ag1. in1 runs alongside but is itself blocked at runtime until Jak finishes the Cloudflare dashboard checklist (PROJECT.md §5 wt/in1, §10).

## E. Hard Rules (memorize — they override defaults)
1. Field name is `assignee_id`, never `owner_id`.
2. Browser writes go through the Hono API only; browser READs/SUBSCRIBES via Supabase + anon key (RLS-enforced).
3. Realtime = Supabase Realtime only. No `ws.ts`, no Worker relay.
4. Framework = Hono on Workers, never Express.
5. LLM/external calls are async (Queue + job_id); never block a handler.
6. No external action (calendar/Telegram) without approval. Auto-approve only types >85% accept over ≥20 samples.
7. Secrets via `wrangler secret put` only.

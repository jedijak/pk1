-- =============================================================================
-- Seed Data: PK1 Prototype
-- =============================================================================
-- IMPORTANT: Replace all occurrences of
--   00000000-0000-0000-0000-000000000000
-- with the actual Supabase auth.users UUID after you create your first user.
--
-- Run via: supabase db seed   (or psql -f seed.sql against a local instance)
-- =============================================================================

-- Placeholder user ID — swap this out before running in any real environment
-- \set test_user_id '00000000-0000-0000-0000-000000000000'

DO $$
DECLARE
  v_user_id        uuid := '00000000-0000-0000-0000-000000000000';
  v_project_id     uuid;
  v_card_1         uuid;
  v_card_2         uuid;
  v_card_3         uuid;
  v_card_4         uuid;
  v_card_5         uuid;
  v_card_6         uuid;
  v_card_7         uuid;
  v_card_8         uuid;
  v_view_project   uuid;
  v_view_assignee  uuid;
  v_view_risk      uuid;
  v_view_budget    uuid;
  v_view_func      uuid;
  v_view_custom    uuid;
BEGIN

  -- -----------------------------------------------------------------------
  -- Project
  -- -----------------------------------------------------------------------
  INSERT INTO projects (id, name, description, owner_id, member_ids)
  VALUES (
    gen_random_uuid(),
    'Exercise Coach Operations',
    'Kanban board for managing an online fitness coaching business: client onboarding, program design, content creation, and tech automation.',
    v_user_id,
    ARRAY[]::uuid[]
  )
  RETURNING id INTO v_project_id;

  -- -----------------------------------------------------------------------
  -- Cards (8 total; mix of types, statuses, priorities, and past due dates)
  -- -----------------------------------------------------------------------

  -- Card 1: human_touchpoint / dark_tan / in_progress / high
  INSERT INTO cards (
    id, project_id, title, description, type, background_color,
    status, priority, assignee_id, due_date, position, tags,
    nested_items
  ) VALUES (
    gen_random_uuid(),
    v_project_id,
    'Onboard New Client: Sarah M.',
    'Complete intake form review, set initial goals, and schedule first 1:1 call.',
    'human_touchpoint', 'dark_tan',
    'in_progress', 'high',
    v_user_id,
    now() - interval '2 days',   -- intentionally overdue for agent testing
    0,
    ARRAY['onboarding', 'client'],
    '[
      {"id":"ni-1","type":"checklist_item","content":"Review intake form","checked":true},
      {"id":"ni-2","type":"checklist_item","content":"Send welcome email","checked":true},
      {"id":"ni-3","type":"checklist_item","content":"Schedule discovery call","checked":false},
      {"id":"ni-4","type":"question","content":"What is her primary fitness goal?","checked":false}
    ]'::jsonb
  ) RETURNING id INTO v_card_1;

  -- Card 2: human_touchpoint / dark_tan / backlog / medium
  INSERT INTO cards (
    id, project_id, title, description, type, background_color,
    status, priority, due_date, position, tags
  ) VALUES (
    gen_random_uuid(),
    v_project_id,
    'Design 8-Week Strength Program',
    'Create a progressive overload strength plan for intermediate clients. Include video demos for each exercise.',
    'human_touchpoint', 'dark_tan',
    'backlog', 'medium',
    v_user_id,
    now() + interval '14 days',
    1,
    ARRAY['programming', 'content']
  ) RETURNING id INTO v_card_2;

  -- Card 3: code_agent_work / light_gray / ready / high
  INSERT INTO cards (
    id, project_id, title, description, type, background_color,
    status, priority, due_date, position, tags,
    nested_items
  ) VALUES (
    gen_random_uuid(),
    v_project_id,
    'Automate Weekly Check-in Emails',
    'Build a Hono API route + cron job that sends personalized check-in emails to active clients every Sunday at 8 AM.',
    'code_agent_work', 'light_gray',
    'ready', 'high',
    v_user_id,
    now() + interval '7 days',
    0,
    ARRAY['automation', 'email', 'backend'],
    '[
      {"id":"ni-5","type":"decision_point","content":"Use Resend or SendGrid?","checked":false},
      {"id":"ni-6","type":"checklist_item","content":"Write API route /api/checkins/send","checked":false},
      {"id":"ni-7","type":"checklist_item","content":"Create email template","checked":false},
      {"id":"ni-8","type":"checklist_item","content":"Register cron in Supabase Edge Functions","checked":false}
    ]'::jsonb
  ) RETURNING id INTO v_card_3;

  -- Card 4: code_agent_work / light_gray / in_progress / critical  (overdue)
  INSERT INTO cards (
    id, project_id, title, description, type, background_color,
    status, priority, assignee_id, due_date, position, tags,
    agent_flagged
  ) VALUES (
    gen_random_uuid(),
    v_project_id,
    'Fix Client Portal Auth Bug',
    'Users are occasionally getting logged out mid-session. Suspected Supabase token refresh race condition.',
    'code_agent_work', 'light_gray',
    'in_progress', 'critical',
    v_user_id,
    now() - interval '5 days',   -- overdue by 5 days — agent should flag
    1,
    ARRAY['bug', 'auth', 'backend'],
    true   -- pre-flagged by agent
  ) RETURNING id INTO v_card_4;

  -- Card 5: human_touchpoint / dark_tan / review / medium
  INSERT INTO cards (
    id, project_id, title, description, type, background_color,
    status, priority, due_date, position, tags,
    nested_items
  ) VALUES (
    gen_random_uuid(),
    v_project_id,
    'Record YouTube: "5 Deadlift Mistakes"',
    'Script written. Record and edit a 10–12 min YouTube video targeting intermediate lifters.',
    'human_touchpoint', 'dark_tan',
    'review', 'medium',
    v_user_id,
    now() + interval '3 days',
    0,
    ARRAY['content', 'youtube'],
    '[
      {"id":"ni-9","type":"checklist_item","content":"Final script review","checked":true},
      {"id":"ni-10","type":"checklist_item","content":"Record video","checked":true},
      {"id":"ni-11","type":"checklist_item","content":"Edit and add b-roll","checked":false},
      {"id":"ni-12","type":"note","content":"Thumbnail design outsourced to Canva template","checked":false}
    ]'::jsonb
  ) RETURNING id INTO v_card_5;

  -- Card 6: human_touchpoint / dark_tan / done / low
  INSERT INTO cards (
    id, project_id, title, description, type, background_color,
    status, priority, due_date, position, tags
  ) VALUES (
    gen_random_uuid(),
    v_project_id,
    'Set Up Stripe Subscription Tiers',
    'Created Basic ($99/mo) and Premium ($199/mo) products in Stripe. Webhooks wired to Supabase.',
    'human_touchpoint', 'dark_tan',
    'done', 'low',
    v_user_id,
    now() - interval '10 days',
    0,
    ARRAY['billing', 'stripe']
  ) RETURNING id INTO v_card_6;

  -- Card 7: code_agent_work / light_gray / backlog / high
  INSERT INTO cards (
    id, project_id, title, description, type, background_color,
    status, priority, due_date, position, tags
  ) VALUES (
    gen_random_uuid(),
    v_project_id,
    'Build AI Workout Recommendation Engine',
    'Use Claude API to generate adaptive weekly workouts based on client fatigue scores and past performance data.',
    'code_agent_work', 'light_gray',
    'backlog', 'high',
    v_user_id,
    now() + interval '30 days',
    2,
    ARRAY['ai', 'claude', 'feature']
  ) RETURNING id INTO v_card_7;

  -- Card 8: human_touchpoint / dark_tan / ready / medium
  INSERT INTO cards (
    id, project_id, title, description, type, background_color,
    status, priority, due_date, position, tags
  ) VALUES (
    gen_random_uuid(),
    v_project_id,
    'Q3 Revenue & Client Retention Review',
    'Analyze monthly recurring revenue, churn rate, and NPS scores. Prepare a 1-page summary for strategic planning.',
    'human_touchpoint', 'dark_tan',
    'ready', 'medium',
    v_user_id,
    now() + interval '10 days',
    1,
    ARRAY['finance', 'strategy', 'review']
  ) RETURNING id INTO v_card_8;

  -- -----------------------------------------------------------------------
  -- View Configurations (one per grouping_principle)
  -- -----------------------------------------------------------------------

  -- 1. Default: grouped by project
  INSERT INTO view_configurations (
    id, project_id, name, description, grouping_principle, visibility, created_by
  ) VALUES (
    gen_random_uuid(),
    v_project_id,
    'All Cards by Project',
    'Standard board view: all cards grouped by project column.',
    'project', 'personal', v_user_id
  ) RETURNING id INTO v_view_project;

  -- 2. By assignee
  INSERT INTO view_configurations (
    id, project_id, name, description, grouping_principle, visibility, created_by
  ) VALUES (
    gen_random_uuid(),
    v_project_id,
    'By Assignee',
    'See workload distribution across team members.',
    'assignee', 'personal', v_user_id
  ) RETURNING id INTO v_view_assignee;

  -- 3. Risk / deadline
  INSERT INTO view_configurations (
    id, project_id, name, description, grouping_principle,
    filter_logic, visibility, created_by
  ) VALUES (
    gen_random_uuid(),
    v_project_id,
    'Risk & Deadline Watch',
    'Surfaced by the AA agent: overdue or high-risk items first.',
    'risk_deadline',
    '{"sort":[{"field":"due_date","dir":"asc"},{"field":"priority","dir":"desc"}],"filters":[{"field":"archived_at","op":"is_null"}]}'::jsonb,
    'personal', v_user_id
  ) RETURNING id INTO v_view_risk;

  -- 4. Budget approval
  INSERT INTO view_configurations (
    id, project_id, name, description, grouping_principle, visibility, created_by
  ) VALUES (
    gen_random_uuid(),
    v_project_id,
    'Budget Approval Queue',
    'Cards that require financial sign-off.',
    'budget_approval', 'personal', v_user_id
  ) RETURNING id INTO v_view_budget;

  -- 5. Code function
  INSERT INTO view_configurations (
    id, project_id, name, description, grouping_principle,
    filter_logic, visibility, created_by
  ) VALUES (
    gen_random_uuid(),
    v_project_id,
    'Engineering Backlog',
    'Only code_agent_work cards, grouped by functional area.',
    'code_function',
    '{"filters":[{"field":"type","op":"eq","value":"code_agent_work"}]}'::jsonb,
    'personal', v_user_id
  ) RETURNING id INTO v_view_func;

  -- 6. Custom
  INSERT INTO view_configurations (
    id, project_id, name, description, grouping_principle,
    filter_logic, visibility, created_by
  ) VALUES (
    gen_random_uuid(),
    v_project_id,
    'This Week Focus',
    'Custom view: cards due within the next 7 days, sorted by priority.',
    'custom',
    '{"filters":[{"field":"due_date","op":"lte","value":"now()+7d"},{"field":"status","op":"not_in","value":["done"]}],"sort":[{"field":"priority","dir":"desc"}]}'::jsonb,
    'personal', v_user_id
  ) RETURNING id INTO v_view_custom;

  -- -----------------------------------------------------------------------
  -- Board State: initialize the user's board with the project view active
  -- -----------------------------------------------------------------------
  INSERT INTO board_state (user_id, current_view_id, card_order)
  VALUES (
    v_user_id,
    v_view_project,
    json_build_object(
      'backlog',    json_build_array(v_card_2::text, v_card_7::text),
      'ready',      json_build_array(v_card_3::text, v_card_8::text),
      'in_progress',json_build_array(v_card_1::text, v_card_4::text),
      'review',     json_build_array(v_card_5::text),
      'done',       json_build_array(v_card_6::text)
    )::jsonb
  )
  ON CONFLICT (user_id) DO UPDATE
    SET current_view_id = EXCLUDED.current_view_id,
        card_order      = EXCLUDED.card_order,
        updated_at      = now();

  RAISE NOTICE 'Seed complete. Project: %, Cards: 8, Views: 6', v_project_id;

END $$;

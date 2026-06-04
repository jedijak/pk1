// ─── Enums ────────────────────────────────────────────────────────────────────

export type CardType = 'human_touchpoint' | 'code_agent_work';
export type CardBgColor = 'dark_tan' | 'light_gray';
export type CardStatus = 'backlog' | 'ready' | 'in_progress' | 'review' | 'done';
export type CardPriority = 'critical' | 'high' | 'medium' | 'low';
export type RecommendationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'auto_approved'
  | 'modified';

// ─── DB Row Types ─────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  card_type: CardType;
  card_status: CardStatus;
  card_priority: CardPriority;
  card_bg_color: CardBgColor | null;
  assignee_id: string | null;
  position: number;
  due_date: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ViewConfiguration {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  filters: Record<string, unknown> | null;
  grouping: string | null;
  sort_order: Record<string, unknown> | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface BoardState {
  id: string;
  project_id: string;
  user_id: string;
  card_order: Record<string, string[]> | null;
  current_view_id: string | null;
  updated_at: string;
}

export interface Recommendation {
  id: string;
  project_id: string;
  card_id: string | null;
  created_by_agent_scan_id: string | null;
  title: string;
  description: string | null;
  recommendation_status: RecommendationStatus;
  payload: Record<string, unknown> | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentScan {
  id: string;
  project_id: string;
  triggered_by: string | null;
  status: 'queued' | 'running' | 'complete' | 'failed';
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_cost_usd: number | null;
  result_summary: string | null;
  created_at: string;
  completed_at: string | null;
}

// ─── Request / Response Shapes ────────────────────────────────────────────────

export interface CreateProjectBody {
  name: string;
  description?: string;
}

export interface UpdateProjectBody {
  name?: string;
  description?: string;
}

export interface CreateCardBody {
  title: string;
  description?: string;
  card_type?: CardType;
  card_status?: CardStatus;
  card_priority?: CardPriority;
  card_bg_color?: CardBgColor;
  assignee_id?: string;
  position?: number;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateCardBody {
  title?: string;
  description?: string;
  card_type?: CardType;
  card_status?: CardStatus;
  card_priority?: CardPriority;
  card_bg_color?: CardBgColor;
  assignee_id?: string;
  position?: number;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface MoveCardBody {
  status: CardStatus;
  position: number;
}

export interface CreateViewBody {
  project_id: string;
  name: string;
  filters?: Record<string, unknown>;
  grouping?: string;
  sort_order?: Record<string, unknown>;
  is_default?: boolean;
}

export interface UpdateViewBody {
  name?: string;
  filters?: Record<string, unknown>;
  grouping?: string;
  sort_order?: Record<string, unknown>;
  is_default?: boolean;
}

export interface UpdateBoardStateBody {
  card_order?: Record<string, string[]>;
  current_view_id?: string;
}

export interface UpdateRecommendationBody {
  recommendation_status: RecommendationStatus;
  payload?: Record<string, unknown>;
}

export interface CreateRecommendationBody {
  project_id: string;
  card_id?: string;
  created_by_agent_scan_id?: string;
  title: string;
  description?: string;
  payload?: Record<string, unknown>;
}

export interface AgentWebhookBody {
  scan_id: string;
  status: 'complete' | 'failed';
  result_summary?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_cost_usd?: number;
  recommendations?: CreateRecommendationBody[];
}

// ─── Hono Context Variables ────────────────────────────────────────────────────

import type { SupabaseClient, User } from '@supabase/supabase-js';

export interface AppVariables {
  user: User;
  supabase: SupabaseClient;
}

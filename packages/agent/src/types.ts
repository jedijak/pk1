// ─── Re-export backend types ─────────────────────────────────────────────────

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

// ─── Agent-Specific Types ─────────────────────────────────────────────────────

export type RecommendationType =
  | 'overdue'
  | 'stuck'
  | 'missing_info'
  | 'priority_change'
  | 'dependency_conflict'
  | 'calendar_sync'
  | 'general';

export interface AgentRecommendation {
  type: RecommendationType;
  card_id: string | null;
  card_title: string;
  suggested_action: string;
  reasoning: string;
  confidence: number;
  integration_actions: unknown[];
}

// ─── Board Snapshot ────────────────────────────────────────────────────────────

export interface CardWithMeta extends Card {
  days_overdue?: number;
  days_in_progress?: number;
  is_stuck?: boolean;
}

export interface BoardSnapshot {
  timestamp: string;
  projects: Project[];
  all_cards: CardWithMeta[];
  overdue_cards: CardWithMeta[];
  in_progress_cards: CardWithMeta[];
  high_priority_backlog: CardWithMeta[];
  stuck_cards: CardWithMeta[];
  missing_info_cards: CardWithMeta[];
  stats: {
    total_active: number;
    overdue_count: number;
    stuck_count: number;
    in_progress_count: number;
    high_priority_backlog_count: number;
  };
}

// ─── Rule Filter Result ───────────────────────────────────────────────────────

export interface RuleFilterResult {
  hasProblems: boolean;
  summary: string;
}

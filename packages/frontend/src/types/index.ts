export type CardType = 'human_touchpoint' | 'code_agent_work'
export type CardStatus = 'backlog' | 'ready' | 'in_progress' | 'review' | 'done'
export type CardPriority = 'critical' | 'high' | 'medium' | 'low'
export type RecommendationStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved' | 'modified'
export type ViewGrouping = 'project' | 'assignee' | 'code_function' | 'budget_approval' | 'risk_deadline' | 'custom'

export interface LinkedResource {
  id: string
  url: string
  label: string
}

export interface NestedItem {
  id: string
  type: 'checklist_item' | 'question' | 'decision_point' | 'note'
  content: string
  completed: boolean
  assigned_to?: string
  due_date?: string
}

export interface Card {
  id: string
  project_id: string
  title: string
  description?: string
  type: CardType
  background_color: 'dark_tan' | 'light_gray'
  status: CardStatus
  priority: CardPriority
  assignee_id?: string
  due_date?: string
  position: number
  nested_items: NestedItem[]
  tags: string[]
  linked_resources: LinkedResource[]
  agent_flagged: boolean
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description?: string
  owner_id: string
  member_ids: string[]
  created_at: string
}

export interface Recommendation {
  id: string
  card_id?: string
  type: string
  suggested_action: string
  reasoning?: string
  confidence: number
  status: RecommendationStatus
  integration_actions: unknown[]
  created_at: string
}

export interface ViewConfig {
  id: string
  name: string
  grouping_principle: ViewGrouping
  filter_logic: Record<string, unknown>
  visibility: 'personal' | 'team' | 'public'
}

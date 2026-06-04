import { CardPriority } from '../../types'

interface PriorityBadgeProps {
  priority: CardPriority
  size?: 'sm' | 'md'
}

const PRIORITY_STYLES: Record<CardPriority, string> = {
  critical: 'bg-priority-critical text-white',
  high: 'bg-priority-high text-white',
  medium: 'bg-priority-medium text-white',
  low: 'bg-priority-low text-white',
}

const PRIORITY_LABELS: Record<CardPriority, string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MED',
  low: 'LOW',
}

export function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-bold uppercase rounded ${
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
      } ${PRIORITY_STYLES[priority]}`}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  )
}

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '../../types'
import { PriorityBadge } from './PriorityBadge'
import { useBoardStore } from '../../store/boardStore'

interface CardItemProps {
  card: Card
}

const STATUS_DOT_COLORS: Record<string, string> = {
  backlog: 'bg-gray-400',
  ready: 'bg-blue-400',
  in_progress: 'bg-yellow-400',
  review: 'bg-purple-400',
  done: 'bg-green-500',
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getInitials(assigneeId?: string) {
  if (!assigneeId) return null
  return assigneeId.slice(0, 2).toUpperCase()
}

export function CardItem({ card }: CardItemProps) {
  const setSelectedCard = useBoardStore((s) => s.setSelectedCard)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const bgClass =
    card.type === 'human_touchpoint' ? 'bg-card-human' : 'bg-card-code'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${bgClass} rounded-lg p-3 shadow-sm border border-black/10 cursor-grab active:cursor-grabbing select-none`}
      onClick={() => setSelectedCard(card.id)}
    >
      {/* Row 1: Priority badge + title + type icon */}
      <div className="flex items-start gap-2 mb-2">
        <PriorityBadge priority={card.priority} />
        <span className="flex-1 text-sm font-medium text-gray-800 leading-tight line-clamp-2">
          {card.title}
        </span>
        <span
          title={card.type === 'human_touchpoint' ? 'Human Touchpoint' : 'Code Agent Work'}
          className="flex-shrink-0 text-gray-500 mt-0.5"
        >
          {card.type === 'human_touchpoint' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          )}
        </span>
      </div>

      {/* Row 2: Assignee + Due date + Status */}
      <div className="flex items-center gap-2 mb-2">
        {card.assignee_id && (
          <span className="w-6 h-6 rounded-full bg-dark-tan text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
            {getInitials(card.assignee_id)}
          </span>
        )}
        {card.due_date && (
          <span className="text-[11px] text-gray-500">{formatDate(card.due_date)}</span>
        )}
        <span className="ml-auto flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[card.status] ?? 'bg-gray-300'}`} />
        </span>
      </div>

      {/* Row 3: Tags + agent flag */}
      {(card.tags.length > 0 || card.agent_flagged) && (
        <div className="flex items-center gap-1 flex-wrap">
          {card.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] bg-white/60 text-gray-600 px-1.5 py-0.5 rounded-full border border-gray-200"
            >
              {tag}
            </span>
          ))}
          {card.agent_flagged && (
            <span
              title="Flagged by AI Agent"
              className="ml-auto text-amber-500"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd" />
              </svg>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

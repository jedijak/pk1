import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Card } from '../../types'
import { CardItem } from '../card/CardItem'

interface ColumnProps {
  id: string
  title: string
  cards: Card[]
  onAddCard?: () => void
  accent?: string
}

const DEFAULT_ACCENT = 'bg-gray-200 text-gray-600'

const COLUMN_ACCENTS: Record<string, string> = {
  backlog: 'bg-gray-200 text-gray-600',
  ready: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  review: 'bg-purple-100 text-purple-700',
  done: 'bg-green-100 text-green-700',
}

export function Column({ id, title, cards, onAddCard, accent }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  const accentClass = accent ?? COLUMN_ACCENTS[id] ?? DEFAULT_ACCENT

  return (
    <div className="flex flex-col w-64 flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            {title}
          </h3>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${accentClass}`}>
            {cards.length}
          </span>
        </div>
        {onAddCard && (
          <button
            type="button"
            onClick={onAddCard}
            className="text-gray-400 hover:text-dark-tan transition-colors"
            title="Add card"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-2 min-h-[400px] space-y-2 transition-colors ${
          isOver ? 'bg-dark-tan/20 ring-2 ring-dark-tan/40' : 'bg-gray-100/70'
        }`}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </SortableContext>

        {cards.length === 0 && (
          <div className="flex items-center justify-center h-24 text-gray-300 text-xs italic">
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}

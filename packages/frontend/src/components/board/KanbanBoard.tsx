import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Card, CardStatus } from '../../types'
import { Column } from './Column'
import { CardItem } from '../card/CardItem'
import { AgentPanel } from '../agent/AgentPanel'
import { useCards } from '../../hooks/useCards'
import { useBoardStore } from '../../store/boardStore'

const STATUSES: { id: CardStatus; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'ready', label: 'Ready' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
]

function groupCardsByField(items: Card[], field: keyof Card): Map<string, Card[]> {
  const map = new Map<string, Card[]>()
  for (const item of items) {
    const key = String(item[field] ?? 'Unassigned')
    const group = map.get(key) ?? []
    group.push(item)
    map.set(key, group)
  }
  return map
}

export function KanbanBoard() {
  const { cards, moveCard } = useCards()
  const { currentView } = useBoardStore()
  const recommendations = useBoardStore((s) => s.recommendations)
  const [activeCard, setActiveCard] = useState<Card | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)
    if (!over) return

    const draggedId = active.id as string
    const overId = over.id as string

    // Determine target column
    const targetStatus = STATUSES.find((s) => s.id === overId)?.id
    const targetCard = cards.find((c) => c.id === overId)

    let newStatus: CardStatus
    let newPosition: number

    if (targetStatus) {
      // Dropped on a column
      newStatus = targetStatus
      const colCards = cards.filter((c) => c.status === newStatus && c.id !== draggedId)
      newPosition = colCards.length
    } else if (targetCard) {
      // Dropped on a card
      newStatus = targetCard.status
      const colCards = cards.filter((c) => c.status === newStatus)
      const reordered = arrayMove(
        colCards,
        colCards.findIndex((c) => c.id === draggedId),
        colCards.findIndex((c) => c.id === overId)
      )
      newPosition = reordered.findIndex((c) => c.id === draggedId)
    } else {
      return
    }

    moveCard(draggedId, newStatus, newPosition)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active } = event
    if (!activeCard) {
      const found = cards.find((c) => c.id === active.id)
      if (found) setActiveCard(found)
    }
  }

  // "Problems in Flow" view
  if (currentView === 'risk_deadline') {
    const flaggedCards = cards.filter((c) => c.agent_flagged)
    const pendingRecs = recommendations.filter((r) => r.status === 'pending')

    return (
      <div className="flex gap-6 h-full">
        <div className="flex-1 overflow-auto">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Flagged Cards</h2>
          {flaggedCards.length === 0 ? (
            <div className="text-gray-400 text-sm italic">No flagged cards.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {flaggedCards.map((card) => (
                <CardItem key={card.id} card={card} />
              ))}
            </div>
          )}
          {pendingRecs.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Pending Recommendations</h2>
              <div className="w-96">
                <AgentPanel />
              </div>
            </div>
          )}
        </div>
        <div className="w-80 flex-shrink-0 border-l border-gray-200 pl-6">
          <AgentPanel />
        </div>
      </div>
    )
  }

  // Grouping views
  if (currentView !== 'project') {
    const fieldMap: Record<string, keyof Card> = {
      assignee: 'assignee_id',
      code_function: 'type',
      budget_approval: 'priority',
      custom: 'project_id',
    }
    const groupField = fieldMap[currentView] ?? 'project_id'
    const groups = groupCardsByField(cards, groupField)

    return (
      <div className="space-y-8 overflow-auto flex-1 pb-8">
        {Array.from(groups.entries()).map(([groupKey, groupCards]) => (
          <div key={groupKey}>
            <h2 className="text-base font-semibold text-gray-600 mb-3 uppercase tracking-wider">
              {groupKey}
            </h2>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
            >
              <div className="flex gap-4 overflow-x-auto pb-2">
                {STATUSES.map((col) => {
                  const colCards = groupCards
                    .filter((c) => c.status === col.id)
                    .sort((a, b) => a.position - b.position)
                  return (
                    <Column key={col.id} id={col.id} title={col.label} cards={colCards} />
                  )
                })}
              </div>
              <DragOverlay>
                {activeCard && <CardItem card={activeCard} />}
              </DragOverlay>
            </DndContext>
          </div>
        ))}
      </div>
    )
  }

  // Default project view: columns = statuses
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="flex gap-4 overflow-x-auto flex-1 pb-4">
        {STATUSES.map((col) => {
          const colCards = cards
            .filter((c) => c.status === col.id)
            .sort((a, b) => a.position - b.position)
          return (
            <Column
              key={col.id}
              id={col.id}
              title={col.label}
              cards={colCards}
            />
          )
        })}
      </div>
      <DragOverlay>
        {activeCard && <CardItem card={activeCard} />}
      </DragOverlay>
    </DndContext>
  )
}

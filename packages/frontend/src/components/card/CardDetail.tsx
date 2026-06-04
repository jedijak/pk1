import { useState, useEffect } from 'react'
import { Card, CardStatus, CardPriority, CardType, NestedItem } from '../../types'
import { Modal } from '../shared/Modal'
import { PriorityBadge } from './PriorityBadge'
import { useBoardStore } from '../../store/boardStore'
import { useCards } from '../../hooks/useCards'
import { useRecommendations } from '../../hooks/useRecommendations'

const STATUSES: CardStatus[] = ['backlog', 'ready', 'in_progress', 'review', 'done']
const PRIORITIES: CardPriority[] = ['critical', 'high', 'medium', 'low']

interface CardDetailProps {
  card: Card | null
  isOpen: boolean
  onClose: () => void
}

function NestedItemRow({
  item,
  onToggle,
}: {
  item: NestedItem
  onToggle: (id: string) => void
}) {
  const iconMap = {
    checklist_item: '☑',
    question: '?',
    decision_point: '⬡',
    note: '📝',
  }
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
      {item.type === 'checklist_item' ? (
        <input
          type="checkbox"
          checked={item.completed}
          onChange={() => onToggle(item.id)}
          className="mt-0.5 accent-dark-tan"
        />
      ) : (
        <span className="text-gray-400 text-sm w-4 text-center">{iconMap[item.type]}</span>
      )}
      <span className={`text-sm flex-1 ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
        {item.content}
      </span>
      {item.assigned_to && (
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
          {item.assigned_to.slice(0, 6)}
        </span>
      )}
    </div>
  )
}

export function CardDetail({ card, isOpen, onClose }: CardDetailProps) {
  const { updateCard, deleteCard } = useCards()
  const { recommendations, approveRec, rejectRec } = useRecommendations()
  const setSelectedCard = useBoardStore((s) => s.setSelectedCard)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<CardStatus>('backlog')
  const [priority, setPriority] = useState<CardPriority>('medium')
  const [type, setType] = useState<CardType>('human_touchpoint')
  const [dueDate, setDueDate] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [nestedItems, setNestedItems] = useState<NestedItem[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (card) {
      setTitle(card.title)
      setDescription(card.description ?? '')
      setStatus(card.status)
      setPriority(card.priority)
      setType(card.type)
      setDueDate(card.due_date ?? '')
      setTags(card.tags ?? [])
      setNestedItems(card.nested_items ?? [])
    }
  }, [card])

  if (!card) return null

  const cardRecs = recommendations.filter((r) => r.card_id === card.id)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateCard(card.id, {
        title,
        description,
        status,
        priority,
        type,
        due_date: dueDate || undefined,
        tags,
        nested_items: nestedItems,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this card?')) return
    await deleteCard(card.id)
    setSelectedCard(null)
    onClose()
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag))

  const toggleNestedItem = (id: string) => {
    setNestedItems(
      nestedItems.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} wide>
      <div className="flex flex-col gap-0">
        {/* Header */}
        <div
          className={`px-6 pt-5 pb-4 ${
            type === 'human_touchpoint' ? 'bg-card-human' : 'bg-card-code'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <PriorityBadge priority={priority} size="md" />
            <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">{status.replace('_', ' ')}</span>
            {card.agent_flagged && (
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd" />
                </svg>
                Agent Flagged
              </span>
            )}
          </div>
          <input
            className="w-full text-lg font-semibold text-gray-900 bg-transparent border-0 border-b-2 border-transparent focus:border-dark-tan outline-none pb-0.5"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Card title"
          />
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-5">
          {/* Controls row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CardStatus)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-dark-tan"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as CardPriority)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-dark-tan"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => setType('human_touchpoint')}
                  className={`flex-1 py-2 font-medium transition-colors ${
                    type === 'human_touchpoint'
                      ? 'bg-card-human text-gray-800'
                      : 'bg-white text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  Human
                </button>
                <button
                  type="button"
                  onClick={() => setType('code_agent_work')}
                  className={`flex-1 py-2 font-medium transition-colors ${
                    type === 'code_agent_work'
                      ? 'bg-card-code text-gray-800'
                      : 'bg-white text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  Code
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-dark-tan"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-dark-tan resize-none"
              placeholder="Add a description..."
            />
          </div>

          {/* Nested Items */}
          {nestedItems.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Items</label>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {nestedItems.map((item) => (
                  <NestedItemRow key={item.id} item={item} onToggle={toggleNestedItem} />
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-gray-400 hover:text-red-500 leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tag..."
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-dark-tan"
              />
              <button
                type="button"
                onClick={addTag}
                className="text-sm px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
              >
                Add
              </button>
            </div>
          </div>

          {/* Agent Recommendations */}
          {cardRecs.length > 0 && (
            <div className="border border-amber-200 rounded-lg bg-amber-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd" />
                </svg>
                <h4 className="text-sm font-semibold text-amber-700">AI Agent Recommendations</h4>
                <span className="ml-auto text-xs text-amber-500 italic">Read-only — Approve or Reject only</span>
              </div>
              <div className="space-y-3">
                {cardRecs.map((rec) => (
                  <div key={rec.id} className="bg-white rounded-lg p-3 border border-amber-100">
                    <p className="text-sm font-medium text-gray-800 mb-1">{rec.suggested_action}</p>
                    {rec.reasoning && (
                      <p className="text-xs text-gray-500 mb-2">{rec.reasoning}</p>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400">Confidence</span>
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${Math.round(rec.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 font-mono">
                        {Math.round(rec.confidence * 100)}%
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => approveRec(rec.id)}
                        className="flex-1 text-xs py-1.5 bg-green-100 text-green-700 font-medium rounded hover:bg-green-200 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectRec(rec.id)}
                        className="flex-1 text-xs py-1.5 bg-red-50 text-red-600 font-medium rounded hover:bg-red-100 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked Resources */}
          {card.linked_resources && card.linked_resources.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Linked Resources</label>
              <div className="space-y-1">
                {card.linked_resources.map((lr) => (
                  <a
                    key={lr.id}
                    href={lr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {lr.label || lr.url}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Activity log placeholder */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-400 mb-2">Activity Log</p>
            <p className="text-xs text-gray-300 italic">Activity history coming soon.</p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleDelete}
            className="text-sm text-red-400 hover:text-red-600 transition-colors"
          >
            Delete card
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="text-sm px-4 py-2 bg-dark-tan text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50 font-medium"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

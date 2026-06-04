import { ViewGrouping } from '../../types'
import { useBoardStore } from '../../store/boardStore'

const VIEWS: { value: ViewGrouping; label: string }[] = [
  { value: 'project', label: 'By Project' },
  { value: 'assignee', label: 'By Assignee' },
  { value: 'code_function', label: 'By Code Function' },
  { value: 'budget_approval', label: 'Budget & Approvals' },
  { value: 'risk_deadline', label: 'Risk & Deadlines' },
  { value: 'custom', label: 'Custom View' },
]

export function ViewSwitcher() {
  const { currentView, setCurrentView } = useBoardStore()

  return (
    <select
      value={currentView}
      onChange={(e) => setCurrentView(e.target.value as ViewGrouping)}
      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-dark-tan text-gray-700"
    >
      {VIEWS.map((v) => (
        <option key={v.value} value={v.value}>
          {v.label}
        </option>
      ))}
    </select>
  )
}

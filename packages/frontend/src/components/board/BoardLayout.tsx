import { useState } from 'react'
import { KanbanBoard } from './KanbanBoard'
import { ViewSwitcher } from '../views/ViewSwitcher'
import { CardDetail } from '../card/CardDetail'
import { useAuth } from '../../hooks/useAuth'
import { useBoardStore } from '../../store/boardStore'
import api from '../../lib/api'

export function BoardLayout() {
  const { user, signOut } = useAuth()
  const { selectedCardId, setSelectedCard, cards } = useBoardStore()
  const [invoking, setInvoking] = useState(false)

  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null

  const handleInvokeAgent = async () => {
    setInvoking(true)
    try {
      await api.post('/agent/invoke')
    } catch (err) {
      console.error('Agent invoke failed', err)
    } finally {
      setInvoking(false)
    }
  }

  const getInitials = (email?: string) => {
    if (!email) return 'U'
    return email.slice(0, 2).toUpperCase()
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Nav Bar */}
      <header className="bg-dark-tan shadow-sm flex-shrink-0">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white/30 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">PK1</span>
          </div>

          {/* View Switcher */}
          <div className="ml-4">
            <ViewSwitcher />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Invoke Agent Button */}
          <button
            type="button"
            onClick={handleInvokeAgent}
            disabled={invoking}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors disabled:opacity-60 font-medium"
          >
            {invoking ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Running...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a3.5 3.5 0 01-4.95 0l-.347-.347z" />
                </svg>
                Invoke Agent
              </>
            )}
          </button>

          {/* User avatar + logout */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/30 text-white text-xs font-bold flex items-center justify-center">
              {getInitials(user?.email)}
            </div>
            <span className="text-white/80 text-xs hidden md:block">{user?.email}</span>
            <button
              type="button"
              onClick={signOut}
              className="text-white/70 hover:text-white text-xs ml-1 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Board */}
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          <KanbanBoard />
        </div>
      </main>

      {/* Card Detail Modal */}
      <CardDetail
        card={selectedCard}
        isOpen={!!selectedCardId}
        onClose={() => setSelectedCard(null)}
      />
    </div>
  )
}

import { useState } from 'react'
import { useRecommendations } from '../../hooks/useRecommendations'
import { useBoardStore } from '../../store/boardStore'
import api from '../../lib/api'

export function AgentPanel() {
  const { recommendations, approveRec, rejectRec, loading, reload } = useRecommendations()
  const cards = useBoardStore((s) => s.cards)
  const [invoking, setInvoking] = useState(false)
  const [lastScan, setLastScan] = useState<Date | null>(null)

  const handleInvoke = async () => {
    setInvoking(true)
    try {
      await api.post('/agent/invoke')
      setLastScan(new Date())
      await reload()
    } catch (err) {
      console.error('Failed to invoke agent', err)
    } finally {
      setInvoking(false)
    }
  }

  const getCardTitle = (cardId?: string) => {
    if (!cardId) return 'General'
    return cards.find((c) => c.id === cardId)?.title ?? cardId
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">AA Agent</h2>
          {lastScan && (
            <p className="text-xs text-gray-400 mt-0.5">
              Last scan: {lastScan.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleInvoke}
          disabled={invoking}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-dark-tan text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50 font-medium"
        >
          {invoking ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scanning...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a3.5 3.5 0 01-4.95 0l-.347-.347z" />
              </svg>
              Run Agent Scan
            </>
          )}
        </button>
      </div>

      {/* Read-only notice */}
      <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg mb-4">
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd" />
        </svg>
        Read-only — Approve or Reject recommendations only
      </div>

      {/* Recs list */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
      ) : recommendations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 gap-2">
          <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">No pending recommendations</p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="px-4 pt-3 pb-2">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                  {getCardTitle(rec.card_id)}
                </div>
                <p className="text-sm font-medium text-gray-800 mb-1">{rec.suggested_action}</p>
                {rec.reasoning && (
                  <p className="text-xs text-gray-500 mb-2 leading-relaxed">{rec.reasoning}</p>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Confidence</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round(rec.confidence * 100)}%`,
                        backgroundColor:
                          rec.confidence > 0.8
                            ? '#22C55E'
                            : rec.confidence > 0.5
                            ? '#EAB308'
                            : '#F97316',
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 font-mono w-8 text-right">
                    {Math.round(rec.confidence * 100)}%
                  </span>
                </div>
              </div>
              <div className="flex border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => approveRec(rec.id)}
                  className="flex-1 py-2 text-xs font-semibold text-green-600 hover:bg-green-50 transition-colors"
                >
                  Approve
                </button>
                <div className="w-px bg-gray-100" />
                <button
                  type="button"
                  onClick={() => rejectRec(rec.id)}
                  className="flex-1 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

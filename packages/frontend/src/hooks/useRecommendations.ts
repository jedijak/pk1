import { useEffect, useCallback, useState } from 'react'
import { useBoardStore } from '../store/boardStore'
import api from '../lib/api'
import { supabase } from '../lib/supabase'
import { Recommendation } from '../types'

export function useRecommendations() {
  const { recommendations, setRecommendations } = useBoardStore()
  const [loading, setLoading] = useState(false)

  const loadRecommendations = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<Recommendation[]>('/recommendations?status=pending')
      setRecommendations(data)
    } catch (err) {
      console.error('Failed to load recommendations', err)
    } finally {
      setLoading(false)
    }
  }, [setRecommendations])

  useEffect(() => {
    loadRecommendations()

    const channel = supabase
      .channel('recommendations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recommendations' },
        () => {
          loadRecommendations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadRecommendations])

  const approveRec = async (id: string) => {
    try {
      await api.patch(`/recommendations/${id}`, { status: 'approved' })
      setRecommendations(recommendations.filter((r) => r.id !== id))
    } catch (err) {
      console.error('Failed to approve recommendation', err)
      throw err
    }
  }

  const rejectRec = async (id: string) => {
    try {
      await api.patch(`/recommendations/${id}`, { status: 'rejected' })
      setRecommendations(recommendations.filter((r) => r.id !== id))
    } catch (err) {
      console.error('Failed to reject recommendation', err)
      throw err
    }
  }

  return { recommendations, approveRec, rejectRec, loading, reload: loadRecommendations }
}

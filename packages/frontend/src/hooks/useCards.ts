import { useEffect, useCallback } from 'react'
import { useBoardStore } from '../store/boardStore'
import api from '../lib/api'
import { supabase } from '../lib/supabase'
import { Card, CardStatus } from '../types'

export function useCards() {
  const { cards, setCards, updateCardOptimistic } = useBoardStore()

  const loadCards = useCallback(async () => {
    try {
      const { data } = await api.get<Card[]>('/cards')
      setCards(data)
    } catch (err) {
      console.error('Failed to load cards', err)
    }
  }, [setCards])

  useEffect(() => {
    loadCards()

    const channel = supabase
      .channel('cards-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards' },
        () => {
          loadCards()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadCards])

  const moveCard = async (id: string, newStatus: CardStatus, newPosition: number) => {
    updateCardOptimistic(id, { status: newStatus, position: newPosition })
    try {
      await api.patch(`/cards/${id}/position`, { status: newStatus, position: newPosition })
    } catch (err) {
      console.error('Failed to move card', err)
      loadCards()
    }
  }

  const createCard = async (data: Partial<Card>) => {
    try {
      const { data: newCard } = await api.post<Card>('/cards', data)
      setCards([...cards, newCard])
      return newCard
    } catch (err) {
      console.error('Failed to create card', err)
      throw err
    }
  }

  const updateCard = async (id: string, patch: Partial<Card>) => {
    updateCardOptimistic(id, patch)
    try {
      await api.patch(`/cards/${id}`, patch)
    } catch (err) {
      console.error('Failed to update card', err)
      loadCards()
      throw err
    }
  }

  const deleteCard = async (id: string) => {
    setCards(cards.filter((c) => c.id !== id))
    try {
      await api.delete(`/cards/${id}`)
    } catch (err) {
      console.error('Failed to delete card', err)
      loadCards()
      throw err
    }
  }

  return { cards, moveCard, createCard, updateCard, deleteCard, reload: loadCards }
}

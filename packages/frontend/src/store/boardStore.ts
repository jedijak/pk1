import { create } from 'zustand'
import { Card, Project, Recommendation, ViewGrouping } from '../types'

interface BoardState {
  currentView: ViewGrouping
  selectedCardId: string | null
  cards: Card[]
  projects: Project[]
  recommendations: Recommendation[]

  setCurrentView: (view: ViewGrouping) => void
  setSelectedCard: (id: string | null) => void
  setCards: (cards: Card[]) => void
  setProjects: (projects: Project[]) => void
  setRecommendations: (recommendations: Recommendation[]) => void
  updateCardOptimistic: (id: string, patch: Partial<Card>) => void
}

export const useBoardStore = create<BoardState>((set) => ({
  currentView: 'project',
  selectedCardId: null,
  cards: [],
  projects: [],
  recommendations: [],

  setCurrentView: (view) => set({ currentView: view }),
  setSelectedCard: (id) => set({ selectedCardId: id }),
  setCards: (cards) => set({ cards }),
  setProjects: (projects) => set({ projects }),
  setRecommendations: (recommendations) => set({ recommendations }),

  updateCardOptimistic: (id, patch) =>
    set((state) => ({
      cards: state.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),
}))

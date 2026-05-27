import { create } from 'zustand'

export type SortOrder = 'asc' | 'desc'

interface UiState {
  search: string
  statusFilter: string | null
  setSearch: (search: string) => void
  setStatusFilter: (status: string | null) => void
}

// Lightweight client UI state. Server data lives in TanStack Query, not here.
export const useUiStore = create<UiState>((set) => ({
  search: '',
  statusFilter: null,
  setSearch: (search) => set({ search }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
}))

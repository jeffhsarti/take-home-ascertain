import { create } from 'zustand'
import type { PatientStatus } from '../types'

export type SortOrder = 'asc' | 'desc'

export interface PatientListState {
  search: string
  status: PatientStatus | null
  sortBy: string
  sortOrder: SortOrder
  page: number // zero-based (DataGrid convention)
  pageSize: number
  setSearch: (search: string) => void
  setStatus: (status: PatientStatus | null) => void
  setSort: (sortBy: string, sortOrder: SortOrder) => void
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  hydrate: (partial: Partial<PatientListState>) => void
}

// Client UI state for the patient list (filters/sort/pagination). Server data
// itself lives in TanStack Query, not here.
export const usePatientListStore = create<PatientListState>((set) => ({
  search: '',
  status: null,
  sortBy: 'last_name',
  sortOrder: 'asc',
  page: 0,
  pageSize: 20,
  setSearch: (search) => set({ search, page: 0 }),
  setStatus: (status) => set({ status, page: 0 }),
  setSort: (sortBy, sortOrder) => set({ sortBy, sortOrder }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 0 }),
  hydrate: (partial) => set(partial),
}))

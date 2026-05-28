import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listPatients } from '../api/patients'
import type { PatientStatus } from '../types'
import type { SortOrder } from '../store/uiStore'

// Mirrors the backend trigram floor (search_min_length): below this the substring
// search can't use the index, so we don't issue the request at all.
export const SEARCH_MIN_LENGTH = 3

export interface PatientQueryParams {
  page: number // zero-based
  pageSize: number
  search: string
  status: PatientStatus | null
  sortBy: string
  sortOrder: SortOrder
}

export function usePatients(params: PatientQueryParams) {
  const trimmed = params.search.trim()
  const search = trimmed.length >= SEARCH_MIN_LENGTH ? trimmed : undefined
  return useQuery({
    queryKey: ['patients', params],
    queryFn: () =>
      listPatients({
        page: params.page + 1, // API is one-based
        page_size: params.pageSize,
        search,
        status: params.status ?? undefined,
        sort_by: params.sortBy,
        sort_order: params.sortOrder,
      }),
    // Keep showing the previous page while the next one loads (non-blocking).
    placeholderData: keepPreviousData,
  })
}

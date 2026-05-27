import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listPatients } from '../api/patients'
import type { PatientStatus } from '../types'
import type { SortOrder } from '../store/uiStore'

export interface PatientQueryParams {
  page: number // zero-based
  pageSize: number
  search: string
  status: PatientStatus | null
  sortBy: string
  sortOrder: SortOrder
}

export function usePatients(params: PatientQueryParams) {
  return useQuery({
    queryKey: ['patients', params],
    queryFn: () =>
      listPatients({
        page: params.page + 1, // API is one-based
        page_size: params.pageSize,
        search: params.search || undefined,
        status: params.status ?? undefined,
        sort_by: params.sortBy,
        sort_order: params.sortOrder,
      }),
    // Keep showing the previous page while the next one loads (non-blocking).
    placeholderData: keepPreviousData,
  })
}

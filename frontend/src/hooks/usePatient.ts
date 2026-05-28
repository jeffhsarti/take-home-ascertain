import { useQuery } from '@tanstack/react-query'
import { getPatient } from '../api/patients'
import type { ApiError } from '../api/client'

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: () => getPatient(id),
    enabled: !!id,
    // A missing patient is a settled answer, not a transient failure — skip the
    // default 3-retry dance that would flash a spinner before the "not found" UI.
    retry: (failureCount, error) =>
      (error as unknown as ApiError)?.status !== 404 && failureCount < 3,
  })
}

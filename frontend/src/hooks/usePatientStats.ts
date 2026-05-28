import { useQuery } from '@tanstack/react-query'
import { getPatientStats } from '../api/patients'
import type { PatientStats } from '../types'

// One aggregated request powers every dashboard card and chart, replacing the
// previous four list calls — server-side aggregation keeps it O(1) for the client.
export function usePatientStats() {
  return useQuery<PatientStats>({
    queryKey: ['patient-stats'],
    queryFn: getPatientStats,
  })
}

import { useQuery } from '@tanstack/react-query'
import { getPatientSummary } from '../api/notes'

export function useSummary(patientId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['patient-summary', patientId],
    queryFn: () => getPatientSummary(patientId),
    enabled: enabled && !!patientId,
  })
}

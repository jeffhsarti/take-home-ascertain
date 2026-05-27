import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createPatient, updatePatient } from '../api/patients'
import type { PatientFormValues } from '../lib/patientSchema'

export function useCreatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: PatientFormValues) => createPatient(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] })
    },
  })
}

export function useUpdatePatient(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: PatientFormValues) => updatePatient(id, values),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['patients'] })
      qc.setQueryData(['patient', id], data)
    },
  })
}

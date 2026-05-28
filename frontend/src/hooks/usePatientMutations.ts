import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createPatient, deletePatient, updatePatient } from '../api/patients'
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

export function useDeletePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePatient(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['patients'] })
      qc.invalidateQueries({ queryKey: ['patient-stats'] })
      qc.removeQueries({ queryKey: ['patient', id] })
      qc.removeQueries({ queryKey: ['notes', id] })
      qc.removeQueries({ queryKey: ['patient-summary', id] })
    },
  })
}

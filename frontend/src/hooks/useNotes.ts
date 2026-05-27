import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addPatientNote, deletePatientNote, getPatientNotes } from '../api/notes'
import type { Note } from '../types'

export function useNotes(patientId: string) {
  return useQuery({
    queryKey: ['notes', patientId],
    queryFn: () => getPatientNotes(patientId),
    enabled: !!patientId,
  })
}

export function useAddNote(patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => addPatientNote(patientId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes', patientId] })
      qc.invalidateQueries({ queryKey: ['patient-summary', patientId] })
    },
  })
}

export function useDeleteNote(patientId: string) {
  const qc = useQueryClient()
  return useMutation<void, Error, string, { prev?: Note[] }>({
    mutationFn: (noteId) => deletePatientNote(patientId, noteId),
    // Optimistic removal with rollback on error.
    onMutate: async (noteId) => {
      await qc.cancelQueries({ queryKey: ['notes', patientId] })
      const prev = qc.getQueryData<Note[]>(['notes', patientId])
      qc.setQueryData<Note[]>(['notes', patientId], (old) =>
        (old ?? []).filter((note) => note.id !== noteId),
      )
      return { prev }
    },
    onError: (_err, _noteId, context) => {
      if (context?.prev) {
        qc.setQueryData(['notes', patientId], context.prev)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notes', patientId] })
      qc.invalidateQueries({ queryKey: ['patient-summary', patientId] })
    },
  })
}

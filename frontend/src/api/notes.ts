import { apiClient } from './client'
import type { Note, PatientSummary } from '../types'

export async function getPatientNotes(patientId: string): Promise<Note[]> {
  const { data } = await apiClient.get<Note[]>(`/patients/${patientId}/notes`)
  return data
}

export async function addPatientNote(patientId: string, content: string): Promise<Note> {
  const { data } = await apiClient.post<Note>(`/patients/${patientId}/notes`, { content })
  return data
}

export async function deletePatientNote(patientId: string, noteId: string): Promise<void> {
  await apiClient.delete(`/patients/${patientId}/notes/${noteId}`)
}

export async function getPatientSummary(patientId: string): Promise<PatientSummary> {
  const { data } = await apiClient.get<PatientSummary>(`/patients/${patientId}/summary`)
  return data
}

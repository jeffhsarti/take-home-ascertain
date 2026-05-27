import { apiClient } from './client'
import type { Paginated, Patient, PatientStatus } from '../types'
import type { PatientFormValues } from '../lib/patientSchema'

export interface ListPatientsParams {
  page?: number
  page_size?: number
  search?: string
  status?: PatientStatus
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export async function listPatients(params: ListPatientsParams): Promise<Paginated<Patient>> {
  const { data } = await apiClient.get<Paginated<Patient>>('/patients', { params })
  return data
}

export async function getPatient(id: string): Promise<Patient> {
  const { data } = await apiClient.get<Patient>(`/patients/${id}`)
  return data
}

export async function createPatient(payload: PatientFormValues): Promise<Patient> {
  const { data } = await apiClient.post<Patient>('/patients', payload)
  return data
}

export async function updatePatient(id: string, payload: PatientFormValues): Promise<Patient> {
  const { data } = await apiClient.put<Patient>(`/patients/${id}`, payload)
  return data
}

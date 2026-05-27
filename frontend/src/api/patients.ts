import { apiClient } from './client'
import type { Paginated, Patient, PatientStatus } from '../types'

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

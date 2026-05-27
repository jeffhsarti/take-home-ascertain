export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
export type PatientStatus = 'active' | 'inactive' | 'discharged'

export interface Patient {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  age: number
  email: string
  phone: string
  address_street: string
  address_city: string
  address_state: string
  address_zip: string
  blood_type: BloodType
  status: PatientStatus
  allergies: string[]
  conditions: string[]
  last_visit: string | null
  created_at: string
  updated_at: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface Note {
  id: string
  patient_id: string
  content: string
  created_at: string
}

export interface PatientSummary {
  patient_id: string
  name: string
  age: number
  blood_type: string
  conditions: string[]
  allergies: string[]
  narrative: string
  source: 'template' | 'llm'
}

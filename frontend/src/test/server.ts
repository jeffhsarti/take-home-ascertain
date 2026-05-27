import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import type { Note, Paginated, Patient } from '../types'

export const mockPatient: Patient = {
  id: '1',
  first_name: 'Alice',
  last_name: 'Anderson',
  date_of_birth: '1990-01-01',
  age: 35,
  email: 'alice@example.com',
  phone: '555-0100',
  address_street: '1 Main St',
  address_city: 'Town',
  address_state: 'CA',
  address_zip: '90001',
  blood_type: 'O+',
  status: 'active',
  allergies: ['Penicillin'],
  conditions: ['Asthma'],
  last_visit: '2025-01-01',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

const mockNotes: Note[] = [
  { id: 'n1', patient_id: '1', content: 'Reviewed labs.', created_at: '2025-02-01T10:00:00Z' },
]

// Order matters: more specific routes first.
export const handlers = [
  http.get('*/patients/:id/notes', () => HttpResponse.json(mockNotes)),
  http.get('*/patients/:id/summary', () =>
    HttpResponse.json({
      patient_id: '1',
      name: 'Alice Anderson',
      age: 35,
      blood_type: 'O+',
      conditions: ['Asthma'],
      allergies: ['Penicillin'],
      narrative: 'Alice Anderson is a 35-year-old patient.',
      source: 'template',
    }),
  ),
  http.get('*/patients/:id', () => HttpResponse.json(mockPatient)),
  http.get('*/patients', () => {
    const body: Paginated<Patient> = {
      items: [mockPatient],
      total: 1,
      page: 1,
      page_size: 20,
      total_pages: 1,
    }
    return HttpResponse.json(body)
  }),
]

export const server = setupServer(...handlers)

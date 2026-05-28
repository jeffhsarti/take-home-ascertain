import { z } from 'zod'

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const
export const PATIENT_STATUSES = ['active', 'inactive', 'discharged'] as const

// Mirrors the server-side Pydantic validation (PatientBase).
export const patientSchema = z.object({
  first_name: z.string().min(1, 'Required').max(100),
  last_name: z.string().min(1, 'Required').max(100),
  date_of_birth: z
    .string()
    .min(1, 'Required')
    .refine((value) => new Date(value) <= new Date(), 'Cannot be in the future'),
  email: z.email('Invalid email address'),
  phone: z
    .string()
    .min(1, 'Required')
    .max(50)
    // Mirrors the server's "≥ 7 digits" rule so the user sees the error inline
    // instead of round-tripping to a 422.
    .refine((v) => v.replace(/\D/g, '').length >= 7, 'Must contain at least 7 digits'),
  address_street: z.string().min(1, 'Required').max(255),
  address_city: z.string().min(1, 'Required').max(120),
  address_state: z.string().min(1, 'Required').max(120),
  address_zip: z.string().min(1, 'Required').max(20),
  blood_type: z.enum(BLOOD_TYPES),
  status: z.enum(PATIENT_STATUSES),
  allergies: z.array(z.string()),
  conditions: z.array(z.string()),
  last_visit: z.string().nullable().optional(),
})

export type PatientFormValues = z.infer<typeof patientSchema>

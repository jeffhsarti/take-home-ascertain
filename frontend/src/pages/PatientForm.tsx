import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  BLOOD_TYPES,
  PATIENT_STATUSES,
  patientSchema,
  type PatientFormValues,
} from '../lib/patientSchema'
import { usePatient } from '../hooks/usePatient'
import { useCreatePatient, useUpdatePatient } from '../hooks/usePatientMutations'
import type { ApiError } from '../api/client'
import type { Patient } from '../types'

const EMPTY_VALUES: PatientFormValues = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  email: '',
  phone: '',
  address_street: '',
  address_city: '',
  address_state: '',
  address_zip: '',
  blood_type: 'O+',
  status: 'active',
  allergies: [],
  conditions: [],
  last_visit: '',
}

function toFormValues(patient: Patient): PatientFormValues {
  return {
    first_name: patient.first_name,
    last_name: patient.last_name,
    date_of_birth: patient.date_of_birth,
    email: patient.email,
    phone: patient.phone,
    address_street: patient.address_street,
    address_city: patient.address_city,
    address_state: patient.address_state,
    address_zip: patient.address_zip,
    blood_type: patient.blood_type,
    status: patient.status,
    allergies: patient.allergies,
    conditions: patient.conditions,
    last_visit: patient.last_visit ?? '',
  }
}

const FORM_FIELDS = new Set(Object.keys(EMPTY_VALUES))

export default function PatientForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { data: patient, isLoading: loadingPatient } = usePatient(id ?? '')
  const createMutation = useCreatePatient()
  const updateMutation = useUpdatePatient(id ?? '')
  const [networkError, setNetworkError] = useState<string | null>(null)

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: EMPTY_VALUES,
  })

  useEffect(() => {
    if (patient) reset(toFormValues(patient))
  }, [patient, reset])

  const onSubmit = async (values: PatientFormValues) => {
    const payload: PatientFormValues = { ...values, last_visit: values.last_visit || null }
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync(payload)
        navigate(`/patients/${id}`)
      } else {
        const created = await createMutation.mutateAsync(payload)
        navigate(`/patients/${created.id}`)
      }
    } catch (error) {
      const apiError = error as ApiError
      if (apiError.status === 422 && Array.isArray(apiError.detail)) {
        for (const item of apiError.detail as { loc?: (string | number)[]; msg?: string }[]) {
          const field = item.loc?.[item.loc.length - 1]
          if (typeof field === 'string' && FORM_FIELDS.has(field)) {
            setError(field as keyof PatientFormValues, { message: item.msg ?? 'Invalid value' })
          }
        }
      } else {
        setNetworkError(apiError.message || 'Something went wrong. Please try again.')
      }
    }
  }

  if (isEdit && loadingPatient) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {isEdit ? 'Edit patient' : 'New patient'}
      </Typography>

      <Paper sx={{ p: 3 }} component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Typography variant="h6" gutterBottom>
          Personal information
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <TextField
            label="First name"
            fullWidth
            {...register('first_name')}
            error={!!errors.first_name}
            helperText={errors.first_name?.message}
          />
          <TextField
            label="Last name"
            fullWidth
            {...register('last_name')}
            error={!!errors.last_name}
            helperText={errors.last_name?.message}
          />
          <TextField
            label="Date of birth"
            type="date"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            {...register('date_of_birth')}
            error={!!errors.date_of_birth}
            helperText={errors.date_of_birth?.message}
          />
          <TextField
            label="Last visit"
            type="date"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            {...register('last_visit')}
            error={!!errors.last_visit}
            helperText={errors.last_visit?.message}
          />
          <TextField
            label="Email"
            fullWidth
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <TextField
            label="Phone"
            fullWidth
            {...register('phone')}
            error={!!errors.phone}
            helperText={errors.phone?.message}
          />
          <TextField
            label="Street"
            fullWidth
            {...register('address_street')}
            error={!!errors.address_street}
            helperText={errors.address_street?.message}
          />
          <TextField
            label="City"
            fullWidth
            {...register('address_city')}
            error={!!errors.address_city}
            helperText={errors.address_city?.message}
          />
          <TextField
            label="State"
            fullWidth
            {...register('address_state')}
            error={!!errors.address_state}
            helperText={errors.address_state?.message}
          />
          <TextField
            label="ZIP"
            fullWidth
            {...register('address_zip')}
            error={!!errors.address_zip}
            helperText={errors.address_zip?.message}
          />
        </Box>

        <Typography variant="h6" gutterBottom>
          Medical information
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <Controller
            name="blood_type"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                select
                label="Blood type"
                fullWidth
                {...field}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              >
                {BLOOD_TYPES.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="status"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                select
                label="Status"
                fullWidth
                {...field}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                sx={{ textTransform: 'capitalize' }}
              >
                {PATIENT_STATUSES.map((value) => (
                  <MenuItem key={value} value={value} sx={{ textTransform: 'capitalize' }}>
                    {value}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="allergies"
            control={control}
            render={({ field }) => (
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={field.value}
                onChange={(_, value) => field.onChange(value)}
                renderInput={(params) => (
                  <TextField {...params} label="Allergies" placeholder="Type and press Enter" />
                )}
              />
            )}
          />
          <Controller
            name="conditions"
            control={control}
            render={({ field }) => (
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={field.value}
                onChange={(_, value) => field.onChange(value)}
                renderInput={(params) => (
                  <TextField {...params} label="Conditions" placeholder="Type and press Enter" />
                )}
              />
            )}
          />
        </Box>

        <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
          <Button onClick={() => navigate(-1)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create patient'}
          </Button>
        </Stack>
      </Paper>

      <Snackbar
        open={!!networkError}
        autoHideDuration={6000}
        onClose={() => setNetworkError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setNetworkError(null)}>
          {networkError}
        </Alert>
      </Snackbar>
    </Box>
  )
}

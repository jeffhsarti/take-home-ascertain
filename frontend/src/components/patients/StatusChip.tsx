import { memo } from 'react'
import { Chip } from '@mui/material'
import type { PatientStatus } from '../../types'

const COLOR: Record<PatientStatus, 'success' | 'default' | 'warning'> = {
  active: 'success',
  inactive: 'default',
  discharged: 'warning',
}

function StatusChipBase({ status }: { status: PatientStatus }) {
  return (
    <Chip size="small" color={COLOR[status]} label={status} sx={{ textTransform: 'capitalize' }} />
  )
}

// Memoized: status cells re-render only when the status value changes.
export const StatusChip = memo(StatusChipBase)

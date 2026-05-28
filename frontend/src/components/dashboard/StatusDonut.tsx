import { PieChart } from '@mui/x-charts/PieChart'
import { STATUS_COLORS } from '../../theme'
import type { PatientStatus } from '../../types'

const ORDER: PatientStatus[] = ['active', 'inactive', 'discharged']

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// The explicit "patient status chart" — a donut whose slice colors are the same
// source of truth (STATUS_COLORS) used by StatusChip across the app.
export function StatusDonut({ data }: { data: Record<PatientStatus, number> }) {
  const slices = ORDER.map((status, id) => ({
    id,
    value: data[status],
    label: capitalize(status),
    color: STATUS_COLORS[status],
  }))

  return (
    <PieChart
      height={260}
      series={[{ data: slices, innerRadius: 60, paddingAngle: 2, cornerRadius: 4 }]}
    />
  )
}

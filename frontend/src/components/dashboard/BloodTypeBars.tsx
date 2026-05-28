import { BarChart } from '@mui/x-charts/BarChart'
import { useTheme } from '@mui/material/styles'
import type { BloodType } from '../../types'

export function BloodTypeBars({ data }: { data: Record<BloodType, number> }) {
  const theme = useTheme()
  const labels = Object.keys(data) as BloodType[]
  return (
    <BarChart
      height={260}
      xAxis={[{ scaleType: 'band', data: labels }]}
      series={[{ data: labels.map((l) => data[l]), color: theme.palette.secondary.main }]}
      hideLegend
    />
  )
}

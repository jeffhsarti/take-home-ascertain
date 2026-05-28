import { BarChart } from '@mui/x-charts/BarChart'
import { useTheme } from '@mui/material/styles'

export function AgeHistogram({ data }: { data: { label: string; count: number }[] }) {
  const theme = useTheme()
  return (
    <BarChart
      height={260}
      xAxis={[{ scaleType: 'band', data: data.map((d) => d.label) }]}
      series={[{ data: data.map((d) => d.count), color: theme.palette.primary.main }]}
      hideLegend
    />
  )
}

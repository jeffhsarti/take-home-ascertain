import { BarChart } from '@mui/x-charts/BarChart'
import { useTheme } from '@mui/material/styles'

export function TopConditionsBars({ data }: { data: { condition: string; count: number }[] }) {
  const theme = useTheme()
  // Reverse so the highest count sits at the top of the horizontal axis.
  const ordered = [...data].reverse()
  return (
    <BarChart
      height={260}
      layout="horizontal"
      yAxis={[{ scaleType: 'band', data: ordered.map((d) => d.condition), width: 130 }]}
      series={[{ data: ordered.map((d) => d.count), color: theme.palette.primary.main }]}
      hideLegend
    />
  )
}

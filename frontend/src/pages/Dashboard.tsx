import { Alert, Box, Card, CardContent, CircularProgress, Typography } from '@mui/material'
import { useDashboardStats } from '../hooks/useDashboardStats'

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent>
        <Typography color="text.secondary" gutterBottom>
          {label}
        </Typography>
        <Typography variant="h4">{value}</Typography>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { data, isLoading, isError } = useDashboardStats()

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }
  if (isError || !data) {
    return <Alert severity="error">Failed to load dashboard statistics.</Alert>
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Overview
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <StatCard label="Total patients" value={data.total} />
        <StatCard label="Active" value={data.active} />
        <StatCard label="Inactive" value={data.inactive} />
        <StatCard label="Discharged" value={data.discharged} />
      </Box>
    </Box>
  )
}

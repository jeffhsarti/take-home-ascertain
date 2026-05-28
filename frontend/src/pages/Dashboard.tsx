import { Alert, Box, Card, CardContent, Skeleton } from '@mui/material'
import PeopleIcon from '@mui/icons-material/People'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PauseCircleIcon from '@mui/icons-material/PauseCircle'
import LogoutIcon from '@mui/icons-material/Logout'
import { usePatientStats } from '../hooks/usePatientStats'
import { PageHeader } from '../components/common/PageHeader'
import { StatCard } from '../components/common/StatCard'
import { ChartCard } from '../components/dashboard/ChartCard'
import { StatusDonut } from '../components/dashboard/StatusDonut'
import { AgeHistogram } from '../components/dashboard/AgeHistogram'
import { BloodTypeBars } from '../components/dashboard/BloodTypeBars'
import { TopConditionsBars } from '../components/dashboard/TopConditionsBars'
import { STATUS_COLORS } from '../theme'

const statGrid = {
  display: 'grid',
  gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
  gap: 2,
} as const

const chartGrid = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
  gap: 2,
  mt: 3,
} as const

function DashboardSkeleton() {
  return (
    <Box>
      <Box sx={statGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent>
              <Skeleton variant="rounded" width={48} height={48} sx={{ mb: 1 }} />
              <Skeleton width="60%" />
              <Skeleton width="40%" height={32} />
            </CardContent>
          </Card>
        ))}
      </Box>
      <Box sx={chartGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent>
              <Skeleton width="40%" sx={{ mb: 2 }} />
              <Skeleton variant="rounded" height={260} />
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  )
}

export default function Dashboard() {
  const { data, isLoading, isError } = usePatientStats()

  if (isLoading) {
    return (
      <Box>
        <PageHeader title="Overview" subtitle="Your practice at a glance" />
        <DashboardSkeleton />
      </Box>
    )
  }
  if (isError || !data) {
    return <Alert severity="error">Failed to load dashboard statistics.</Alert>
  }

  return (
    <Box>
      <PageHeader title="Overview" subtitle="Your practice at a glance" />

      <Box sx={statGrid}>
        <StatCard label="Total patients" value={data.total} icon={<PeopleIcon />} color="#2563eb" />
        <StatCard
          label="Active"
          value={data.by_status.active}
          icon={<CheckCircleIcon />}
          color={STATUS_COLORS.active}
        />
        <StatCard
          label="Inactive"
          value={data.by_status.inactive}
          icon={<PauseCircleIcon />}
          color={STATUS_COLORS.inactive}
        />
        <StatCard
          label="Discharged"
          value={data.by_status.discharged}
          icon={<LogoutIcon />}
          color={STATUS_COLORS.discharged}
        />
      </Box>

      {data.total === 0 ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          No patients yet — add one to see charts here.
        </Alert>
      ) : (
        <Box sx={chartGrid}>
          <ChartCard title="Patients by status">
            <StatusDonut data={data.by_status} />
          </ChartCard>
          <ChartCard title="Age distribution">
            <AgeHistogram data={data.by_age_group} />
          </ChartCard>
          <ChartCard title="Blood type">
            <BloodTypeBars data={data.by_blood_type} />
          </ChartCard>
          <ChartCard title="Top conditions">
            <TopConditionsBars data={data.top_conditions} />
          </ChartCard>
        </Box>
      )}
    </Box>
  )
}

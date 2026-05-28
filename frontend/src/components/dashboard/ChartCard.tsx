import type { ReactNode } from 'react'
import { Box, Card, CardContent, Typography } from '@mui/material'

interface ChartCardProps {
  title: string
  children: ReactNode
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Box>{children}</Box>
      </CardContent>
    </Card>
  )
}

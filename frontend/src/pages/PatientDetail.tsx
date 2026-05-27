import { useParams } from 'react-router-dom'
import { Typography } from '@mui/material'

export default function PatientDetail() {
  const { id } = useParams()
  return (
    <Typography variant="h4" gutterBottom>
      Patient {id}
    </Typography>
  )
}

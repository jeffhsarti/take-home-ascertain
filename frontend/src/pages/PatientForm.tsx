import { useParams } from 'react-router-dom'
import { Typography } from '@mui/material'

export default function PatientForm() {
  const { id } = useParams()
  return (
    <Typography variant="h4" gutterBottom>
      {id ? 'Edit patient' : 'New patient'}
    </Typography>
  )
}

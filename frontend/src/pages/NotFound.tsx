import { Box, Button, Typography } from '@mui/material'

export default function NotFound() {
  return (
    <Box sx={{ textAlign: 'center', py: 10 }}>
      <Typography variant="h2" gutterBottom>
        404
      </Typography>
      <Typography color="text.secondary" gutterBottom>
        Page not found
      </Typography>
      <Button variant="contained" href="/">
        Back to dashboard
      </Button>
    </Box>
  )
}

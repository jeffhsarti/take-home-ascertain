import { Box, Container, Typography } from '@mui/material'

function App() {
  return (
    <Container maxWidth="md">
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h3" gutterBottom>
          Healthcare Dashboard
        </Typography>
        <Typography color="text.secondary">
          Frontend scaffold ready — layout and routes arrive in the next tasks.
        </Typography>
      </Box>
    </Container>
  )
}

export default App

import { useMemo } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { RouterProvider } from 'react-router-dom'
import { createAppTheme } from './theme'
import { useThemeStore } from './store/themeStore'
import { router } from './router'

export default function App() {
  const mode = useThemeStore((s) => s.mode)
  const theme = useMemo(() => createAppTheme(mode), [mode])
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}

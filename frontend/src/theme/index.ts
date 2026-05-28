import { createTheme, type PaletteMode, type ThemeOptions } from '@mui/material/styles'

// Status colors are the single source of truth shared by StatusChip and the
// dashboard charts, so chips and the donut always agree.
export const STATUS_COLORS: Record<'active' | 'inactive' | 'discharged', string> = {
  active: '#16a34a',
  inactive: '#94a3b8',
  discharged: '#f59e0b',
}

const FONT_STACK = [
  'Inter',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
].join(',')

function paletteFor(mode: PaletteMode): ThemeOptions['palette'] {
  const isDark = mode === 'dark'
  return {
    mode,
    primary: { main: '#2563eb' },
    secondary: { main: '#0d9488' },
    success: { main: STATUS_COLORS.active },
    warning: { main: STATUS_COLORS.discharged },
    background: isDark
      ? { default: '#0f172a', paper: '#1e293b' }
      : { default: '#f6f8fb', paper: '#ffffff' },
    divider: isDark ? 'rgba(148,163,184,0.18)' : 'rgba(15,23,42,0.10)',
  }
}

export function createAppTheme(mode: PaletteMode) {
  const isDark = mode === 'dark'
  return createTheme({
    palette: paletteFor(mode),
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: FONT_STACK,
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, letterSpacing: '-0.01em' },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiAppBar: {
        defaultProps: { color: 'default', elevation: 0 },
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.background.paper,
            backgroundImage: 'none',
            borderBottom: `1px solid ${theme.palette.divider}`,
          }),
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: ({ theme }) => ({
            backgroundImage: 'none',
            borderRight: `1px solid ${theme.palette.divider}`,
          }),
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: ({ theme }) => ({
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: isDark
              ? 'none'
              : '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
          }),
        },
      },
      MuiButton: { defaultProps: { disableElevation: true } },
    },
  })
}

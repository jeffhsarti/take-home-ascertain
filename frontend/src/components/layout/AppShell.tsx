import { Suspense, useState } from 'react'
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom'
import {
  AppBar,
  Box,
  CircularProgress,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import MenuIcon from '@mui/icons-material/Menu'
import DashboardIcon from '@mui/icons-material/Dashboard'
import PeopleIcon from '@mui/icons-material/People'

const DRAWER_WIDTH = 220

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/', icon: <DashboardIcon /> },
  { label: 'Patients', to: '/patients', icon: <PeopleIcon /> },
]

export default function AppShell() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const isSelected = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  const navList = (
    <List>
      {NAV_ITEMS.map((item) => (
        <ListItemButton
          key={item.to}
          component={RouterLink}
          to={item.to}
          selected={isSelected(item.to)}
          onClick={() => setMobileOpen(false)}
        >
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItemButton>
      ))}
    </List>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 2 }}
              aria-label="open navigation"
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap>
            Healthcare Dashboard
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        {navList}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <Toolbar />
        <Suspense
          fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          }
        >
          <Outlet />
        </Suspense>
      </Box>
    </Box>
  )
}

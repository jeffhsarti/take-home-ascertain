/* eslint-disable react-refresh/only-export-components -- route config module, not an HMR component file */
import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import AppShell from './components/layout/AppShell'

// Lazy-loaded routes => each page becomes its own chunk (code splitting).
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Patients = lazy(() => import('./pages/Patients'))
const PatientDetail = lazy(() => import('./pages/PatientDetail'))
const PatientForm = lazy(() => import('./pages/PatientForm'))
const NotFound = lazy(() => import('./pages/NotFound'))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'patients', element: <Patients /> },
      { path: 'patients/new', element: <PatientForm /> },
      { path: 'patients/:id', element: <PatientDetail /> },
      { path: 'patients/:id/edit', element: <PatientForm /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

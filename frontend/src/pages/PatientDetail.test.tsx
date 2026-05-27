import { Route, Routes } from 'react-router-dom'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/utils'
import PatientDetail from './PatientDetail'

describe('PatientDetail', () => {
  it('renders the patient profile and notes from the API', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/patients/:id" element={<PatientDetail />} />
      </Routes>,
      { route: '/patients/1' },
    )

    expect(await screen.findByText(/Alice Anderson/)).toBeInTheDocument()
    expect(await screen.findByText('Reviewed labs.')).toBeInTheDocument()
  })
})

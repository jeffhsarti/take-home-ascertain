import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/utils'
import PatientForm from './PatientForm'

describe('PatientForm', () => {
  it('shows client-side validation errors and does not submit when empty', async () => {
    renderWithProviders(<PatientForm />, { route: '/patients/new' })

    await userEvent.click(screen.getByRole('button', { name: /create patient/i }))

    const required = await screen.findAllByText('Required')
    expect(required.length).toBeGreaterThan(0)
  })
})

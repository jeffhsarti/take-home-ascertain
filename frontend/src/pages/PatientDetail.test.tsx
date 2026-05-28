import { Route, Routes } from 'react-router-dom'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../test/utils'
import { server } from '../test/server'
import PatientDetail from './PatientDetail'

function renderDetail() {
  renderWithProviders(
    <Routes>
      <Route path="/patients/:id" element={<PatientDetail />} />
    </Routes>,
    { route: '/patients/1' },
  )
}

describe('PatientDetail', () => {
  it('renders the patient profile and notes from the API', async () => {
    renderDetail()

    expect(await screen.findByText(/Alice Anderson/)).toBeInTheDocument()
    expect(await screen.findByText('Reviewed labs.')).toBeInTheDocument()
  })

  it('confirms before deleting a patient and calls DELETE on confirm', async () => {
    let deleted = false
    server.use(
      http.delete('*/patients/:id', () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderDetail()
    await screen.findByText(/Alice Anderson/)

    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    // Dialog is open and asks for confirmation before issuing the request.
    expect(await screen.findByText(/delete patient\?/i)).toBeInTheDocument()
    expect(deleted).toBe(false)

    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    await waitFor(() => expect(deleted).toBe(true))
  })

  it('refetches the summary every time Regenerate is clicked', async () => {
    // Each call returns a distinct narrative so we can tell a refetch actually happened.
    let calls = 0
    server.use(
      http.get('*/patients/:id/summary', () => {
        calls += 1
        return HttpResponse.json({
          patient_id: '1',
          name: 'Alice Anderson',
          age: 35,
          blood_type: 'O+',
          conditions: [],
          allergies: [],
          narrative: `Summary v${calls}`,
          source: 'template',
        })
      }),
    )

    renderDetail()

    await userEvent.click(await screen.findByRole('button', { name: /generate summary/i }))
    expect(await screen.findByText('Summary v1')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /regenerate/i }))
    expect(await screen.findByText('Summary v2')).toBeInTheDocument()
    expect(calls).toBe(2)
  })
})

import { Route, Routes } from 'react-router-dom'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { renderWithProviders } from '../test/utils'
import { server, mockPatient } from '../test/server'
import { usePatientListStore } from '../store/uiStore'
import type { Paginated, Patient } from '../types'
import Patients from './Patients'

// MUI X DataGrid needs these in jsdom.
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  if (!window.matchMedia) {
    window.matchMedia = (q: string) =>
      ({
        matches: false,
        media: q,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent() {
          return false
        },
      }) as unknown as MediaQueryList
  }
})

const TOTAL = 100
const PAGE_SIZE = 20

function makePage(page: number): Paginated<Patient> {
  const items: Patient[] = Array.from({ length: PAGE_SIZE }, (_, i) => ({
    ...mockPatient,
    id: `${(page - 1) * PAGE_SIZE + i + 1}`,
    last_name: `Page${page}_${i}`,
  }))
  return { items, total: TOTAL, page, page_size: PAGE_SIZE, total_pages: TOTAL / PAGE_SIZE }
}

let requestedPages: number[] = []

beforeEach(() => {
  requestedPages = []
  usePatientListStore.setState({
    search: '',
    status: null,
    sortBy: 'last_name',
    sortOrder: 'asc',
    page: 0,
    pageSize: 20,
  })
  server.use(
    http.get('*/patients', ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page') ?? '1')
      requestedPages.push(page)
      return HttpResponse.json(makePage(page))
    }),
  )
})

describe('Patients pagination', () => {
  it('advances to the next page and stays there (no reset to page 1)', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/patients" element={<Patients />} />
      </Routes>,
      { route: '/patients' },
    )

    await screen.findByText(/Page1_0/)

    await userEvent.click(await screen.findByRole('button', { name: /next page/i }))

    // Page-2 data shows and the grid does not snap back to page 1.
    expect(await screen.findByText(/Page2_0/)).toBeInTheDocument()

    // Give any spurious reset a chance to fire, then assert it didn't.
    await new Promise((r) => setTimeout(r, 400))
    expect(screen.queryByText(/Page1_0/)).not.toBeInTheDocument()
    expect(usePatientListStore.getState().page).toBe(1)

    // The API must not have been asked to go back to page 1 after reaching page 2.
    await waitFor(() => expect(requestedPages).toEqual([1, 2]))
  })
})

import { useEffect, useRef } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { PatientList } from '../components/patients/PatientList'
import { SearchBar } from '../components/patients/SearchBar'
import { usePatientListStore, type SortOrder } from '../store/uiStore'
import type { PatientStatus } from '../types'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'discharged', label: 'Discharged' },
]

export default function Patients() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { search, status, sortBy, sortOrder, page, pageSize, setSearch, setStatus, hydrate } =
    usePatientListStore()

  // Hydrate filter state from the URL once, so links/reloads are deep-linkable.
  const hydrated = useRef(false)
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    const pageParam = Number.parseInt(searchParams.get('page') ?? '', 10)
    const pageSizeParam = Number.parseInt(searchParams.get('page_size') ?? '', 10)
    hydrate({
      search: searchParams.get('search') ?? '',
      status: (searchParams.get('status') as PatientStatus | null) || null,
      sortBy: searchParams.get('sort_by') ?? 'last_name',
      sortOrder: (searchParams.get('sort_order') as SortOrder) ?? 'asc',
      // URL is 1-based (user-facing); the store/grid are 0-based.
      page: Number.isFinite(pageParam) && pageParam >= 1 ? pageParam - 1 : 0,
      pageSize: Number.isFinite(pageSizeParam) && pageSizeParam > 0 ? pageSizeParam : 20,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reflect filter state back into the URL (one-directional after hydration).
  const syncReady = useRef(false)
  useEffect(() => {
    // Skip the first run: the store still holds defaults until hydration's state
    // update lands, and writing them now would clobber deep-linked params.
    if (!syncReady.current) {
      syncReady.current = true
      return
    }
    const params: Record<string, string> = {
      page: String(page + 1), // store is 0-based; URL is 1-based
      page_size: String(pageSize),
      sort_by: sortBy,
      sort_order: sortOrder,
    }
    if (search) params.search = search
    if (status) params.status = status
    setSearchParams(params, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, sortBy, sortOrder, page, pageSize])

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}
      >
        <Typography variant="h4">Patients</Typography>
        <Button
          component={RouterLink}
          to="/patients/new"
          variant="contained"
          startIcon={<AddIcon />}
        >
          New patient
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} useFlexGap sx={{ mb: 2, flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} />
        <TextField
          select
          size="small"
          label="Status"
          value={status ?? ''}
          onChange={(e) => setStatus((e.target.value || null) as PatientStatus | null)}
          sx={{ minWidth: 160 }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <PatientList />
    </Box>
  )
}

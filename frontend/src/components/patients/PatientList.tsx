import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef, GridRenderCellParams, GridSortModel } from '@mui/x-data-grid'
import { usePatients } from '../../hooks/usePatients'
import { usePatientListStore } from '../../store/uiStore'
import type { Patient } from '../../types'
import { StatusChip } from './StatusChip'

export function PatientList() {
  const navigate = useNavigate()
  const { search, status, sortBy, sortOrder, page, pageSize, setSort, setPage, setPageSize } =
    usePatientListStore()

  const { data, isError, isFetching } = usePatients({
    page,
    pageSize,
    search,
    status,
    sortBy,
    sortOrder,
  })

  // Memoized so cells/columns don't rebuild on every render.
  const columns = useMemo<GridColDef<Patient>[]>(
    () => [
      {
        field: 'last_name',
        headerName: 'Name',
        flex: 1,
        minWidth: 180,
        renderCell: (params: GridRenderCellParams<Patient>) =>
          `${params.row.first_name} ${params.row.last_name}`,
      },
      { field: 'age', headerName: 'Age', width: 80, sortable: false },
      {
        field: 'last_visit',
        headerName: 'Last visit',
        width: 140,
        renderCell: (params: GridRenderCellParams<Patient>) =>
          params.row.last_visit ? new Date(params.row.last_visit).toLocaleDateString() : '—',
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 140,
        renderCell: (params: GridRenderCellParams<Patient>) => (
          <StatusChip status={params.row.status} />
        ),
      },
    ],
    [],
  )

  if (isError) {
    return <Alert severity="error">Failed to load patients.</Alert>
  }

  const handleSortModelChange = (model: GridSortModel) => {
    if (model.length > 0 && model[0].sort) {
      setSort(model[0].field, model[0].sort)
    } else {
      setSort('last_name', 'asc')
    }
  }

  return (
    <Box sx={{ height: 'calc(100vh - 230px)', minHeight: 400, width: '100%' }}>
      <DataGrid
        rows={data?.items ?? []}
        columns={columns}
        getRowId={(row) => row.id}
        rowCount={data?.total ?? 0}
        loading={isFetching}
        paginationMode="server"
        sortingMode="server"
        paginationModel={{ page, pageSize }}
        onPaginationModelChange={(model) => {
          if (model.pageSize !== pageSize) setPageSize(model.pageSize)
          else setPage(model.page)
        }}
        pageSizeOptions={[10, 20, 50, 100]}
        sortModel={[{ field: sortBy, sort: sortOrder }]}
        onSortModelChange={handleSortModelChange}
        onRowClick={(params) => navigate(`/patients/${params.id}`)}
        disableColumnFilter
        disableRowSelectionOnClick
        sx={{ cursor: 'pointer', bgcolor: 'background.paper' }}
      />
    </Box>
  )
}

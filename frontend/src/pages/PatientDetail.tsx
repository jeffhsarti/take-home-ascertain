import { useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { usePatient } from '../hooks/usePatient'
import { useAddNote, useDeleteNote, useNotes } from '../hooks/useNotes'
import { useDeletePatient } from '../hooks/usePatientMutations'
import { useSummary } from '../hooks/useSummary'
import { NoteForm } from '../components/notes/NoteForm'
import { NoteList } from '../components/notes/NoteList'
import { StatusChip } from '../components/patients/StatusChip'

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography>{value}</Typography>
    </Box>
  )
}

function ChipList({ items, color }: { items: string[]; color: 'error' | 'info' }) {
  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        None on record
      </Typography>
    )
  }
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {items.map((item) => (
        <Chip key={item} label={item} size="small" color={color} variant="outlined" />
      ))}
    </Stack>
  )
}

export default function PatientDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: patient, isLoading, isError } = usePatient(id)
  const { data: notes = [] } = useNotes(id)
  const addNote = useAddNote(id)
  const deleteNote = useDeleteNote(id)
  const deletePatientMutation = useDeletePatient()
  const [showSummary, setShowSummary] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const summary = useSummary(id, showSummary)

  // First click enables the query (auto-fetches); afterwards "Regenerate" must
  // force a fresh request — re-setting showSummary to true is a no-op and would
  // not refetch (the query stays enabled and cached).
  const handleGenerate = () => {
    if (showSummary) {
      summary.refetch()
    } else {
      setShowSummary(true)
    }
  }

  const handleConfirmDelete = async () => {
    try {
      await deletePatientMutation.mutateAsync(id)
      navigate('/patients')
    } catch {
      // Mutation isError is surfaced in the dialog; dialog stays open so the
      // user can retry or cancel.
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }
  if (isError || !patient) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Patient not found.
        </Alert>
        <Button component={RouterLink} to="/patients">
          Back to patients
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}
      >
        <Box>
          <Typography variant="h4">
            {patient.first_name} {patient.last_name}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
            <StatusChip status={patient.status} />
            <Typography color="text.secondary">
              {patient.age} years · Blood type {patient.blood_type}
            </Typography>
          </Stack>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            component={RouterLink}
            to={`/patients/${patient.id}/edit`}
            variant="outlined"
            startIcon={<EditIcon />}
          >
            Edit
          </Button>
          <Button
            color="error"
            variant="outlined"
            startIcon={<DeleteIcon />}
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Profile
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          <Field label="Date of birth" value={patient.date_of_birth} />
          <Field label="Email" value={patient.email} />
          <Field label="Phone" value={patient.phone} />
          <Field
            label="Address"
            value={`${patient.address_street}, ${patient.address_city}, ${patient.address_state} ${patient.address_zip}`}
          />
          <Field label="Last visit" value={patient.last_visit ?? '—'} />
        </Box>
        <Divider sx={{ my: 2 }} />
        <Box
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Conditions
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <ChipList items={patient.conditions} color="info" />
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Allergies
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <ChipList items={patient.allergies} color="error" />
            </Box>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
        >
          <Typography variant="h6">Summary</Typography>
          <Button onClick={handleGenerate} disabled={summary.isFetching}>
            {showSummary ? 'Regenerate' : 'Generate summary'}
          </Button>
        </Stack>
        {!showSummary && (
          <Typography color="text.secondary">
            Generate a human-readable summary from this patient&apos;s profile and notes.
          </Typography>
        )}
        {showSummary && summary.isLoading && <CircularProgress size={24} />}
        {showSummary && summary.isError && (
          <Alert severity="error">Failed to generate summary.</Alert>
        )}
        {showSummary && summary.data && (
          <Box>
            <Chip
              size="small"
              label={summary.data.source === 'llm' ? 'AI-generated' : 'Template'}
              color={summary.data.source === 'llm' ? 'primary' : 'default'}
              sx={{ mb: 1 }}
            />
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{summary.data.narrative}</Typography>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Notes
        </Typography>
        <NoteForm onSubmit={(content) => addNote.mutate(content)} pending={addNote.isPending} />
        {addNote.isError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            Could not add note. Please try again.
          </Alert>
        )}
        <Box sx={{ mt: 2 }}>
          <NoteList notes={notes} onDelete={(noteId) => deleteNote.mutate(noteId)} />
        </Box>
      </Paper>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Delete patient?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently remove {patient.first_name} {patient.last_name} and all of their
            clinical notes. This action cannot be undone.
          </DialogContentText>
          {deletePatientMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Could not delete the patient. Please try again.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDelete(false)}
            disabled={deletePatientMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deletePatientMutation.isPending}
          >
            {deletePatientMutation.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

import { IconButton, List, ListItem, ListItemText, Typography } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import type { Note } from '../../types'

interface NoteListProps {
  notes: Note[]
  onDelete: (noteId: string) => void
}

export function NoteList({ notes, onDelete }: NoteListProps) {
  if (notes.length === 0) {
    return <Typography color="text.secondary">No notes recorded yet.</Typography>
  }
  return (
    <List disablePadding>
      {notes.map((note) => (
        <ListItem
          key={note.id}
          divider
          secondaryAction={
            <IconButton edge="end" aria-label="delete note" onClick={() => onDelete(note.id)}>
              <DeleteIcon />
            </IconButton>
          }
        >
          <ListItemText
            primary={note.content}
            secondary={new Date(note.created_at).toLocaleString()}
          />
        </ListItem>
      ))}
    </List>
  )
}

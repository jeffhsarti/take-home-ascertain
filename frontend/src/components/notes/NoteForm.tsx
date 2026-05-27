import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Box, Button, TextField } from '@mui/material'

const schema = z.object({
  content: z.string().min(1, 'Note cannot be empty').max(2000),
})
type FormValues = z.infer<typeof schema>

interface NoteFormProps {
  onSubmit: (content: string) => void
  pending?: boolean
}

export function NoteForm({ onSubmit, pending }: NoteFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { content: '' },
  })

  return (
    <Box
      component="form"
      onSubmit={handleSubmit((values) => {
        onSubmit(values.content)
        reset()
      })}
      sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
    >
      <TextField
        multiline
        minRows={2}
        placeholder="Add a clinical note..."
        error={!!errors.content}
        helperText={errors.content?.message}
        {...register('content')}
      />
      <Box sx={{ alignSelf: 'flex-end' }}>
        <Button type="submit" variant="contained" disabled={pending}>
          Add note
        </Button>
      </Box>
    </Box>
  )
}

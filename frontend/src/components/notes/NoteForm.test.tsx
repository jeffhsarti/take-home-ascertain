import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NoteForm } from './NoteForm'

describe('NoteForm', () => {
  it('blocks submit and shows an error when empty', async () => {
    const onSubmit = vi.fn()
    render(<NoteForm onSubmit={onSubmit} />)

    await userEvent.click(screen.getByRole('button', { name: /add note/i }))

    expect(await screen.findByText(/cannot be empty/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the content when valid', async () => {
    const onSubmit = vi.fn()
    render(<NoteForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByPlaceholderText(/add a clinical note/i), 'Hello world')
    await userEvent.click(screen.getByRole('button', { name: /add note/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('Hello world'))
  })
})

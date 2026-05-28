import { useEffect, useState } from 'react'
import { InputAdornment, TextField } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { SEARCH_MIN_LENGTH } from '../../hooks/usePatients'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  delay?: number
}

// Debounced search input: typing updates local state immediately, but the
// (query-triggering) onChange fires only after `delay` ms of inactivity.
export function SearchBar({ value, onChange, delay = 300 }: SearchBarProps) {
  const [text, setText] = useState(value)
  const [prevValue, setPrevValue] = useState(value)

  // Reflect external changes (e.g. hydration from the URL) into the field by
  // adjusting state during render (the React-recommended alternative to an effect).
  if (value !== prevValue) {
    setPrevValue(value)
    setText(value)
  }

  useEffect(() => {
    // Don't emit on mount or when nothing actually changed — a spurious onChange
    // would reset pagination and trigger a redundant query. Only debounce edits.
    if (text === value) return
    const id = setTimeout(() => onChange(text), delay)
    return () => clearTimeout(id)
  }, [text, value, delay, onChange])

  // Hint that the search only fires once it can be index-served (matches the backend floor).
  const tooShort = text.trim().length > 0 && text.trim().length < SEARCH_MIN_LENGTH

  return (
    <TextField
      size="small"
      placeholder="Search name or email"
      value={text}
      onChange={(e) => setText(e.target.value)}
      helperText={tooShort ? `Type at least ${SEARCH_MIN_LENGTH} characters` : undefined}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        },
      }}
      sx={{ minWidth: 260 }}
    />
  )
}

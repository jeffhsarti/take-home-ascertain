import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark'

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

interface ThemeState {
  mode: ThemeMode
  toggleMode: () => void
}

// Persisted so the choice survives reload. First-ever load seeds from the OS
// preference; persist's stored value takes over on subsequent visits.
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: systemPrefersDark() ? 'dark' : 'light',
      toggleMode: () => set((s) => ({ mode: s.mode === 'light' ? 'dark' : 'light' })),
    }),
    { name: 'healthcare-theme-mode' },
  ),
)

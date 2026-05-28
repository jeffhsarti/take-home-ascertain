import axios, { AxiosError } from 'axios'

export interface ApiError {
  status: number
  message: string
  detail?: unknown
}

interface PydanticValidationItem {
  loc?: (string | number)[]
  msg?: string
}

// Collapse a FastAPI 422 detail array (`[{loc, msg, type}, ...]`) into a
// single human-readable line, so consumers that only show `.message` still
// see something useful. Field-level mapping lives in `PatientForm` via `.detail`.
function summarizeValidationErrors(items: PydanticValidationItem[]): string {
  const parts = items
    .map((item) => {
      const field = item.loc?.filter((p) => p !== 'body').slice(-1)[0]
      return field && item.msg ? `${field}: ${item.msg}` : item.msg
    })
    .filter((s): s is string => Boolean(s))
  return parts.length ? parts.join('; ') : 'Validation error'
}

// baseURL '/api' works identically in dev (Vite proxy) and in Docker (nginx proxy).
export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: unknown }>) => {
    const detail = error.response?.data?.detail
    let message: string
    if (typeof detail === 'string') {
      message = detail
    } else if (Array.isArray(detail)) {
      message = summarizeValidationErrors(detail as PydanticValidationItem[])
    } else {
      message = error.message ?? 'Network error'
    }
    const apiError: ApiError = {
      status: error.response?.status ?? 0,
      message,
      detail,
    }
    return Promise.reject(apiError)
  },
)

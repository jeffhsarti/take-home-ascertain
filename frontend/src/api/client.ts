import axios, { AxiosError } from 'axios'

export interface ApiError {
  status: number
  message: string
  detail?: unknown
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
    const message =
      typeof detail === 'string' ? detail : (error.message ?? 'Network error')
    const apiError: ApiError = {
      status: error.response?.status ?? 0,
      message,
      detail,
    }
    return Promise.reject(apiError)
  },
)

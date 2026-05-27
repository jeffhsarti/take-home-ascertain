import { useQuery } from '@tanstack/react-query'
import { listPatients } from '../api/patients'

export interface DashboardStats {
  total: number
  active: number
  inactive: number
  discharged: number
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [all, active, inactive, discharged] = await Promise.all([
        listPatients({ page: 1, page_size: 1 }),
        listPatients({ page: 1, page_size: 1, status: 'active' }),
        listPatients({ page: 1, page_size: 1, status: 'inactive' }),
        listPatients({ page: 1, page_size: 1, status: 'discharged' }),
      ])
      return {
        total: all.total,
        active: active.total,
        inactive: inactive.total,
        discharged: discharged.total,
      }
    },
  })
}

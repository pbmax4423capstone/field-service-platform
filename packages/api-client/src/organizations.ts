import type { SupabaseClient } from './client'
import type { Organization, Update } from '@field-service/shared'

export const organizationsApi = (client: SupabaseClient) => ({
  async getById(id: string) {
    return client.from('organizations').select('*').eq('id', id).single()
  },

  async update(id: string, data: Update<Organization>) {
    return client.from('organizations').update(data).eq('id', id).select().single()
  },

  async getUsers(organizationId: string) {
    return client
      .from('users')
      .select('*, user_roles(role)')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('full_name')
  },

  async getDashboardStats(organizationId: string) {
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay())).toISOString()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

    const [todayJobs, weekRevenue, monthRevenue, recentActivity] = await Promise.all([
      client
        .from('jobs')
        .select('*, customers(first_name, last_name), users(full_name)')
        .eq('organization_id', organizationId)
        .gte('scheduled_start', startOfDay)
        .lte('scheduled_start', endOfDay)
        .order('scheduled_start'),

      client
        .from('payments')
        .select('amount')
        .eq('organization_id', organizationId)
        .eq('status', 'succeeded')
        .gte('created_at', startOfWeek),

      client
        .from('payments')
        .select('amount')
        .eq('organization_id', organizationId)
        .eq('status', 'succeeded')
        .gte('created_at', startOfMonth),

      client
        .from('job_status_history')
        .select('*, jobs(title, customers(first_name, last_name))')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const weekTotal = (weekRevenue.data ?? []).reduce((sum, p) => sum + p.amount, 0)
    const monthTotal = (monthRevenue.data ?? []).reduce((sum, p) => sum + p.amount, 0)

    return {
      todayJobs: todayJobs.data ?? [],
      weekRevenue: weekTotal,
      monthRevenue: monthTotal,
      recentActivity: recentActivity.data ?? [],
    }
  },
})

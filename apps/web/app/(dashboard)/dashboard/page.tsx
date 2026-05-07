import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createApiClient } from '@field-service/api-client'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { TodayJobsList } from '@/components/dashboard/TodayJobsList'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { UpcomingAppointments } from '@/components/dashboard/UpcomingAppointments'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const api = createApiClient(supabase as any)
  const stats = userData?.organization_id
    ? await api.organizations.getDashboardStats(userData.organization_id)
    : null

  const today = new Date()
  const next7Days = new Date(today)
  next7Days.setDate(today.getDate() + 7)

  const { data: upcomingJobs } = userData?.organization_id
    ? await supabase
        .from('jobs')
        .select('*, customers(first_name, last_name), customer_addresses(street, city)')
        .eq('organization_id', userData.organization_id)
        .gte('scheduled_start', new Date().toISOString())
        .lte('scheduled_start', next7Days.toISOString())
        .not('status', 'in', '("completed","cancelled")')
        .order('scheduled_start')
        .limit(10)
    : { data: [] }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <StatsCards
        todayJobCount={stats?.todayJobs?.length ?? 0}
        weekRevenue={stats?.weekRevenue ?? 0}
        monthRevenue={stats?.monthRevenue ?? 0}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TodayJobsList jobs={stats?.todayJobs ?? []} />
          <UpcomingAppointments jobs={upcomingJobs ?? []} />
        </div>
        <div>
          <RecentActivity activity={stats?.recentActivity ?? []} />
        </div>
      </div>
    </div>
  )
}

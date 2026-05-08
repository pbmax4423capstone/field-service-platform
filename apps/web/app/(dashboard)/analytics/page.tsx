import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { RevenueChart } from '@/components/analytics/RevenueChart'
import { JobStatusChart } from '@/components/analytics/JobStatusChart'
import { TopCustomersChart } from '@/components/analytics/TopCustomersChart'
import { TechnicianChart } from '@/components/analytics/TechnicianChart'

export const metadata = {
  title: 'Analytics — DispatchForce AI',
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function monthKey(date: Date) {
  return date.toLocaleString('en-US', { month: 'short', year: '2-digit' })
}

function getLast12MonthKeys() {
  const keys: string[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(monthKey(d))
  }
  return keys
}

// ──────────────────────────────────────────────────────────
// Chart card wrapper
// ──────────────────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500 mt-0.5 mb-5">{subtitle}</p>
      {children}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const orgId = (userData as any)?.organization_id as string

  // ── 1. Revenue over time (paid invoices, last 12 months) ──────────────────
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
  twelveMonthsAgo.setDate(1)
  twelveMonthsAgo.setHours(0, 0, 0, 0)

  const { data: paidInvoices } = await supabase
    .from('invoices')
    .select('total, paid_at, updated_at')
    .eq('organization_id', orgId)
    .eq('status', 'paid')
    .gte('updated_at', twelveMonthsAgo.toISOString())

  const monthKeys = getLast12MonthKeys()
  const revenueMap: Record<string, number> = {}
  monthKeys.forEach((k) => (revenueMap[k] = 0))
  ;(paidInvoices ?? []).forEach((inv: any) => {
    const k = monthKey(new Date(inv.paid_at ?? inv.updated_at))
    if (k in revenueMap) revenueMap[k] += Number(inv.total ?? 0)
  })
  const revenueData = monthKeys.map((month) => ({
    month,
    revenue: Math.round(revenueMap[month]),
  }))

  // ── 2. Job status breakdown ───────────────────────────────────────────────
  const { data: allJobs } = await supabase
    .from('jobs')
    .select('status')
    .eq('organization_id', orgId)

  const statusMap: Record<string, number> = {}
  ;(allJobs ?? []).forEach((j: any) => {
    statusMap[j.status] = (statusMap[j.status] ?? 0) + 1
  })
  const jobStatusData = Object.entries(statusMap)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)

  // ── 3. Top customers by revenue ───────────────────────────────────────────
  const { data: lineItems } = await supabase
    .from('invoice_line_items')
    .select('total_price, invoices!inner(organization_id, customer_id, customers(name))')
    .eq('invoices.organization_id', orgId)

  const customerRevMap: Record<string, { name: string; revenue: number }> = {}
  ;(lineItems ?? []).forEach((item: any) => {
    const inv = item.invoices
    if (!inv) return
    const cid = inv.customer_id as string
    const name = inv.customers?.name ?? 'Unknown'
    if (!customerRevMap[cid]) customerRevMap[cid] = { name, revenue: 0 }
    customerRevMap[cid].revenue += Number(item.total_price ?? 0)
  })
  const topCustomersData = Object.values(customerRevMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((c) => ({ name: c.name, revenue: Math.round(c.revenue) }))

  // ── 4. Technician performance ─────────────────────────────────────────────
  const { data: completedHistory } = await supabase
    .from('job_status_history')
    .select('user_id, users!inner(full_name, organization_id)')
    .eq('to_status', 'completed')
    .eq('users.organization_id', orgId)

  const techMap: Record<string, { name: string; completed: number }> = {}
  ;(completedHistory ?? []).forEach((h: any) => {
    const uid = h.user_id as string
    const name = h.users?.full_name ?? 'Unknown'
    if (!techMap[uid]) techMap[uid] = { name, completed: 0 }
    techMap[uid].completed += 1
  })
  const techData = Object.values(techMap)
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Business performance metrics for your organization
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Revenue Over Time"
          subtitle="Monthly revenue from paid invoices — last 12 months"
        >
          <RevenueChart data={revenueData} />
        </ChartCard>

        <ChartCard
          title="Job Status Breakdown"
          subtitle="Distribution of all jobs by current status"
        >
          {jobStatusData.length > 0 ? (
            <JobStatusChart data={jobStatusData} />
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">
              No job data yet
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Top Customers by Revenue"
          subtitle="Top 10 customers by total invoiced amount"
        >
          {topCustomersData.length > 0 ? (
            <TopCustomersChart data={topCustomersData} />
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">
              No invoice data yet
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Technician Performance"
          subtitle="Jobs completed per technician"
        >
          {techData.length > 0 ? (
            <TechnicianChart data={techData} />
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">
              No completed jobs yet
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  )
}

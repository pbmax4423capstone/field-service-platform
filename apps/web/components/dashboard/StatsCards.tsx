import { formatCurrency } from '@field-service/shared'
import { Calendar, TrendingUp, DollarSign, Clock } from 'lucide-react'

interface StatsCardsProps {
  todayJobCount: number
  weekRevenue: number
  monthRevenue: number
}

export function StatsCards({ todayJobCount, weekRevenue, monthRevenue }: StatsCardsProps) {
  const cards = [
    {
      label: "Today's Jobs",
      value: String(todayJobCount),
      icon: Calendar,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Week Revenue',
      value: formatCurrency(weekRevenue * 100),
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Month Revenue',
      value: formatCurrency(monthRevenue * 100),
      icon: DollarSign,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
            <div className={`${bg} p-2.5 rounded-xl`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface JobStatusDataPoint {
  status: string
  count: number
}

const COLORS: Record<string, string> = {
  scheduled: '#2563EB',
  dispatched: '#7C3AED',
  en_route: '#0891B2',
  in_progress: '#D97706',
  completed: '#16A34A',
  cancelled: '#DC2626',
  on_hold: '#6B7280',
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  dispatched: 'Dispatched',
  en_route: 'En Route',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  on_hold: 'On Hold',
}

const FALLBACK_COLORS = [
  '#2563EB', '#7C3AED', '#0891B2', '#D97706', '#16A34A', '#DC2626', '#6B7280',
]

interface LabelProps {
  cx: number
  cy: number
  midAngle: number
  outerRadius: number
  percent: number
}

function renderCustomLabel({ cx, cy, midAngle, outerRadius, percent }: LabelProps) {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 20
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#374151" textAnchor="middle" dominantBaseline="central" fontSize={11}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function JobStatusChart({ data }: { data: JobStatusDataPoint[] }) {
  const chartData = data.map((d) => ({
    name: STATUS_LABELS[d.status] ?? d.status,
    value: d.count,
    originalStatus: d.status,
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="48%"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={2}
          dataKey="value"
          labelLine={false}
          label={renderCustomLabel as any}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={entry.name}
              fill={COLORS[entry.originalStatus] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [value.toLocaleString(), name]}
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 12, color: '#374151' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

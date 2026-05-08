'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface TopCustomerDataPoint {
  name: string
  revenue: number
}

const BAR_COLORS = [
  '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE',
  '#1D4ED8', '#1E40AF', '#1E3A8A', '#312E81', '#3730A3',
]

export function TopCustomersChart({ data }: { data: TopCustomerDataPoint[] }) {
  const truncated = data.map((d) => ({
    ...d,
    shortName: d.name.length > 16 ? d.name.slice(0, 14) + '…' : d.name,
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        layout="vertical"
        data={truncated}
        margin={{ top: 4, right: 24, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="shortName"
          width={110}
          tick={{ fontSize: 11, fill: '#374151' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number, _name: string, props: any) => [
            `$${value.toLocaleString()}`,
            props.payload?.name ?? 'Revenue',
          ]}
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
        />
        <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {truncated.map((_entry, index) => (
            <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

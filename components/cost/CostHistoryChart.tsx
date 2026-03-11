'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Snapshot {
  id: number
  total_cost: number
  snapshotted_at: string
}

interface CostHistoryChartProps {
  snapshots: Snapshot[]
  sellingPrice?: number | null
}

export function CostHistoryChart({ snapshots, sellingPrice }: CostHistoryChartProps) {
  if (snapshots.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-slate-50 rounded-lg text-slate-400 text-sm">
        No cost history yet — enter an invoice to trigger a snapshot
      </div>
    )
  }

  const data = snapshots.map((s) => ({
    date: new Date(s.snapshotted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    cost: parseFloat(s.total_cost.toFixed(4)),
    selling: sellingPrice ?? undefined,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `£${v}`} />
        <Tooltip formatter={(value) => `£${Number(value).toFixed(4)}`} />
        <Line
          type="monotone"
          dataKey="cost"
          stroke="#1e293b"
          strokeWidth={2}
          dot={{ fill: '#1e293b', r: 3 }}
          name="Cost"
        />
        {sellingPrice && (
          <Line
            type="monotone"
            dataKey="selling"
            stroke="#10b981"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
            name="Selling price"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}

'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface AvtProductLine {
  product_id: number
  product_name: string
  qty_sold: number
  theoretical_cost: number
}

interface AvtResult {
  from: string
  to: string
  opening_stock_value: number
  closing_stock_value: number
  purchases_total: number
  actual_cost: number
  theoretical_cost: number
  variance: number
  variance_pct: number
  sales_by_product: AvtProductLine[]
  warnings: string[]
  opening_count_date: string | null
  closing_count_date: string | null
}

function fmt(n: number) {
  return `£${n.toFixed(2)}`
}

function varianceColor(pct: number): 'green' | 'yellow' | 'red' {
  const abs = Math.abs(pct)
  if (abs < 3) return 'green'
  if (abs < 7) return 'yellow'
  return 'red'
}

function varianceLabel(pct: number) {
  const abs = Math.abs(pct)
  if (abs < 3) return 'On target'
  if (abs < 7) return 'Attention'
  return 'Investigate'
}

export function AvtReport() {
  const today = new Date().toISOString().split('T')[0]
  // Default: last 7 days
  const defaultFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(today)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AvtResult | null>(null)

  async function runReport() {
    if (!from || !to) { setError('Select both a from and to date.'); return }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/avt?from=${from}&to=${to}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to generate report'); return }
      setResult(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Date range picker */}
      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Report Period</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
            />
          </div>
          <button
            onClick={runReport}
            disabled={loading}
            className="px-5 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Calculating…' : 'Run Report'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </Card>

      {result && (
        <>
          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
              <p className="text-sm font-semibold text-amber-800">Data warnings</p>
              {result.warnings.map((w, i) => (
                <p key={i} className="text-sm text-amber-700">⚠ {w}</p>
              ))}
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <p className="text-sm text-slate-500">Actual cost</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{fmt(result.actual_cost)}</p>
              <div className="text-xs text-slate-400 mt-2 space-y-0.5">
                <p>Opening stock: {fmt(result.opening_stock_value)}</p>
                <p>+ Purchases: {fmt(result.purchases_total)}</p>
                <p>− Closing stock: {fmt(result.closing_stock_value)}</p>
              </div>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Theoretical cost</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{fmt(result.theoretical_cost)}</p>
              <p className="text-xs text-slate-400 mt-2">
                Based on {result.sales_by_product.length} product{result.sales_by_product.length !== 1 ? 's' : ''} sold
              </p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Variance (£)</p>
              <p className={`text-2xl font-bold mt-1 ${result.variance > 0 ? 'text-red-600' : result.variance < 0 ? 'text-green-600' : 'text-slate-900'}`}>
                {result.variance >= 0 ? '+' : ''}{fmt(result.variance)}
              </p>
              <p className="text-xs text-slate-400 mt-2">Actual − Theoretical</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Variance (%)</p>
              <p className={`text-2xl font-bold mt-1 ${Math.abs(result.variance_pct) < 3 ? 'text-green-600' : Math.abs(result.variance_pct) < 7 ? 'text-amber-600' : 'text-red-600'}`}>
                {result.variance_pct >= 0 ? '+' : ''}{result.variance_pct.toFixed(1)}%
              </p>
              <div className="mt-2">
                <Badge variant={varianceColor(result.variance_pct)}>
                  {varianceLabel(result.variance_pct)}
                </Badge>
              </div>
            </Card>
          </div>

          {/* Purchases detail */}
          <Card>
            <h2 className="text-base font-semibold text-slate-900 mb-3">Period Summary</h2>
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div>
                <p className="text-slate-500">Opening stock</p>
                <p className="font-mono font-semibold text-slate-900 mt-0.5">{fmt(result.opening_stock_value)}</p>
                {result.opening_count_date && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Count: {new Date(result.opening_count_date).toLocaleDateString('en-GB')}
                  </p>
                )}
              </div>
              <div>
                <p className="text-slate-500">Purchases in period</p>
                <p className="font-mono font-semibold text-slate-900 mt-0.5">{fmt(result.purchases_total)}</p>
              </div>
              <div>
                <p className="text-slate-500">Closing stock</p>
                <p className="font-mono font-semibold text-slate-900 mt-0.5">{fmt(result.closing_stock_value)}</p>
                {result.closing_count_date && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Count: {new Date(result.closing_count_date).toLocaleDateString('en-GB')}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Products table */}
          {result.sales_by_product.length > 0 && (
            <Card padding="none">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">Sales by Product</h2>
                <p className="text-xs text-slate-400 mt-0.5">Sorted by highest theoretical cost</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left px-6 py-3 font-semibold text-slate-600">Product</th>
                    <th className="text-right px-6 py-3 font-semibold text-slate-600">Units sold</th>
                    <th className="text-right px-6 py-3 font-semibold text-slate-600">Theoretical cost</th>
                    <th className="text-right px-6 py-3 font-semibold text-slate-600">% of total</th>
                  </tr>
                </thead>
                <tbody>
                  {result.sales_by_product.map((p) => (
                    <tr key={p.product_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-900">{p.product_name}</td>
                      <td className="px-6 py-3 text-right font-mono text-slate-700">{p.qty_sold}</td>
                      <td className="px-6 py-3 text-right font-mono text-slate-900">{fmt(p.theoretical_cost)}</td>
                      <td className="px-6 py-3 text-right text-slate-600">
                        {result.theoretical_cost > 0
                          ? `${((p.theoretical_cost / result.theoretical_cost) * 100).toFixed(1)}%`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td colSpan={2} className="px-6 py-3 text-sm font-semibold text-slate-700">Total</td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-slate-900">
                      {fmt(result.theoretical_cost)}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-600">100%</td>
                  </tr>
                </tfoot>
              </table>
            </Card>
          )}

          {result.sales_by_product.length === 0 && (
            <Card>
              <p className="text-sm text-slate-500 text-center py-4">
                No sales entries found for this period. <a href="/sales" className="text-blue-600 hover:underline">Record sales data</a> to calculate a theoretical cost.
              </p>
            </Card>
          )}

          {/* Explanation */}
          <Card>
            <h2 className="text-sm font-semibold text-slate-700 mb-2">Understanding your variance</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              A <strong>positive variance</strong> means you spent more on food than your recipes predict. A <strong>negative variance</strong> means your actual food cost was lower than theoretical — which can occur when stock counts are incomplete or sales are under-reported.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed mt-2">
              Common causes of a high positive variance: waste and trim not recorded, portioning errors, unrecorded staff meals, theft, or spoilage. Target is typically below 3%.
            </p>
            <div className="flex gap-3 mt-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>Below 3% — on target</span>
              <span className="flex items-center gap-1.5 text-xs"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>3–7% — investigate portioning and waste</span>
              <span className="flex items-center gap-1.5 text-xs"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>Above 7% — action required</span>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

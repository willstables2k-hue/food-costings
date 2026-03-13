'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

type MenuCategory = 'star' | 'puzzle' | 'plowhorse' | 'dog'

interface MenuProduct {
  product_id: number
  product_name: string
  units_sold: number
  cost_per_unit: number
  price: number
  contribution_margin: number
  cm_pct: number
  revenue: number
  total_contribution: number
  category: MenuCategory
  above_avg_popularity: boolean
  above_avg_margin: boolean
}

interface MenuEngineeringData {
  products: MenuProduct[]
  avg_units_sold: number
  avg_contribution_margin: number
  from: string
  to: string
  excluded: { product_name: string; reason: string }[]
}

const CATEGORY_CONFIG: Record<
  MenuCategory,
  {
    label: string
    emoji: string
    action: string
    quadrantBg: string
    quadrantBorder: string
    headerColor: string
    badgeVariant: 'yellow' | 'blue' | 'red' | 'gray'
  }
> = {
  star:      { label: 'Stars',      emoji: '⭐', action: 'Promote heavily',               quadrantBg: 'bg-amber-50',  quadrantBorder: 'border-amber-200', headerColor: 'text-amber-800', badgeVariant: 'yellow' },
  puzzle:    { label: 'Puzzles',    emoji: '🧩', action: 'Improve marketing or simplify',  quadrantBg: 'bg-blue-50',   quadrantBorder: 'border-blue-200',  headerColor: 'text-blue-800',  badgeVariant: 'blue'   },
  plowhorse: { label: 'Plowhorses', emoji: '🐴', action: 'Increase price or reduce cost',  quadrantBg: 'bg-orange-50', quadrantBorder: 'border-orange-200',headerColor: 'text-orange-800',badgeVariant: 'red'    },
  dog:       { label: 'Dogs',       emoji: '🐕', action: 'Consider removing',              quadrantBg: 'bg-slate-50',  quadrantBorder: 'border-slate-200', headerColor: 'text-slate-600', badgeVariant: 'gray'   },
}

function fmt(n: number) { return `£${n.toFixed(2)}` }
function fmtPct(n: number) { return `${n.toFixed(1)}%` }

function exportCsv(products: MenuProduct[]) {
  const headers = ['Product', 'Category', 'Units Sold', 'Food Cost', 'Price', 'Contribution Margin', 'CM%', 'Revenue', 'Total Contribution']
  const rows = products.map((p) => [
    `"${p.product_name}"`,
    CATEGORY_CONFIG[p.category].label,
    p.units_sold,
    p.cost_per_unit.toFixed(4),
    p.price.toFixed(2),
    p.contribution_margin.toFixed(4),
    p.cm_pct.toFixed(1),
    p.revenue.toFixed(2),
    p.total_contribution.toFixed(2),
  ])
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'menu-engineering.csv'
  a.click()
  URL.revokeObjectURL(url)
}

interface QuadrantProps {
  category: MenuCategory
  products: MenuProduct[]
}

function Quadrant({ category, products }: QuadrantProps) {
  const cfg = CATEGORY_CONFIG[category]
  return (
    <div className={`rounded-xl border-2 ${cfg.quadrantBg} ${cfg.quadrantBorder} p-4 min-h-40`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-base font-bold">{cfg.emoji}</span>
          <span className={`ml-1.5 text-sm font-bold ${cfg.headerColor}`}>{cfg.label}</span>
        </div>
        <span className="text-xs text-slate-400 font-medium">{products.length}</span>
      </div>
      <p className="text-xs text-slate-500 mb-3 leading-relaxed">{cfg.action}</p>
      {products.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No products</p>
      ) : (
        <div className="space-y-1.5">
          {products.map((p) => (
            <Link
              key={p.product_id}
              href={`/products/${p.product_id}`}
              className="block bg-white/70 rounded-lg px-3 py-2 hover:bg-white transition-colors border border-white/50"
            >
              <p className="text-xs font-semibold text-slate-900 truncate">{p.product_name}</p>
              <div className="flex justify-between mt-0.5">
                <span className="text-xs text-slate-500">{p.units_sold} sold</span>
                <span className="text-xs text-slate-600 font-mono">{fmtPct(p.cm_pct)} CM</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

type FilterCategory = MenuCategory | 'all'

export function MenuEngineeringReport() {
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [from, setFrom] = useState(thirtyDaysAgo)
  const [to, setTo] = useState(today)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<MenuEngineeringData | null>(null)
  const [filter, setFilter] = useState<FilterCategory>('all')

  async function runReport() {
    if (!from || !to) { setError('Select both dates.'); return }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/menu-engineering?from=${from}&to=${to}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed to load report'); return }
      setData(json)
      setFilter('all')
    } finally {
      setLoading(false)
    }
  }

  const filtered = data?.products.filter((p) => filter === 'all' || p.category === filter) ?? []

  const counts = data ? {
    star:      data.products.filter((p) => p.category === 'star').length,
    puzzle:    data.products.filter((p) => p.category === 'puzzle').length,
    plowhorse: data.products.filter((p) => p.category === 'plowhorse').length,
    dog:       data.products.filter((p) => p.category === 'dog').length,
  } : null

  return (
    <div className="space-y-6">
      {/* Date range */}
      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Analysis Period</h2>
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
            {loading ? 'Analysing…' : 'Run Analysis'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </Card>

      {data && (
        <>
          {/* Excluded products warning */}
          {data.excluded.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-800 mb-1">
                {data.excluded.length} product{data.excluded.length !== 1 ? 's' : ''} excluded
              </p>
              <div className="space-y-0.5">
                {data.excluded.map((e, i) => (
                  <p key={i} className="text-xs text-amber-700">
                    <span className="font-medium">{e.product_name}</span> — {e.reason}
                  </p>
                ))}
              </div>
            </div>
          )}

          {data.products.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-500 text-center py-6">
                No products qualify for analysis. Make sure products have prices and{' '}
                <Link href="/sales" className="text-blue-600 hover:underline">sales are recorded</Link>{' '}
                for this period.
              </p>
            </Card>
          ) : (
            <>
              {/* 2×2 Matrix */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-base font-semibold text-slate-900">Menu Engineering Matrix</h2>
                  <span className="text-xs text-slate-400">{data.products.length} products analysed</span>
                </div>

                {/* Matrix with axis labels */}
                <div className="flex gap-3">
                  {/* Y-axis label */}
                  <div className="flex flex-col items-center justify-center w-6 shrink-0">
                    <span
                      className="text-xs font-semibold text-slate-400 uppercase tracking-widest"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    >
                      Contribution Margin ↑
                    </span>
                  </div>

                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Row 1: High margin */}
                      <Quadrant category="puzzle"    products={data.products.filter((p) => p.category === 'puzzle')} />
                      <Quadrant category="star"      products={data.products.filter((p) => p.category === 'star')} />
                      <Quadrant category="dog"       products={data.products.filter((p) => p.category === 'dog')} />
                      <Quadrant category="plowhorse" products={data.products.filter((p) => p.category === 'plowhorse')} />
                    </div>
                    {/* X-axis label */}
                    <div className="text-center mt-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                        Popularity (units sold) →
                      </span>
                    </div>
                    {/* Averages */}
                    <div className="flex justify-center gap-6 mt-1">
                      <span className="text-xs text-slate-400">
                        Avg CM: <span className="font-mono text-slate-600">{fmt(data.avg_contribution_margin)}</span>
                      </span>
                      <span className="text-xs text-slate-400">
                        Avg units sold: <span className="font-mono text-slate-600">{data.avg_units_sold.toFixed(1)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed table */}
              <Card padding="none">
                <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center gap-3">
                  <h2 className="text-base font-semibold text-slate-900 mr-2">Product Detail</h2>
                  {/* Filter buttons */}
                  {(['all', 'star', 'puzzle', 'plowhorse', 'dog'] as const).map((cat) => {
                    const isActive = filter === cat
                    const count = cat === 'all' ? data.products.length : (counts?.[cat] ?? 0)
                    const cfg = cat !== 'all' ? CATEGORY_CONFIG[cat] : null
                    return (
                      <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cfg ? `${cfg.emoji} ${cfg.label}` : 'All'} ({count})
                      </button>
                    )
                  })}
                  <div className="ml-auto">
                    <button
                      onClick={() => exportCsv(data.products)}
                      className="text-xs text-slate-600 hover:text-slate-900 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Export CSV
                    </button>
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <p className="px-6 py-8 text-sm text-slate-400 text-center">No products in this category.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left px-6 py-3 font-semibold text-slate-600">Product</th>
                        <th className="text-right px-6 py-3 font-semibold text-slate-600">Units sold</th>
                        <th className="text-right px-6 py-3 font-semibold text-slate-600">Food cost</th>
                        <th className="text-right px-6 py-3 font-semibold text-slate-600">Price</th>
                        <th className="text-right px-6 py-3 font-semibold text-slate-600">Contrib. margin</th>
                        <th className="text-right px-6 py-3 font-semibold text-slate-600">CM%</th>
                        <th className="text-right px-6 py-3 font-semibold text-slate-600">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p) => {
                        const cfg = CATEGORY_CONFIG[p.category]
                        return (
                          <tr key={p.product_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                            <td className="px-6 py-3">
                              <Link href={`/products/${p.product_id}`} className="font-medium text-slate-900 hover:text-blue-600">
                                {p.product_name}
                              </Link>
                            </td>
                            <td className="px-6 py-3 text-right font-mono text-slate-700">{p.units_sold}</td>
                            <td className="px-6 py-3 text-right font-mono text-slate-600">{fmt(p.cost_per_unit)}</td>
                            <td className="px-6 py-3 text-right font-mono text-slate-900">{fmt(p.price)}</td>
                            <td className={`px-6 py-3 text-right font-mono font-semibold ${p.contribution_margin >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                              {fmt(p.contribution_margin)}
                            </td>
                            <td className="px-6 py-3 text-right text-slate-600">{fmtPct(p.cm_pct)}</td>
                            <td className="px-6 py-3 text-right">
                              <Badge variant={cfg.badgeVariant}>
                                {cfg.emoji} {cfg.label.slice(0, -1)} {/* Remove trailing 's' for singular */}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    {filtered.length > 1 && (
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-slate-50">
                          <td className="px-6 py-3 text-sm font-semibold text-slate-700">
                            Total ({filtered.length})
                          </td>
                          <td className="px-6 py-3 text-right font-mono font-semibold text-slate-900">
                            {filtered.reduce((s, p) => s + p.units_sold, 0)}
                          </td>
                          <td colSpan={2} />
                          <td className="px-6 py-3 text-right font-mono font-bold text-slate-900">
                            {fmt(filtered.reduce((s, p) => s + p.total_contribution, 0))}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}

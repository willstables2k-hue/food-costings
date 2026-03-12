'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

type StockStatus = 'ok' | 'low' | 'critical' | 'no_count' | null

export interface IngredientRow {
  id: number
  name: string
  unit: string
  yield_percentage: number | null
  current_price_per_unit: number | null
  par_level: number | null
  par_unit: string | null
  recipe_components_count: number
  stockStatus: StockStatus
  currentStock: number | null
  suggestedOrder: number | null
}

type Filter = 'all' | 'low' | 'critical'

const STOCK_BADGE: Record<NonNullable<StockStatus>, { label: string; className: string }> = {
  ok:       { label: 'OK',       className: 'bg-green-100 text-green-700' },
  low:      { label: 'Low',      className: 'bg-amber-100 text-amber-700' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700' },
  no_count: { label: 'No data',  className: 'bg-slate-100 text-slate-500' },
}

export function IngredientsTable({ rows, initialFilter = 'all' }: { rows: IngredientRow[]; initialFilter?: Filter }) {
  const [filter, setFilter] = useState<Filter>(initialFilter)

  const filtered = rows.filter((r) => {
    if (filter === 'all') return true
    if (filter === 'low') return r.stockStatus === 'low' || r.stockStatus === 'critical'
    if (filter === 'critical') return r.stockStatus === 'critical'
    return true
  })

  const lowCount = rows.filter((r) => r.stockStatus === 'low').length
  const criticalCount = rows.filter((r) => r.stockStatus === 'critical').length
  const showSuggestedOrder = filter === 'low' || filter === 'critical'

  return (
    <>
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-slate-600 font-medium">Show:</span>
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
          {([['all', 'All ingredients'], ['low', `Low stock (${lowCount + criticalCount})`], ['critical', `Critical only (${criticalCount})`]] as [Filter, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {filtered.length !== rows.length && (
          <span className="text-xs text-slate-400">{filtered.length} shown</span>
        )}
      </div>

      <Card padding="none">
        {filtered.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">
            No ingredients match this filter.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Name</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Unit</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Yield</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Current price</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Stock</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Par level</th>
                {showSuggestedOrder && (
                  <th className="text-right px-6 py-3 font-semibold text-slate-600">Suggested order</th>
                )}
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Used in</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const yp = i.yield_percentage ?? 100
                const yieldColor = yp >= 95 ? 'bg-green-100 text-green-700' : yp >= 75 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                const stockBadge = i.stockStatus ? STOCK_BADGE[i.stockStatus] : null
                return (
                  <tr key={i.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <Link href={`/ingredients/${i.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                        {i.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-600">per {i.unit}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${yieldColor}`}>
                        {yp % 1 === 0 ? yp.toFixed(0) : yp.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-900">
                      {i.current_price_per_unit !== null
                        ? `£${i.current_price_per_unit.toFixed(4)}`
                        : <span className="text-slate-400">No price yet</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {stockBadge ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${stockBadge.className}`}>
                            {stockBadge.label}
                          </span>
                          {i.currentStock !== null && i.stockStatus !== 'no_count' && (
                            <span className="text-xs text-slate-400">
                              {i.currentStock % 1 === 0 ? i.currentStock.toFixed(0) : i.currentStock.toFixed(2)} {i.par_unit ?? i.unit}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">
                      {i.par_level !== null
                        ? `${i.par_level % 1 === 0 ? i.par_level.toFixed(0) : i.par_level} ${i.par_unit ?? i.unit}`
                        : <span className="text-slate-300 text-xs">not set</span>}
                    </td>
                    {showSuggestedOrder && (
                      <td className="px-6 py-4 text-right font-mono">
                        {i.suggestedOrder !== null && i.suggestedOrder > 0 ? (
                          <span className="text-slate-900 font-medium">
                            {i.suggestedOrder % 1 === 0 ? i.suggestedOrder.toFixed(0) : i.suggestedOrder.toFixed(2)} {i.par_unit ?? i.unit}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 text-right text-slate-600">
                      {i.recipe_components_count} {i.recipe_components_count === 1 ? 'recipe' : 'recipes'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}

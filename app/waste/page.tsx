'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { WasteLogForm } from '@/components/forms/WasteLogForm'
import { WASTE_REASONS } from '@/lib/validations/waste'

interface WasteLogEntry {
  id: number
  ingredient_id: number | null
  recipe_id: number | null
  quantity: number
  unit: string
  reason: string
  notes: string | null
  cost_at_log: number | null
  logged_at: string
  ingredient: { id: number; name: string; unit: string } | null
  recipe: { id: number; name: string; yield_unit: string } | null
}

interface Item {
  id: number
  name: string
  unit: string
  current_price_per_unit?: number | null
}

interface RecipeItem {
  id: number
  name: string
  yield_unit: string
  cost_per_yield_unit?: number | null
}

const reasonBadgeVariant: Record<string, 'red' | 'yellow' | 'blue' | 'gray'> = {
  spoilage: 'red',
  expired: 'red',
  overproduction: 'yellow',
  dropped: 'yellow',
  trim: 'gray',
  staff_meal: 'blue',
  comp: 'blue',
  other: 'gray',
}

function getDefaultDateRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 7)
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  }
}

export default function WastePage() {
  const [logs, setLogs] = useState<WasteLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [ingredients, setIngredients] = useState<Item[]>([])
  const [recipes, setRecipes] = useState<RecipeItem[]>([])

  const defaultRange = getDefaultDateRange()
  const [dateFrom, setDateFrom] = useState(defaultRange.from)
  const [dateTo, setDateTo] = useState(defaultRange.to)
  const [filterReason, setFilterReason] = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (dateFrom) params.set('from', dateFrom)
    if (dateTo) params.set('to', dateTo)
    if (filterReason) params.set('reason', filterReason)
    const res = await fetch(`/api/waste?${params}`)
    if (res.ok) setLogs(await res.json())
    setLoading(false)
  }, [dateFrom, dateTo, filterReason])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Load ingredients and recipes for the form
  useEffect(() => {
    async function loadItems() {
      const [ingRes, recRes] = await Promise.all([
        fetch('/api/ingredients'),
        fetch('/api/recipes'),
      ])
      if (ingRes.ok) setIngredients(await ingRes.json())
      if (recRes.ok) {
        const allRecipes = await recRes.json()
        setRecipes(allRecipes.map((r: { id: number; name: string; yield_unit: string }) => ({
          id: r.id,
          name: r.name,
          yield_unit: r.yield_unit,
          cost_per_yield_unit: null,
        })))
      }
    }
    loadItems()
  }, [])

  const totalCost = logs.reduce((sum, l) => sum + (l.cost_at_log ?? 0), 0)
  const logCount = logs.length

  const deleteLog = async (id: number) => {
    if (!confirm('Delete this waste log entry?')) return
    const res = await fetch(`/api/waste/${id}`, { method: 'DELETE' })
    if (res.ok) fetchLogs()
  }

  const reasonLabel = (key: string) =>
    WASTE_REASONS.find((r) => r.value === key)?.label ?? key

  return (
    <div className="space-y-6">
      <PageHeader title="Waste Log" description="Track food waste and associated costs" />

      {/* Summary + filters */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-slate-500">Period waste cost</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">
            £{totalCost.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">{logCount} {logCount === 1 ? 'entry' : 'entries'}</p>
        </Card>
        <div className="col-span-3">
          <Card>
            <div className="flex items-end gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">Reason</label>
                <select
                  value={filterReason}
                  onChange={(e) => setFilterReason(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                >
                  <option value="">All reasons</option>
                  {WASTE_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="ml-auto">
                <Button onClick={() => setShowForm(true)}>+ Log Waste</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Slide-in form panel */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-md bg-white shadow-xl h-full overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Log Waste</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl"
                >
                  &times;
                </button>
              </div>
              <WasteLogForm
                ingredients={ingredients}
                recipes={recipes}
                onSuccess={() => { setShowForm(false); fetchLogs() }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Logs table */}
      <Card padding="none">
        {loading ? (
          <p className="text-sm text-slate-400 p-6">Loading...</p>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="text-lg font-semibold text-slate-900">No waste logged</h3>
            <p className="text-slate-500 text-sm mt-1">
              Start tracking waste to see cost impact.
            </p>
            <div className="mt-4">
              <Button onClick={() => setShowForm(true)}>+ Log Waste</Button>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Date</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Item</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Quantity</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Reason</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Cost</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600"></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-600">
                    {new Date(log.logged_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-3">
                    <span className="font-medium text-slate-900">
                      {log.ingredient?.name ?? log.recipe?.name ?? 'Deleted item'}
                    </span>
                    {log.recipe && (
                      <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">recipe</span>
                    )}
                    {log.notes && (
                      <p className="text-xs text-slate-400 mt-0.5">{log.notes}</p>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-slate-900">
                    {log.quantity} {log.unit}
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={reasonBadgeVariant[log.reason] ?? 'gray'}>
                      {reasonLabel(log.reason)}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-slate-900">
                    {log.cost_at_log !== null ? `£${log.cost_at_log.toFixed(2)}` : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => deleteLog(log.id)}
                      className="text-xs text-slate-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

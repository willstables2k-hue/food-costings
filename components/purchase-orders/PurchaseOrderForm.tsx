'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'

interface Supplier {
  id: number
  name: string
}

interface Ingredient {
  id: number
  name: string
  unit: string
}

interface SuggestedLine {
  ingredient_id: number
  ingredient_name: string
  quantity: number
  unit: string
  last_unit_price: number | null
  stock_status: 'low' | 'critical'
}

interface LineRow {
  ingredient_id: number
  quantity: string
  unit: string
  unit_price: string
}

interface PurchaseOrderFormProps {
  suppliers: Supplier[]
  ingredients: Ingredient[]
}

export function PurchaseOrderForm({ suppliers, ingredients }: PurchaseOrderFormProps) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  const [supplierId, setSupplierId] = useState<string>('')
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineRow[]>([
    { ingredient_id: 0, quantity: '', unit: '', unit_price: '' },
  ])
  const [suggesting, setSuggesting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ingredientOptions = ingredients.map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` }))

  function addLine() {
    setLines((prev) => [...prev, { ingredient_id: 0, quantity: '', unit: '', unit_price: '' }])
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  function updateLine(index: number, field: keyof LineRow, value: string | number) {
    setLines((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row
        const updated = { ...row, [field]: value }
        // Auto-fill unit when ingredient changes
        if (field === 'ingredient_id') {
          const ing = ingredients.find((x) => x.id === Number(value))
          if (ing) updated.unit = ing.unit
        }
        return updated
      })
    )
  }

  async function handleSuggest() {
    if (!supplierId) { setError('Select a supplier first.'); return }
    setError(null)
    setSuggesting(true)
    try {
      const res = await fetch(`/api/purchase-orders/suggest?supplier_id=${supplierId}`)
      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? 'Could not load suggestions')
        return
      }
      const suggestions: SuggestedLine[] = await res.json()
      if (suggestions.length === 0) {
        setError('No low-stock items found for this supplier.')
        return
      }
      setLines(
        suggestions.map((s) => ({
          ingredient_id: s.ingredient_id,
          quantity: String(s.quantity),
          unit: s.unit,
          unit_price: s.last_unit_price != null ? String(s.last_unit_price) : '',
        }))
      )
    } finally {
      setSuggesting(false)
    }
  }

  async function handleSubmit() {
    if (!supplierId) { setError('Select a supplier.'); return }

    const validLines = lines.filter((l) => l.ingredient_id > 0 && parseFloat(l.quantity) > 0)
    if (validLines.length === 0) { setError('Add at least one line with a valid ingredient and quantity.'); return }

    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: parseInt(supplierId),
          expected_delivery: expectedDelivery || null,
          notes: notes.trim() || undefined,
          lines: validLines.map((l) => ({
            ingredient_id: l.ingredient_id,
            quantity: parseFloat(l.quantity),
            unit: l.unit,
            unit_price: l.unit_price ? parseFloat(l.unit_price) : null,
          })),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? 'Failed to create purchase order')
        return
      }
      const created = await res.json()
      router.push(`/purchase-orders/${created.id}`)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Order Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Select
              id="supplier"
              label="Supplier *"
              placeholder="Select supplier…"
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            />
          </div>
          <Input
            id="expected_delivery"
            label="Expected delivery"
            type="date"
            min={today}
            value={expectedDelivery}
            onChange={(e) => setExpectedDelivery(e.target.value)}
          />
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              placeholder="Optional notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none bg-white"
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Order Lines</h2>
          <Button
            variant="secondary"
            onClick={handleSuggest}
            disabled={suggesting || !supplierId}
          >
            {suggesting ? 'Suggesting…' : '✨ Suggest items'}
          </Button>
        </div>

        <div className="space-y-2">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">
            <div className="col-span-5">Ingredient</div>
            <div className="col-span-2">Quantity</div>
            <div className="col-span-2">Unit</div>
            <div className="col-span-2">Unit price (£)</div>
            <div className="col-span-1"></div>
          </div>

          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <select
                  value={line.ingredient_id || ''}
                  onChange={(e) => updateLine(i, 'ingredient_id', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                >
                  <option value="">Select ingredient…</option>
                  {ingredientOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0"
                  value={line.quantity}
                  onChange={(e) => updateLine(i, 'quantity', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="unit"
                  value={line.unit}
                  onChange={(e) => updateLine(i, 'unit', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  placeholder="optional"
                  value={line.unit_price}
                  onChange={(e) => updateLine(i, 'unit_price', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                {lines.length > 1 && (
                  <button
                    onClick={() => removeLine(i)}
                    className="text-slate-400 hover:text-red-500 text-lg leading-none"
                    title="Remove line"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addLine}
          className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          + Add line
        </button>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Saving…' : 'Create Purchase Order'}
        </Button>
        <Button variant="secondary" onClick={() => router.back()}>Cancel</Button>
      </div>
    </div>
  )
}

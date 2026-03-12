'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface Ingredient {
  id: number
  name: string
  unit: string
  current_price_per_unit: number | null
}

interface StockCountFormProps {
  ingredients: Ingredient[]
}

export function StockCountForm({ ingredients }: StockCountFormProps) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  const [name, setName] = useState('')
  const [countedAt, setCountedAt] = useState(today)
  const [notes, setNotes] = useState('')
  const [quantities, setQuantities] = useState<Record<number, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Group ingredients alphabetically by first letter
  const grouped = useMemo(() => {
    const groups: Record<string, Ingredient[]> = {}
    for (const ing of ingredients) {
      const letter = ing.name[0].toUpperCase()
      if (!groups[letter]) groups[letter] = []
      groups[letter].push(ing)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [ingredients])

  const filledCount = Object.values(quantities).filter((v) => parseFloat(v) > 0).length

  async function handleSubmit() {
    if (!name.trim()) { setError('Please enter a name for this count.'); return }
    const lines = Object.entries(quantities)
      .filter(([, v]) => parseFloat(v) > 0)
      .map(([id, v]) => {
        const ing = ingredients.find((i) => i.id === parseInt(id))!
        return {
          ingredient_id: parseInt(id),
          counted_quantity: parseFloat(v),
          unit: ing.unit,
        }
      })
    if (lines.length === 0) { setError('Enter at least one quantity.'); return }

    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/stockcounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), counted_at: countedAt, notes: notes.trim() || undefined, lines }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? 'Failed to save count')
        return
      }
      const created = await res.json()
      router.push(`/stockcounts/${created.id}`)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header fields */}
      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Count Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="name"
            label="Count name *"
            placeholder="e.g. Week 12 Count"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            id="counted_at"
            label="Date *"
            type="date"
            value={countedAt}
            onChange={(e) => setCountedAt(e.target.value)}
          />
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              placeholder="Optional notes about this count..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none bg-white"
            />
          </div>
        </div>
      </Card>

      {/* Ingredient quantities */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Ingredient Quantities</h2>
          <span className="text-xs text-slate-500">{filledCount} of {ingredients.length} counted</span>
        </div>
        <p className="text-xs text-slate-400 mb-5">Leave blank to skip. Only filled quantities will be saved.</p>

        <div className="space-y-6">
          {grouped.map(([letter, items]) => (
            <div key={letter}>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pb-1 border-b border-slate-100">
                {letter}
              </div>
              <div className="space-y-1">
                {items.map((ing) => (
                  <div key={ing.id} className="grid grid-cols-12 gap-3 items-center py-1.5">
                    <div className="col-span-6">
                      <span className="text-sm text-slate-800">{ing.name}</span>
                      {ing.current_price_per_unit !== null && (
                        <span className="text-xs text-slate-400 ml-2">
                          £{ing.current_price_per_unit.toFixed(4)}/{ing.unit}
                        </span>
                      )}
                    </div>
                    <div className="col-span-4">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        placeholder="0"
                        value={quantities[ing.id] ?? ''}
                        onChange={(e) =>
                          setQuantities((prev) => ({ ...prev, [ing.id]: e.target.value }))
                        }
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white text-right"
                      />
                    </div>
                    <div className="col-span-2 text-sm text-slate-500">{ing.unit}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Saving…' : `Save Count (${filledCount} lines)`}
        </Button>
        <Button variant="secondary" onClick={() => router.back()}>Cancel</Button>
      </div>
    </div>
  )
}

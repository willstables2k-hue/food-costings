'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface Product {
  id: number
  name: string
  selling_unit: string | null
}

interface SalesEntryFormProps {
  products: Product[]
}

export function SalesEntryForm({ products }: SalesEntryFormProps) {
  const router = useRouter()

  // Default to last Monday (start of current week)
  const lastMonday = (() => {
    const d = new Date()
    const day = d.getDay()
    const diff = (day === 0 ? 6 : day - 1)
    d.setDate(d.getDate() - diff)
    return d.toISOString().split('T')[0]
  })()

  const [periodDate, setPeriodDate] = useState(lastMonday)
  const [quantities, setQuantities] = useState<Record<number, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const filledCount = Object.values(quantities).filter((v) => parseFloat(v) > 0).length

  async function handleSubmit() {
    if (!periodDate) { setError('Select a period date.'); return }
    const entries = Object.entries(quantities)
      .filter(([, v]) => parseFloat(v) > 0)
      .map(([id, v]) => ({ product_id: parseInt(id), quantity: parseFloat(v) }))

    if (entries.length === 0) { setError('Enter at least one quantity.'); return }

    setError(null)
    setSuccess(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_date: periodDate, entries }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? 'Failed to save sales data')
        return
      }
      setSuccess(`Saved ${entries.length} sales entr${entries.length === 1 ? 'y' : 'ies'} for ${new Date(periodDate).toLocaleDateString('en-GB')}.`)
      setQuantities({})
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Record Sales</h2>
        <div className="mb-5">
          <Input
            id="period_date"
            label="Period date *"
            type="date"
            value={periodDate}
            onChange={(e) => setPeriodDate(e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1">
            Enter the date this sales data covers (e.g. week ending date).
          </p>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">
            <div className="col-span-7">Product</div>
            <div className="col-span-3">Units sold</div>
            <div className="col-span-2">Unit</div>
          </div>

          {products.map((p) => (
            <div key={p.id} className="grid grid-cols-12 gap-2 items-center py-1">
              <div className="col-span-7 text-sm text-slate-800">{p.name}</div>
              <div className="col-span-3">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={quantities[p.id] ?? ''}
                  onChange={(e) =>
                    setQuantities((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white text-right"
                />
              </div>
              <div className="col-span-2 text-sm text-slate-500 truncate">
                {p.selling_unit ?? 'unit'}
              </div>
            </div>
          ))}
        </div>

        {filledCount > 0 && (
          <p className="text-xs text-slate-500 mt-3">{filledCount} product{filledCount !== 1 ? 's' : ''} with quantities entered</p>
        )}
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save Sales Data'}
        </Button>
      </div>
    </div>
  )
}

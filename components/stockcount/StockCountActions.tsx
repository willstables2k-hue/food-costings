'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface CsvLine {
  ingredientName: string
  counted_quantity: number
  unit: string
  price_per_unit: number | null
  line_value: number
}

interface StockCountActionsProps {
  countId: number
  status: string
  countName: string
  countedAt: string
  csvLines: CsvLine[]
}

export function StockCountActions({ countId, status, countName, countedAt, csvLines }: StockCountActionsProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  function downloadCsv() {
    const header = ['Ingredient', 'Counted Quantity', 'Unit', 'Price per Unit (£)', 'Line Value (£)']
    const rows = csvLines.map((l) => [
      `"${l.ingredientName.replace(/"/g, '""')}"`,
      l.counted_quantity,
      l.unit,
      l.price_per_unit !== null ? l.price_per_unit.toFixed(4) : '',
      l.line_value.toFixed(4),
    ])
    const totalValue = csvLines.reduce((s, l) => s + l.line_value, 0)
    rows.push(['TOTAL', '', '', '', totalValue.toFixed(4)])

    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stock-count-${countName.replace(/\s+/g, '-').toLowerCase()}-${countedAt}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function submitCount() {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/stockcounts/${countId}/submit`, { method: 'POST' })
      if (res.ok) {
        router.refresh()
      } else {
        const err = await res.json()
        alert(err.error ?? 'Failed to submit count')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex gap-3">
      <Button variant="secondary" onClick={downloadCsv}>
        ↓ Download CSV
      </Button>
      {status === 'draft' && (
        <Button onClick={submitCount} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Count'}
        </Button>
      )}
    </div>
  )
}

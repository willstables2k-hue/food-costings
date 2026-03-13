'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'

interface Supplier { id: number; name: string }
interface Ingredient { id: number; name: string; unit: string }

interface ParsedLineItem {
  description: string
  quantity: number
  unit: string
  total_cost: number
}

interface ParsedInvoice {
  supplier_name: string | null
  invoice_date: string | null
  reference: string | null
  line_items: ParsedLineItem[]
}

interface ReviewLineItem {
  description: string
  ingredient_id: number | ''
  quantity: number
  purchase_unit: string
  total_cost: number
}

interface ReviewState {
  supplier_id: number | ''
  invoice_date: string
  reference: string
  line_items: ReviewLineItem[]
}

const UNIT_OPTIONS = [
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'L', label: 'L' },
  { value: 'unit', label: 'unit' },
  { value: 'each', label: 'each' },
  { value: 'dozen', label: 'dozen' },
  { value: 'lb', label: 'lb' },
  { value: 'oz', label: 'oz' },
  { value: 'pack', label: 'pack' },
  { value: 'bag', label: 'bag' },
  { value: 'box', label: 'box' },
]

function fuzzyMatchSupplier(name: string | null, suppliers: Supplier[]): number | '' {
  if (!name) return ''
  const lower = name.toLowerCase()
  const match = suppliers.find((s) => lower.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(lower))
  return match ? match.id : ''
}

function fuzzyMatchIngredient(description: string, ingredients: Ingredient[]): number | '' {
  const lower = description.toLowerCase()
  const match = ingredients.find((i) => lower.includes(i.name.toLowerCase()) || i.name.toLowerCase().includes(lower))
  return match ? match.id : ''
}

export function InvoiceUpload({ suppliers, ingredients }: { suppliers: Supplier[]; ingredients: Ingredient[] }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [status, setStatus] = useState<'idle' | 'reading' | 'extracting' | 'review'>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [review, setReview] = useState<ReviewState | null>(null)

  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.name }))
  const ingredientOptions = [
    { value: '' as number | '', label: '— skip this item —' },
    ...ingredients.map((i) => ({ value: i.id, label: `${i.name} (per ${i.unit})` })),
  ]

  async function processFile(file: File) {
    if (!file.type.includes('pdf')) {
      setError('Please upload a PDF file.')
      return
    }
    setError(null)
    setStatus('reading')

    const formData = new FormData()
    formData.append('file', file)

    setStatus('extracting')
    const res = await fetch('/api/invoices/parse-pdf', { method: 'POST', body: formData })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to parse PDF')
      setStatus('idle')
      return
    }

    const parsed = data as ParsedInvoice
    setReview({
      supplier_id: fuzzyMatchSupplier(parsed.supplier_name, suppliers),
      invoice_date: parsed.invoice_date ?? new Date().toISOString().split('T')[0],
      reference: parsed.reference ?? '',
      line_items: (parsed.line_items ?? []).map((li) => ({
        description: li.description,
        ingredient_id: fuzzyMatchIngredient(li.description, ingredients),
        quantity: li.quantity,
        purchase_unit: li.unit,
        total_cost: li.total_cost,
      })),
    })
    setStatus('review')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function updateHeader(field: keyof Omit<ReviewState, 'line_items'>, value: string | number) {
    setReview((r) => r ? { ...r, [field]: value } : r)
  }

  function updateLineItem(index: number, field: keyof ReviewLineItem, value: string | number) {
    setReview((r) => {
      if (!r) return r
      const items = [...r.line_items]
      items[index] = { ...items[index], [field]: value }
      return { ...r, line_items: items }
    })
  }

  function removeLineItem(index: number) {
    setReview((r) => {
      if (!r) return r
      return { ...r, line_items: r.line_items.filter((_, i) => i !== index) }
    })
  }

  async function handleSubmit() {
    if (!review) return
    if (!review.supplier_id) { setError('Please select a supplier.'); return }

    const activeItems = review.line_items.filter((li) => li.ingredient_id !== '')
    if (activeItems.length === 0) { setError('At least one line item must be matched to an ingredient.'); return }

    setError(null)
    setIsSubmitting(true)

    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_id: Number(review.supplier_id),
        invoice_date: review.invoice_date,
        reference: review.reference || null,
        line_items: activeItems.map((li) => ({
          ingredient_id: Number(li.ingredient_id),
          quantity: Number(li.quantity),
          purchase_unit: li.purchase_unit,
          total_cost: Number(li.total_cost),
        })),
      }),
    })

    if (res.ok) {
      const result = await res.json()
      router.push(`/invoices/${result.invoice.id}`)
      router.refresh()
    } else {
      const err = await res.json()
      setError(err.error ?? 'Failed to create invoice')
      setIsSubmitting(false)
    }
  }

  if (status === 'idle' || status === 'reading' || status === 'extracting') {
    return (
      <div className="max-w-3xl space-y-4">
        <Card>
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
              dragOver ? 'border-slate-500 bg-slate-50' : 'border-slate-300 hover:border-slate-400'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {status === 'reading' || status === 'extracting' ? (
              <div className="flex flex-col items-center gap-3">
                <Spinner size="lg" />
                <p className="text-sm text-slate-600">
                  {status === 'reading' ? 'Reading PDF…' : 'Extracting invoice data with AI…'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-2xl text-slate-400">↑</p>
                <p className="text-sm font-medium text-slate-700">Drop a PDF invoice here, or click to browse</p>
                <p className="text-xs text-slate-400">Digital PDFs only (not scanned images)</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </Card>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  if (status === 'review' && review) {
    return (
      <div className="max-w-4xl space-y-6">
        <Card>
          <h2 className="text-base font-semibold text-slate-900 mb-4">Invoice Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Select
              id="supplier_id"
              label="Supplier *"
              placeholder="Select supplier..."
              options={supplierOptions}
              value={review.supplier_id === '' ? '' : String(review.supplier_id)}
              onChange={(e) => updateHeader('supplier_id', Number(e.target.value))}
            />
            <Input
              id="invoice_date"
              label="Invoice Date *"
              type="date"
              value={review.invoice_date}
              onChange={(e) => updateHeader('invoice_date', e.target.value)}
            />
            <Input
              id="reference"
              label="Reference / Invoice #"
              placeholder="INV-001"
              value={review.reference}
              onChange={(e) => updateHeader('reference', e.target.value)}
            />
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-slate-900 mb-1">Line Items</h2>
          <p className="text-xs text-slate-500 mb-4">
            Match each line item to an ingredient. Unmatched rows (set to &quot;skip&quot;) will not be saved.
          </p>

          <div className="space-y-3">
            {review.line_items.map((item, index) => (
              <div key={index} className="p-3 bg-slate-50 rounded-lg space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-slate-500 italic flex-1">{item.description}</p>
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    className="text-xs text-red-400 hover:text-red-600 shrink-0"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Select
                      id={`item-${index}-ingredient`}
                      label="Ingredient"
                      options={ingredientOptions}
                      value={item.ingredient_id === '' ? '' : String(item.ingredient_id)}
                      onChange={(e) => updateLineItem(index, 'ingredient_id', e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      id={`item-${index}-qty`}
                      label="Qty"
                      type="number"
                      step="0.001"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Select
                      id={`item-${index}-unit`}
                      label="Unit"
                      options={UNIT_OPTIONS}
                      value={item.purchase_unit}
                      onChange={(e) => updateLineItem(index, 'purchase_unit', e.target.value)}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      id={`item-${index}-cost`}
                      label="Total cost (£)"
                      type="number"
                      step="0.01"
                      value={item.total_cost}
                      onChange={(e) => updateLineItem(index, 'total_cost', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving & processing…' : 'Create Invoice'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => { setStatus('idle'); setReview(null); setError(null); setIsSubmitting(false) }}
          >
            Upload different file
          </Button>
        </div>
      </div>
    )
  }

  return null
}

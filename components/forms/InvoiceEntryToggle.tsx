'use client'

import { useState } from 'react'
import { InvoiceForm } from './InvoiceForm'
import { InvoiceUpload } from './InvoiceUpload'

interface Supplier { id: number; name: string }
interface Ingredient { id: number; name: string; unit: string }

export function InvoiceEntryToggle({
  suppliers,
  ingredients,
}: {
  suppliers: Supplier[]
  ingredients: Ingredient[]
}) {
  const [mode, setMode] = useState<'upload' | 'manual'>('upload')

  return (
    <div className="space-y-6">
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            mode === 'upload'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Upload PDF
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            mode === 'manual'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Enter Manually
        </button>
      </div>

      {mode === 'upload' ? (
        <InvoiceUpload suppliers={suppliers} ingredients={ingredients} />
      ) : (
        <InvoiceForm suppliers={suppliers} ingredients={ingredients} />
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface PurchaseOrderActionsProps {
  orderId: number
  status: string
}

export function PurchaseOrderActions({ orderId, status }: PurchaseOrderActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Invoice modal state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [converting, setConverting] = useState(false)
  const [convertResult, setConvertResult] = useState<{
    invoice_id: number
    lines_converted: number
    lines_skipped: number
    affected_products: number
    snapshots_created: number
  } | null>(null)

  async function changeStatus(newStatus: string) {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/purchase-orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? 'Failed to update status')
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleConvertToInvoice() {
    if (!invoiceDate) return
    setError(null)
    setConverting(true)
    try {
      const res = await fetch(`/api/purchase-orders/${orderId}/convert-to-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_date: invoiceDate }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to convert to invoice')
        return
      }
      setConvertResult(data)
      router.refresh()
    } finally {
      setConverting(false)
    }
  }

  if (status === 'cancelled') {
    return <p className="text-sm text-slate-500 italic">This order has been cancelled.</p>
  }

  if (status === 'received') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">This order has been received.</p>
        <Button onClick={() => setShowInvoiceModal(true)} variant="secondary">
          Create invoice from PO lines
        </Button>
        {showInvoiceModal && (
          <InvoiceModal
            invoiceDate={invoiceDate}
            setInvoiceDate={setInvoiceDate}
            converting={converting}
            convertResult={convertResult}
            error={error}
            onConvert={handleConvertToInvoice}
            onClose={() => { setShowInvoiceModal(false); setConvertResult(null); setError(null) }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status === 'draft' && (
          <>
            <Button onClick={() => changeStatus('sent')} disabled={loading}>
              Mark as Sent
            </Button>
            <Button variant="secondary" onClick={() => changeStatus('cancelled')} disabled={loading}>
              Cancel Order
            </Button>
          </>
        )}
        {status === 'sent' && (
          <>
            <Button onClick={() => changeStatus('received')} disabled={loading}>
              Mark as Received
            </Button>
            <Button variant="secondary" onClick={() => changeStatus('cancelled')} disabled={loading}>
              Cancel Order
            </Button>
          </>
        )}
      </div>

      {status === 'sent' && (
        <div className="pt-1">
          <button
            onClick={() => setShowInvoiceModal(true)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Convert to invoice now →
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showInvoiceModal && (
        <InvoiceModal
          invoiceDate={invoiceDate}
          setInvoiceDate={setInvoiceDate}
          converting={converting}
          convertResult={convertResult}
          error={error}
          onConvert={handleConvertToInvoice}
          onClose={() => { setShowInvoiceModal(false); setConvertResult(null); setError(null) }}
        />
      )}
    </div>
  )
}

interface InvoiceModalProps {
  invoiceDate: string
  setInvoiceDate: (d: string) => void
  converting: boolean
  convertResult: {
    invoice_id: number
    lines_converted: number
    lines_skipped: number
    affected_products: number
    snapshots_created: number
  } | null
  error: string | null
  onConvert: () => void
  onClose: () => void
}

function InvoiceModal({
  invoiceDate, setInvoiceDate, converting, convertResult, error, onConvert, onClose,
}: InvoiceModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-base font-semibold text-slate-900 mb-1">Create Invoice from PO</h3>
        <p className="text-sm text-slate-500 mb-4">
          This will create a new invoice from the priced lines on this order and update ingredient costs.
        </p>

        {convertResult ? (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800 space-y-1">
              <p className="font-semibold">Invoice created successfully!</p>
              <p>{convertResult.lines_converted} line(s) converted, {convertResult.lines_skipped} skipped</p>
              <p>{convertResult.affected_products} product(s) repriced, {convertResult.snapshots_created} snapshot(s) created</p>
            </div>
            <div className="flex gap-2">
              <a
                href={`/invoices/${convertResult.invoice_id}`}
                className="flex-1 text-center px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700"
              >
                View Invoice
              </a>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Invoice date *</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={onConvert}
                disabled={converting || !invoiceDate}
                className="flex-1 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
              >
                {converting ? 'Creating…' : 'Create Invoice'}
              </button>
              <button
                onClick={onClose}
                disabled={converting}
                className="flex-1 px-4 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

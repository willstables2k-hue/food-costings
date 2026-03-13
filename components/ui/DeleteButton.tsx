'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@/components/ui/Spinner'

interface DeleteButtonProps {
  endpoint: string
  redirectTo: string
  label: string
  confirmTitle: string
  confirmMessage: string
  disabled?: boolean
  disabledReason?: string
}

export function DeleteButton({
  endpoint,
  redirectTo,
  label,
  confirmTitle,
  confirmMessage,
  disabled,
  disabledReason,
}: DeleteButtonProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch(endpoint, { method: 'DELETE' })
      if (res.ok) {
        router.push(redirectTo)
        return
      }
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to delete. Please try again.')
      setShowModal(false)
    } catch {
      setError('Failed to delete. Please try again.')
      setShowModal(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => !disabled && setShowModal(true)}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {label}
      </button>

      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-semibold text-slate-900 mb-2">{confirmTitle}</h3>
            <p className="text-sm text-slate-600 mb-6">{confirmMessage}</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && <Spinner size="sm" />}
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

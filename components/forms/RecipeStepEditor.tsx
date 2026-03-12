'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface Step {
  id: number
  step_number: number
  instruction: string
  duration_mins: number | null
  photo_url: string | null
}

interface RecipeStepEditorProps {
  recipeId: number
  initialSteps: Step[]
}

export function RecipeStepEditor({ recipeId, initialSteps }: RecipeStepEditorProps) {
  const [steps, setSteps] = useState<Step[]>(
    [...initialSteps].sort((a, b) => a.step_number - b.step_number)
  )
  const [adding, setAdding] = useState(false)
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  // Track local edits before blur saves — keyed by step id
  const localEdits = useRef<Record<number, Partial<Step>>>({})

  function updateLocalEdit(id: number, field: keyof Step, value: string | number | null) {
    localEdits.current[id] = { ...localEdits.current[id], [field]: value }
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    )
  }

  async function saveStep(step: Step) {
    setSavingIds((prev) => new Set(prev).add(step.id))
    try {
      await fetch(`/api/recipes/${recipeId}/steps/${step.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_number: step.step_number,
          instruction: step.instruction,
          duration_mins: step.duration_mins,
          photo_url: step.photo_url || null,
        }),
      })
    } catch {
      setError('Failed to save step')
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(step.id)
        return next
      })
    }
  }

  async function addStep() {
    setAdding(true)
    setError(null)
    const nextNumber =
      steps.length > 0 ? Math.max(...steps.map((s) => s.step_number)) + 1 : 1
    try {
      const res = await fetch(`/api/recipes/${recipeId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step_number: nextNumber, instruction: '' }),
      })
      if (!res.ok) throw new Error()
      const newStep: Step = await res.json()
      setSteps((prev) => [...prev, newStep])
    } catch {
      setError('Failed to add step')
    } finally {
      setAdding(false)
    }
  }

  async function deleteStep(id: number) {
    const res = await fetch(`/api/recipes/${recipeId}/steps/${id}`, { method: 'DELETE' })
    if (!res.ok) { setError('Failed to delete step'); return }
    setSteps((prev) => {
      const remaining = prev.filter((s) => s.id !== id)
      // Re-number sequentially
      return remaining.map((s, i) => ({ ...s, step_number: i + 1 }))
    })
  }

  async function moveStep(index: number, dir: 'up' | 'down') {
    const targetIndex = dir === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= steps.length) return

    const newSteps = [...steps]
    const snA = newSteps[index].step_number
    const snB = newSteps[targetIndex].step_number
    const stepA = { ...newSteps[index], step_number: snB }
    const stepB = { ...newSteps[targetIndex], step_number: snA }
    newSteps[index] = stepA
    newSteps[targetIndex] = stepB
    newSteps.sort((a, b) => a.step_number - b.step_number)
    setSteps(newSteps)

    await Promise.all([
      fetch(`/api/recipes/${recipeId}/steps/${stepA.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step_number: stepA.step_number, instruction: stepA.instruction, duration_mins: stepA.duration_mins, photo_url: stepA.photo_url || null }),
      }),
      fetch(`/api/recipes/${recipeId}/steps/${stepB.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step_number: stepB.step_number, instruction: stepB.instruction, duration_mins: stepB.duration_mins, photo_url: stepB.photo_url || null }),
      }),
    ])
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-900">Method</h2>
        <Button type="button" variant="secondary" size="sm" onClick={addStep} disabled={adding}>
          {adding ? 'Adding…' : '+ Add Step'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {steps.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          No method steps yet. Click &ldquo;+ Add Step&rdquo; to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200"
            >
              {/* Drag handle (visual only) */}
              <div className="flex flex-col items-center gap-1 pt-1 text-slate-300 select-none shrink-0">
                <span className="text-xs leading-none">⠿</span>
              </div>

              {/* Step number */}
              <div className="shrink-0 w-7 h-7 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                {step.step_number}
              </div>

              {/* Content */}
              <div className="flex-1 space-y-2 min-w-0">
                <textarea
                  placeholder="Describe this step…"
                  rows={2}
                  value={step.instruction}
                  onChange={(e) => updateLocalEdit(step.id, 'instruction', e.target.value)}
                  onBlur={() => saveStep(step)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none bg-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-500">Duration (mins)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 10"
                      value={step.duration_mins ?? ''}
                      onChange={(e) =>
                        updateLocalEdit(
                          step.id,
                          'duration_mins',
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      onBlur={() => saveStep(step)}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-500">Photo URL (optional)</label>
                    <input
                      type="url"
                      placeholder="https://…"
                      value={step.photo_url ?? ''}
                      onChange={(e) =>
                        updateLocalEdit(step.id, 'photo_url', e.target.value || null)
                      }
                      onBlur={() => saveStep(step)}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => moveStep(index, 'up')}
                  disabled={index === 0}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(index, 'down')}
                  disabled={index === steps.length - 1}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={() => deleteStep(step.id)}
                  className="p-1 text-red-400 hover:text-red-600"
                  title="Delete step"
                >
                  ✕
                </button>
                {savingIds.has(step.id) && (
                  <span className="text-xs text-slate-400 text-center">✓</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

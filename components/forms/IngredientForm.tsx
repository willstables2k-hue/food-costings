'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { ingredientSchema, type IngredientFormData } from '@/lib/validations/ingredient'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

const UNIT_OPTIONS = [
  { value: 'g', label: 'Grams (g)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'ml', label: 'Millilitres (ml)' },
  { value: 'L', label: 'Litres (L)' },
  { value: 'unit', label: 'Units (unit)' },
  { value: 'each', label: 'Each' },
  { value: 'dozen', label: 'Dozen' },
]

interface IngredientFormProps {
  defaultValues?: Partial<IngredientFormData>
  ingredientId?: number
}

export function IngredientForm({ defaultValues, ingredientId }: IngredientFormProps) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IngredientFormData>({
    resolver: zodResolver(ingredientSchema),
    defaultValues,
  })

  const onSubmit = async (data: IngredientFormData) => {
    const url = ingredientId ? `/api/ingredients/${ingredientId}` : '/api/ingredients'
    const method = ingredientId ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const ingredient = await res.json()
      router.push(`/ingredients/${ingredientId ?? ingredient.id}`)
      router.refresh()
    } else {
      const err = await res.json()
      alert(err.error ?? 'Failed to save ingredient')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <Input
        id="name"
        label="Name *"
        placeholder="e.g. Plain Flour"
        error={errors.name?.message}
        {...register('name')}
      />
      <Textarea
        id="description"
        label="Description"
        placeholder="Optional description..."
        {...register('description')}
      />
      <Select
        id="unit"
        label="Canonical unit *"
        placeholder="Select a unit..."
        options={UNIT_OPTIONS}
        error={errors.unit?.message}
        {...register('unit')}
      />
      <p className="text-xs text-slate-500">
        The canonical unit is how prices are stored. Invoice quantities can use different units (e.g. buy in kg, store price per g).
      </p>
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : ingredientId ? 'Update Ingredient' : 'Create Ingredient'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

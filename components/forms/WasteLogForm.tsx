'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { wasteLogSchema, WASTE_REASONS, type WasteLogFormData } from '@/lib/validations/waste'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

interface Item {
  id: number
  name: string
  unit: string
  current_price_per_unit?: number | null
}

interface RecipeItem {
  id: number
  name: string
  yield_unit: string
  cost_per_yield_unit?: number | null
}

interface WasteLogFormProps {
  ingredients: Item[]
  recipes: RecipeItem[]
  onSuccess: () => void
  onCancel: () => void
}

const UNIT_OPTIONS = [
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'L', label: 'L' },
  { value: 'unit', label: 'unit' },
  { value: 'each', label: 'each' },
  { value: 'dozen', label: 'dozen' },
]

export function WasteLogForm({ ingredients, recipes, onSuccess, onCancel }: WasteLogFormProps) {
  const [itemType, setItemType] = useState<'ingredient' | 'recipe'>('ingredient')
  const [search, setSearch] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(wasteLogSchema),
    defaultValues: {
      ingredient_id: null as number | null,
      recipe_id: null as number | null,
      quantity: undefined as unknown as number,
      unit: '',
      reason: '',
      notes: '',
    },
  })

  const selectedIngredientId = watch('ingredient_id')
  const selectedRecipeId = watch('recipe_id')
  const quantity = watch('quantity')

  const filteredIngredients = useMemo(() => {
    if (!search) return ingredients.slice(0, 20)
    const q = search.toLowerCase()
    return ingredients.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 20)
  }, [ingredients, search])

  const filteredRecipes = useMemo(() => {
    if (!search) return recipes.slice(0, 20)
    const q = search.toLowerCase()
    return recipes.filter((r) => r.name.toLowerCase().includes(q)).slice(0, 20)
  }, [recipes, search])

  const selectedItem = itemType === 'ingredient'
    ? ingredients.find((i) => i.id === selectedIngredientId)
    : recipes.find((r) => r.id === selectedRecipeId)

  // Auto-set unit when item is selected
  useEffect(() => {
    if (itemType === 'ingredient' && selectedIngredientId) {
      const ing = ingredients.find((i) => i.id === selectedIngredientId)
      if (ing) setValue('unit', ing.unit)
    } else if (itemType === 'recipe' && selectedRecipeId) {
      const rec = recipes.find((r) => r.id === selectedRecipeId)
      if (rec) setValue('unit', rec.yield_unit)
    }
  }, [selectedIngredientId, selectedRecipeId, itemType, ingredients, recipes, setValue])

  // Estimate cost in real-time
  const estimatedCost = useMemo(() => {
    if (!quantity || quantity <= 0 || !selectedItem) return null
    if (itemType === 'ingredient') {
      const ing = selectedItem as Item
      if (ing.current_price_per_unit == null) return null
      // Simple estimate — assumes same unit for display purposes
      return quantity * ing.current_price_per_unit
    } else {
      const rec = selectedItem as RecipeItem
      if (rec.cost_per_yield_unit == null) return null
      return quantity * rec.cost_per_yield_unit
    }
  }, [quantity, selectedItem, itemType])

  const selectItem = (id: number) => {
    if (itemType === 'ingredient') {
      setValue('ingredient_id', id, { shouldValidate: true })
      setValue('recipe_id', null)
    } else {
      setValue('recipe_id', id, { shouldValidate: true })
      setValue('ingredient_id', null)
    }
    setSearch('')
  }

  const switchType = (type: 'ingredient' | 'recipe') => {
    setItemType(type)
    setValue('ingredient_id', null)
    setValue('recipe_id', null)
    setValue('unit', '')
    setSearch('')
  }

  const onSubmit = async (data: WasteLogFormData) => {
    const res = await fetch('/api/waste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      onSuccess()
    } else {
      const err = await res.json()
      alert(err.error ?? 'Failed to log waste')
    }
  }

  const items = itemType === 'ingredient' ? filteredIngredients : filteredRecipes
  const selectedId = itemType === 'ingredient' ? selectedIngredientId : selectedRecipeId

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Item type toggle */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Waste type</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => switchType('ingredient')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              itemType === 'ingredient'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}
          >
            Ingredient
          </button>
          <button
            type="button"
            onClick={() => switchType('recipe')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              itemType === 'recipe'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}
          >
            Recipe
          </button>
        </div>
      </div>

      {/* Item search / selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {itemType === 'ingredient' ? 'Ingredient' : 'Recipe'} *
        </label>
        {selectedId ? (
          <div className="flex items-center justify-between px-3 py-2 border border-slate-300 rounded-lg bg-slate-50">
            <span className="text-sm text-slate-900 font-medium">{selectedItem?.name}</span>
            <button
              type="button"
              onClick={() => {
                if (itemType === 'ingredient') setValue('ingredient_id', null)
                else setValue('recipe_id', null)
                setValue('unit', '')
              }}
              className="text-xs text-slate-400 hover:text-red-500"
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${itemType}s...`}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white"
            />
            {items.length > 0 && (
              <div className="mt-1 max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectItem(item.id)}
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {item.name}
                    <span className="text-slate-400 ml-1.5 text-xs">
                      {'unit' in item ? item.unit : (item as RecipeItem).yield_unit}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {errors.ingredient_id && (
          <p className="text-xs text-red-600 mt-1">{errors.ingredient_id.message}</p>
        )}
      </div>

      {/* Quantity + unit */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          id="quantity"
          label="Quantity *"
          type="number"
          step="any"
          min="0"
          placeholder="e.g. 500"
          error={errors.quantity?.message}
          {...register('quantity', { valueAsNumber: true })}
        />
        <Select
          id="unit"
          label="Unit *"
          placeholder="Select unit..."
          options={UNIT_OPTIONS}
          error={errors.unit?.message}
          {...register('unit')}
        />
      </div>

      {/* Estimated cost */}
      {estimatedCost !== null && (
        <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            Estimated cost: <span className="font-semibold">£{estimatedCost.toFixed(2)}</span>
          </p>
        </div>
      )}

      {/* Reason */}
      <Select
        id="reason"
        label="Reason *"
        placeholder="Select reason..."
        options={WASTE_REASONS.map((r) => ({ value: r.value, label: r.label }))}
        error={errors.reason?.message}
        {...register('reason')}
      />

      {/* Notes */}
      <div className="space-y-1">
        <label htmlFor="notes" className="block text-sm font-medium text-slate-700">Notes</label>
        <textarea
          id="notes"
          rows={2}
          placeholder="Optional details..."
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white"
          {...register('notes')}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging…' : 'Log Waste'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { recipeSchema, type RecipeFormData } from '@/lib/validations/recipe'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface Ingredient { id: number; name: string; unit: string }
interface SubRecipe { id: number; name: string; yield_unit: string }

interface RecipeFormProps {
  ingredients: Ingredient[]
  subRecipes: SubRecipe[]
  defaultValues?: Partial<RecipeFormData>
  recipeId?: number
}

const UNIT_OPTIONS = [
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'L', label: 'L' },
  { value: 'unit', label: 'unit' },
  { value: 'each', label: 'each' },
  { value: 'tsp', label: 'tsp' },
  { value: 'tbsp', label: 'tbsp' },
  { value: 'cup', label: 'cup' },
  { value: 'oz', label: 'oz' },
  { value: 'lb', label: 'lb' },
]

export function RecipeForm({ ingredients, subRecipes, defaultValues, recipeId }: RecipeFormProps) {
  const router = useRouter()
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      is_sub_recipe: false,
      yield_quantity: 1,
      yield_unit: 'units',
      components: [],
      ...defaultValues,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'components' })

  const ingredientOptions = ingredients.map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` }))
  const subRecipeOptions = subRecipes
    .filter((r) => r.id !== recipeId)
    .map((r) => ({ value: r.id, label: `${r.name} (yields in ${r.yield_unit})` }))

  const onSubmit = async (data: RecipeFormData) => {
    const url = recipeId ? `/api/recipes/${recipeId}` : '/api/recipes'
    const method = recipeId ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        yield_quantity: Number(data.yield_quantity),
        components: data.components.map((c, i) => ({
          ingredient_id: c.ingredient_id ? Number(c.ingredient_id) : null,
          sub_recipe_id: c.sub_recipe_id ? Number(c.sub_recipe_id) : null,
          quantity: Number(c.quantity),
          unit: c.unit,
          sort_order: i,
        })),
      }),
    })
    if (res.ok) {
      const recipe = await res.json()
      router.push(`/recipes/${recipeId ?? recipe.id}`)
      router.refresh()
    } else {
      const err = await res.json()
      alert(err.error ?? 'Failed to save recipe')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Recipe Details</h2>
        <div className="space-y-4">
          <Input
            id="name"
            label="Recipe name *"
            placeholder="e.g. Sourdough Loaf"
            error={errors.name?.message}
            {...register('name')}
          />
          <Textarea
            id="description"
            label="Description"
            {...register('description')}
          />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_sub_recipe" {...register('is_sub_recipe')} className="rounded" />
            <label htmlFor="is_sub_recipe" className="text-sm text-slate-700 font-medium">
              This is a sub-recipe (used as component in other recipes)
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="yield_quantity"
              label="Yield quantity *"
              type="number"
              step="0.001"
              error={errors.yield_quantity?.message}
              {...register('yield_quantity', { valueAsNumber: true })}
            />
            <Select
              id="yield_unit"
              label="Yield unit *"
              options={UNIT_OPTIONS}
              error={errors.yield_unit?.message}
              {...register('yield_unit')}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Ingredients & Sub-recipes</h2>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => append({ ingredient_id: null, sub_recipe_id: null, quantity: 1, unit: 'g', sort_order: fields.length })}
            >
              + Ingredient
            </Button>
            {subRecipes.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => append({ ingredient_id: null, sub_recipe_id: 0, quantity: 1, unit: 'unit', sort_order: fields.length })}
              >
                + Sub-recipe
              </Button>
            )}
          </div>
        </div>

        {fields.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">No components yet. Add ingredients or sub-recipes above.</p>
        )}

        <div className="space-y-2">
          {fields.map((field, index) => {
            const isSubRecipe = watch(`components.${index}.sub_recipe_id`) !== null &&
                                watch(`components.${index}.sub_recipe_id`) !== undefined &&
                                !watch(`components.${index}.ingredient_id`)

            return (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start p-3 bg-slate-50 rounded-lg">
                <div className="col-span-5">
                  {isSubRecipe ? (
                    <Select
                      id={`components.${index}.sub_recipe_id`}
                      label={index === 0 ? 'Sub-recipe' : undefined}
                      placeholder="Select sub-recipe..."
                      options={subRecipeOptions}
                      {...register(`components.${index}.sub_recipe_id`, { valueAsNumber: true })}
                    />
                  ) : (
                    <Select
                      id={`components.${index}.ingredient_id`}
                      label={index === 0 ? 'Ingredient' : undefined}
                      placeholder="Select ingredient..."
                      options={ingredientOptions}
                      {...register(`components.${index}.ingredient_id`, { valueAsNumber: true })}
                    />
                  )}
                </div>
                <div className="col-span-3">
                  <Input
                    id={`components.${index}.quantity`}
                    label={index === 0 ? 'Quantity' : undefined}
                    type="number"
                    step="0.001"
                    placeholder="1"
                    {...register(`components.${index}.quantity`, { valueAsNumber: true })}
                  />
                </div>
                <div className="col-span-3">
                  <Select
                    id={`components.${index}.unit`}
                    label={index === 0 ? 'Unit' : undefined}
                    options={UNIT_OPTIONS}
                    {...register(`components.${index}.unit`)}
                  />
                </div>
                <div className={`col-span-1 ${index === 0 ? 'mt-6' : ''}`}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ✕
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : recipeId ? 'Update Recipe' : 'Create Recipe'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

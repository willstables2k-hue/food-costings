'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { productSchema, type ProductFormData } from '@/lib/validations/product'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface Recipe {
  id: number
  name: string
  is_sub_recipe: boolean
}

interface ProductFormProps {
  recipes: Recipe[]
  defaultValues?: Partial<ProductFormData>
  productId?: number
}

export function ProductForm({ recipes, defaultValues, productId }: ProductFormProps) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      is_active: true,
      ...defaultValues,
    },
  })

  const recipeOptions = recipes
    .filter((r) => !r.is_sub_recipe)
    .map((r) => ({ value: r.id, label: r.name }))

  const onSubmit = async (data: ProductFormData) => {
    const url = productId ? `/api/products/${productId}` : '/api/products'
    const method = productId ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        recipe_id: Number(data.recipe_id),
        wholesale_price: data.wholesale_price ? Number(data.wholesale_price) : null,
        retail_price: data.retail_price ? Number(data.retail_price) : null,
      }),
    })
    if (res.ok) {
      const product = await res.json()
      router.push(`/products/${productId ?? product.id}`)
      router.refresh()
    } else {
      const err = await res.json()
      alert(err.error ?? 'Failed to save product')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Product Details</h2>
        <div className="space-y-4">
          <Input
            id="name"
            label="Product name *"
            placeholder="e.g. Sourdough Loaf"
            error={errors.name?.message}
            {...register('name')}
          />
          <Textarea
            id="description"
            label="Description"
            {...register('description')}
          />
          <Select
            id="recipe_id"
            label="Recipe *"
            placeholder="Select a recipe..."
            options={recipeOptions}
            error={errors.recipe_id?.message}
            {...register('recipe_id', { valueAsNumber: true })}
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Pricing</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="wholesale_price"
              label="Wholesale price (£)"
              type="number"
              step="0.01"
              placeholder="0.00"
              error={errors.wholesale_price?.message}
              {...register('wholesale_price', { valueAsNumber: true })}
            />
            <Input
              id="retail_price"
              label="Retail price (£)"
              type="number"
              step="0.01"
              placeholder="0.00"
              error={errors.retail_price?.message}
              {...register('retail_price', { valueAsNumber: true })}
            />
          </div>
          <Input
            id="selling_unit"
            label="Unit"
            placeholder="e.g. per loaf, per 100g"
            {...register('selling_unit')}
          />
          <p className="text-xs text-slate-500">
            Leave prices blank if not yet known — you can update them later.
          </p>
        </div>
      </Card>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_active" {...register('is_active')} className="rounded" />
        <label htmlFor="is_active" className="text-sm text-slate-700">Active product</label>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : productId ? 'Update Product' : 'Create Product'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

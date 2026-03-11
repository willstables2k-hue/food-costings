'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { invoiceSchema, type InvoiceFormData } from '@/lib/validations/invoice'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface Supplier { id: number; name: string }
interface Ingredient { id: number; name: string; unit: string }

interface InvoiceFormProps {
  suppliers: Supplier[]
  ingredients: Ingredient[]
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

export function InvoiceForm({ suppliers, ingredients }: InvoiceFormProps) {
  const router = useRouter()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoice_date: new Date().toISOString().split('T')[0],
      line_items: [{ ingredient_id: 0, quantity: 1, purchase_unit: 'kg', total_cost: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'line_items' })

  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.name }))
  const ingredientOptions = ingredients.map((i) => ({ value: i.id, label: `${i.name} (per ${i.unit})` }))

  const onSubmit = async (data: InvoiceFormData) => {
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        supplier_id: Number(data.supplier_id),
        line_items: data.line_items.map((li) => ({
          ...li,
          ingredient_id: Number(li.ingredient_id),
          quantity: Number(li.quantity),
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
      alert(err.error ?? 'Failed to create invoice')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Invoice Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="supplier_id"
            label="Supplier *"
            placeholder="Select supplier..."
            options={supplierOptions}
            error={errors.supplier_id?.message}
            {...register('supplier_id', { valueAsNumber: true })}
          />
          <Input
            id="invoice_date"
            label="Invoice Date *"
            type="date"
            error={errors.invoice_date?.message}
            {...register('invoice_date')}
          />
          <Input
            id="reference"
            label="Reference / Invoice #"
            placeholder="INV-001"
            {...register('reference')}
          />
          <div className="col-span-2">
            <Textarea
              id="notes"
              label="Notes"
              {...register('notes')}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Line Items</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => append({ ingredient_id: 0, quantity: 1, purchase_unit: 'kg', total_cost: 0 })}
          >
            + Add Item
          </Button>
        </div>

        {typeof errors.line_items?.message === 'string' && (
          <p className="text-sm text-red-600 mb-3">{errors.line_items.message}</p>
        )}

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-start p-3 bg-slate-50 rounded-lg">
              <div className="col-span-4">
                <Select
                  id={`line_items.${index}.ingredient_id`}
                  label={index === 0 ? 'Ingredient' : undefined}
                  placeholder="Select..."
                  options={ingredientOptions}
                  error={errors.line_items?.[index]?.ingredient_id?.message}
                  {...register(`line_items.${index}.ingredient_id`, { valueAsNumber: true })}
                />
              </div>
              <div className="col-span-2">
                <Input
                  id={`line_items.${index}.quantity`}
                  label={index === 0 ? 'Qty' : undefined}
                  type="number"
                  step="0.001"
                  placeholder="1"
                  error={errors.line_items?.[index]?.quantity?.message}
                  {...register(`line_items.${index}.quantity`, { valueAsNumber: true })}
                />
              </div>
              <div className="col-span-2">
                <Select
                  id={`line_items.${index}.purchase_unit`}
                  label={index === 0 ? 'Unit' : undefined}
                  options={UNIT_OPTIONS}
                  {...register(`line_items.${index}.purchase_unit`)}
                />
              </div>
              <div className="col-span-3">
                <Input
                  id={`line_items.${index}.total_cost`}
                  label={index === 0 ? 'Total cost (£)' : undefined}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  error={errors.line_items?.[index]?.total_cost?.message}
                  {...register(`line_items.${index}.total_cost`, { valueAsNumber: true })}
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
          ))}
        </div>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving & processing…' : 'Create Invoice'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

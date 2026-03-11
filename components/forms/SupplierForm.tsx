'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { supplierSchema, type SupplierFormData } from '@/lib/validations/supplier'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'

interface SupplierFormProps {
  defaultValues?: Partial<SupplierFormData>
  supplierId?: number
}

export function SupplierForm({ defaultValues, supplierId }: SupplierFormProps) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues,
  })

  const onSubmit = async (data: SupplierFormData) => {
    const url = supplierId ? `/api/suppliers/${supplierId}` : '/api/suppliers'
    const method = supplierId ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const supplier = await res.json()
      router.push(`/suppliers/${supplierId ?? supplier.id}`)
      router.refresh()
    } else {
      const err = await res.json()
      alert(err.error ?? 'Failed to save supplier')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <Input
        id="name"
        label="Name *"
        placeholder="e.g. Sysco Foods Ltd"
        error={errors.name?.message}
        {...register('name')}
      />
      <Input
        id="contact"
        label="Contact name"
        placeholder="e.g. John Smith"
        {...register('contact')}
      />
      <Input
        id="email"
        label="Email"
        type="email"
        placeholder="orders@supplier.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        id="phone"
        label="Phone"
        placeholder="+44 1234 567890"
        {...register('phone')}
      />
      <Textarea
        id="notes"
        label="Notes"
        placeholder="Any additional notes..."
        {...register('notes')}
      />
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : supplierId ? 'Update Supplier' : 'Create Supplier'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

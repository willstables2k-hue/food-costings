import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { SupplierForm } from '@/components/forms/SupplierForm'

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supplier = await prisma.supplier.findUnique({ where: { id: parseInt(id) } })
  if (!supplier) notFound()

  return (
    <div>
      <PageHeader title={`Edit ${supplier.name}`} />
      <SupplierForm
        supplierId={supplier.id}
        defaultValues={{
          name: supplier.name,
          contact: supplier.contact ?? undefined,
          email: supplier.email ?? undefined,
          phone: supplier.phone ?? undefined,
          notes: supplier.notes ?? undefined,
        }}
      />
    </div>
  )
}

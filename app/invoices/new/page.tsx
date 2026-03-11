import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { InvoiceForm } from '@/components/forms/InvoiceForm'

export default async function NewInvoicePage() {
  const [suppliers, ingredients] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: 'asc' } }),
    prisma.ingredient.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <div>
      <PageHeader title="New Invoice" />
      <InvoiceForm suppliers={suppliers} ingredients={ingredients} />
    </div>
  )
}

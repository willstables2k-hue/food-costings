import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { InvoiceEntryToggle } from '@/components/forms/InvoiceEntryToggle'

export default async function NewInvoicePage() {
  const [suppliers, ingredients] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: 'asc' } }),
    prisma.ingredient.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <div>
      <PageHeader title="New Invoice" />
      <InvoiceEntryToggle suppliers={suppliers} ingredients={ingredients} />
    </div>
  )
}

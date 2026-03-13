import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { PurchaseOrderForm } from '@/components/purchase-orders/PurchaseOrderForm'

export default async function NewPurchaseOrderPage() {
  const [suppliers, ingredients] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.ingredient.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, unit: true } }),
  ])

  return (
    <div>
      <PageHeader
        title="New Purchase Order"
        description="Create an order for supplier stock replenishment"
      />
      <PurchaseOrderForm suppliers={suppliers} ingredients={ingredients} />
    </div>
  )
}

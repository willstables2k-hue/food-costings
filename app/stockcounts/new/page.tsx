import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { StockCountForm } from '@/components/stockcount/StockCountForm'

export default async function NewStockCountPage() {
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, unit: true, current_price_per_unit: true },
  })

  return (
    <div>
      <PageHeader
        title="New Stock Count"
        description="Enter quantities from a physical stocktake"
      />
      <StockCountForm ingredients={ingredients} />
    </div>
  )
}

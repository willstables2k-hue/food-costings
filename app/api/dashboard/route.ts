import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateRecipeCost } from '@/lib/cost-calculator'

export async function GET() {
  const products = await prisma.product.findMany({
    where: { is_active: true },
    include: {
      recipe: true,
      cost_snapshots: {
        orderBy: { snapshotted_at: 'desc' },
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
  })

  const result = await Promise.all(
    products.map(async (product) => {
      let cost = null
      let margin = null
      try {
        const breakdown = await calculateRecipeCost(product.recipe_id, prisma)
        cost = breakdown.cost_per_yield_unit
        if (product.selling_price && cost > 0) {
          margin = ((product.selling_price - cost) / product.selling_price) * 100
        }
      } catch {
        // no cost available
      }

      return {
        id: product.id,
        name: product.name,
        recipe_name: product.recipe.name,
        selling_price: product.selling_price,
        selling_unit: product.selling_unit,
        cost_per_unit: cost,
        margin_percent: margin,
        last_snapshot: product.cost_snapshots[0] ?? null,
        is_active: product.is_active,
      }
    })
  )

  return NextResponse.json(result)
}

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
    products.map(async (product: typeof products[number]) => {
      let cost_per_unit: number | null = null
      let wholesale_margin: number | null = null
      let retail_margin: number | null = null
      try {
        const breakdown = await calculateRecipeCost(product.recipe_id, prisma)
        cost_per_unit = breakdown.cost_per_yield_unit
        if (product.wholesale_price && cost_per_unit > 0) {
          wholesale_margin = ((product.wholesale_price - cost_per_unit) / product.wholesale_price) * 100
        }
        if (product.retail_price && cost_per_unit > 0) {
          retail_margin = ((product.retail_price - cost_per_unit) / product.retail_price) * 100
        }
      } catch {
        // no cost available yet
      }

      return {
        id: product.id,
        name: product.name,
        recipe_name: product.recipe.name,
        selling_unit: product.selling_unit,
        cost_per_unit,
        wholesale_price: product.wholesale_price,
        retail_price: product.retail_price,
        wholesale_margin,
        retail_margin,
        is_active: product.is_active,
      }
    })
  )

  return NextResponse.json(result)
}

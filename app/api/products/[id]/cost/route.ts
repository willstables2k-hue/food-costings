import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateRecipeCost } from '@/lib/cost-calculator'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      select: { recipe_id: true, wholesale_price: true, retail_price: true, selling_unit: true },
    })
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const breakdown = await calculateRecipeCost(product.recipe_id, prisma)
    const cost = breakdown.cost_per_yield_unit

    const wholesale_margin = product.wholesale_price && cost > 0
      ? ((product.wholesale_price - cost) / product.wholesale_price) * 100
      : null
    const retail_margin = product.retail_price && cost > 0
      ? ((product.retail_price - cost) / product.retail_price) * 100
      : null

    return NextResponse.json({
      ...breakdown,
      wholesale_price: product.wholesale_price,
      retail_price: product.retail_price,
      selling_unit: product.selling_unit,
      wholesale_margin,
      retail_margin,
    })
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to calculate cost' }, { status: 500 })
  }
}

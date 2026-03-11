import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateRecipeCost } from '@/lib/cost-calculator'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      select: { recipe_id: true, selling_price: true, selling_unit: true },
    })
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const breakdown = await calculateRecipeCost(product.recipe_id, prisma)
    const margin = product.selling_price
      ? ((product.selling_price - breakdown.cost_per_yield_unit) / product.selling_price) * 100
      : null

    return NextResponse.json({
      ...breakdown,
      selling_price: product.selling_price,
      selling_unit: product.selling_unit,
      margin_percent: margin,
    })
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to calculate cost' }, { status: 500 })
  }
}

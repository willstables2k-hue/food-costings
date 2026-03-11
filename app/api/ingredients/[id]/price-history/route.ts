import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const history = await prisma.ingredientPriceHistory.findMany({
    where: { ingredient_id: parseInt(id) },
    orderBy: { recorded_at: 'asc' },
    include: {
      invoice: { select: { id: true, reference: true, invoice_date: true } },
    },
  })
  return NextResponse.json(history)
}

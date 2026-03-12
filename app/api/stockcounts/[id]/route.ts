import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getConversionFactor } from '@/lib/unit-converter'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  notes: z.string().optional(),
})

function calcLineValue(
  counted_quantity: number,
  countUnit: string,
  ingredient: { current_price_per_unit: number | null; unit: string }
): number {
  if (ingredient.current_price_per_unit === null) return 0
  let factor = 1
  try { factor = getConversionFactor(countUnit, ingredient.unit) } catch { /* incompatible units */ }
  return counted_quantity * factor * ingredient.current_price_per_unit
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const count = await prisma.stockCount.findUnique({
    where: { id: parseInt(id) },
    include: {
      lines: {
        include: { ingredient: true },
        orderBy: { ingredient: { name: 'asc' } },
      },
    },
  })
  if (!count) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const linesWithValue = count.lines.map((l) => ({
    ...l,
    line_value: calcLineValue(l.counted_quantity, l.unit, l.ingredient),
  }))
  const total_value = linesWithValue.reduce((s, l) => s + l.line_value, 0)

  return NextResponse.json({ ...count, lines: linesWithValue, total_value })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const data = updateSchema.parse(body)
    const count = await prisma.stockCount.update({ where: { id: parseInt(id) }, data })
    return NextResponse.json(count)
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update stock count' }, { status: 500 })
  }
}

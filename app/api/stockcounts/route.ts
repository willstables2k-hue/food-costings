import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getConversionFactor } from '@/lib/unit-converter'

const lineSchema = z.object({
  ingredient_id: z.number().int().positive(),
  counted_quantity: z.number().nonnegative(),
  unit: z.string().min(1),
})

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  counted_at: z.string(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1, 'At least one line is required'),
})

function calcTotalValue(
  lines: { counted_quantity: number; unit: string; ingredient: { current_price_per_unit: number | null; unit: string } }[]
): number {
  return lines.reduce((sum, line) => {
    if (line.ingredient.current_price_per_unit === null) return sum
    let factor = 1
    try { factor = getConversionFactor(line.unit, line.ingredient.unit) } catch { /* incompatible units */ }
    return sum + line.counted_quantity * factor * line.ingredient.current_price_per_unit
  }, 0)
}

export async function GET() {
  const counts = await prisma.stockCount.findMany({
    orderBy: { counted_at: 'desc' },
    include: {
      lines: {
        include: { ingredient: { select: { current_price_per_unit: true, unit: true } } },
      },
      _count: { select: { lines: true } },
    },
  })

  const result = counts.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    counted_at: c.counted_at,
    notes: c.notes,
    line_count: c._count.lines,
    total_value: calcTotalValue(c.lines),
  }))

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    const count = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.stockCount.create({
        data: {
          name: data.name,
          counted_at: new Date(data.counted_at),
          notes: data.notes,
          lines: {
            create: data.lines.map((l) => ({
              ingredient_id: l.ingredient_id,
              counted_quantity: l.counted_quantity,
              unit: l.unit,
            })),
          },
        },
      })
      return created
    })

    return NextResponse.json(count, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create stock count' }, { status: 500 })
  }
}

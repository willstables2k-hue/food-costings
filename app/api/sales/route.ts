import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const salesEntrySchema = z.object({
  period_date: z.string().min(1, 'Period date is required'),
  entries: z.array(
    z.object({
      product_id: z.number().int().positive(),
      quantity: z.number().positive(),
    })
  ).min(1, 'At least one entry is required'),
})

export async function GET() {
  const entries = await prisma.salesEntry.findMany({
    orderBy: { period_date: 'desc' },
    include: {
      product: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(entries)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { period_date, entries } = salesEntrySchema.parse(body)

    const date = new Date(period_date)
    const created = await prisma.$transaction(
      entries.map((e) =>
        prisma.salesEntry.create({
          data: {
            product_id: e.product_id,
            quantity: e.quantity,
            period_date: date,
          },
        })
      )
    )

    return NextResponse.json({ count: created.length }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to save sales entries' }, { status: 500 })
  }
}

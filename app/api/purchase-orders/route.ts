import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { purchaseOrderSchema } from '@/lib/validations/purchaseOrder'

export async function GET() {
  const orders = await prisma.purchaseOrder.findMany({
    orderBy: { created_at: 'desc' },
    include: {
      supplier: { select: { id: true, name: true } },
      _count: { select: { lines: true } },
      lines: { select: { quantity: true, unit_price: true } },
    },
  })

  const result = orders.map((o) => ({
    id: o.id,
    supplier: o.supplier,
    status: o.status,
    expected_delivery: o.expected_delivery,
    notes: o.notes,
    created_at: o.created_at,
    line_count: o._count.lines,
    estimated_total: o.lines.reduce(
      (sum, l) => sum + (l.unit_price != null ? l.quantity * l.unit_price : 0),
      0
    ),
  }))

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = purchaseOrderSchema.parse(body)

    const order = await prisma.purchaseOrder.create({
      data: {
        supplier_id: data.supplier_id,
        expected_delivery: data.expected_delivery ? new Date(data.expected_delivery) : null,
        notes: data.notes,
        lines: {
          create: data.lines.map((l) => ({
            ingredient_id: l.ingredient_id,
            quantity: l.quantity,
            unit: l.unit,
            unit_price: l.unit_price ?? null,
          })),
        },
      },
      include: { supplier: true, lines: { include: { ingredient: true } } },
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create purchase order' }, { status: 500 })
  }
}

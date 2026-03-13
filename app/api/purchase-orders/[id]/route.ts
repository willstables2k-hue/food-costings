import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updatePurchaseOrderSchema } from '@/lib/validations/purchaseOrder'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: parseInt(id) },
    include: {
      supplier: true,
      lines: {
        include: { ingredient: { select: { id: true, name: true, unit: true } } },
        orderBy: { id: 'asc' },
      },
    },
  })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(order)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const data = updatePurchaseOrderSchema.parse(body)

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.purchaseOrder.update({
        where: { id: parseInt(id) },
        data: {
          expected_delivery: data.expected_delivery
            ? new Date(data.expected_delivery)
            : data.expected_delivery === null ? null : undefined,
          notes: data.notes,
        },
      })

      if (data.lines) {
        await tx.purchaseOrderLine.deleteMany({ where: { purchase_order_id: parseInt(id) } })
        await tx.purchaseOrderLine.createMany({
          data: data.lines.map((l) => ({
            purchase_order_id: parseInt(id),
            ingredient_id: l.ingredient_id,
            quantity: l.quantity,
            unit: l.unit,
            unit_price: l.unit_price ?? null,
          })),
        })
      }

      return updated
    })

    return NextResponse.json(order)
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update purchase order' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft:      ['sent', 'cancelled'],
  sent:       ['received', 'cancelled'],
  received:   [],
  cancelled:  [],
}

const bodySchema = z.object({
  status: z.enum(['draft', 'sent', 'received', 'cancelled']),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const { status: newStatus } = bodySchema.parse(body)

    const order = await prisma.purchaseOrder.findUnique({ where: { id: parseInt(id) } })
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const allowed = VALID_TRANSITIONS[order.status] ?? []
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from '${order.status}' to '${newStatus}'` },
        { status: 400 }
      )
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: parseInt(id) },
      data: { status: newStatus },
    })
    return NextResponse.json(updated)
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processInvoice } from '@/lib/invoice-processor'
import { getConversionFactor } from '@/lib/unit-converter'
import { z } from 'zod'

const bodySchema = z.object({
  invoice_date: z.string().min(1, 'Invoice date is required'),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const { invoice_date } = bodySchema.parse(body)

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: parseInt(id) },
      include: {
        lines: {
          include: { ingredient: { select: { id: true, unit: true, current_price_per_unit: true } } },
        },
      },
    })

    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (order.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot convert a cancelled order' }, { status: 400 })
    }

    // Build invoice line items from PO lines.
    // unit_price is per canonical unit (ingredient.unit).
    // total_cost = quantity (in PO unit) converted to canonical unit * unit_price.
    // If unit_price is null, fall back to ingredient.current_price_per_unit.
    const lineItems = []
    for (const line of order.lines) {
      const pricePerCanonical =
        line.unit_price ??
        line.ingredient.current_price_per_unit

      if (pricePerCanonical === null || pricePerCanonical === 0) continue // skip unpriced lines

      let toCanonical = 1
      try {
        toCanonical = getConversionFactor(line.unit, line.ingredient.unit)
      } catch { /* incompatible — treat as 1:1 */ }

      const quantityInCanonical = line.quantity * toCanonical
      const totalCost = quantityInCanonical * pricePerCanonical

      lineItems.push({
        ingredient_id: line.ingredient_id,
        quantity: line.quantity,
        purchase_unit: line.unit,
        total_cost: totalCost,
      })
    }

    if (lineItems.length === 0) {
      return NextResponse.json(
        { error: 'No priced lines to convert. Add unit prices to at least one PO line.' },
        { status: 400 }
      )
    }

    // Mark as received (if not already)
    if (order.status !== 'received') {
      await prisma.purchaseOrder.update({
        where: { id: parseInt(id) },
        data: { status: 'received' },
      })
    }

    const result = await processInvoice(
      {
        supplier_id: order.supplier_id,
        invoice_date: new Date(invoice_date),
        reference: `PO-${order.id}`,
        notes: `Auto-created from Purchase Order #${order.id}`,
        line_items: lineItems,
      },
      prisma
    )

    return NextResponse.json({
      invoice_id: result.invoice.id,
      affected_products: result.affected_products,
      snapshots_created: result.snapshots_created,
      lines_converted: lineItems.length,
      lines_skipped: order.lines.length - lineItems.length,
    })
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to convert to invoice' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processInvoice } from '@/lib/invoice-processor'
import { invoiceSchema } from '@/lib/validations/invoice'

export async function GET() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { invoice_date: 'desc' },
    include: {
      supplier: true,
      _count: { select: { line_items: true } },
    },
  })
  return NextResponse.json(invoices)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = invoiceSchema.parse(body)

    const result = await processInvoice(
      {
        supplier_id: data.supplier_id,
        invoice_date: new Date(data.invoice_date),
        reference: data.reference,
        notes: data.notes,
        line_items: data.line_items,
      },
      prisma
    )

    return NextResponse.json(result, { status: 201 })
  } catch (error: unknown) {
    console.error('Invoice creation error:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }
}

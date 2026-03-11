import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await prisma.invoice.findUnique({
    where: { id: parseInt(id) },
    include: {
      supplier: true,
      line_items: {
        include: { ingredient: true },
        orderBy: { id: 'asc' },
      },
      price_history: {
        include: { ingredient: true },
      },
    },
  })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Find snapshots triggered by this invoice
  const snapshots = await prisma.costSnapshot.findMany({
    where: { triggered_by_invoice_id: parseInt(id) },
    include: { product: true },
    orderBy: { snapshotted_at: 'desc' },
  })

  return NextResponse.json({ ...invoice, triggered_snapshots: snapshots })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await prisma.invoice.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 })
  }
}

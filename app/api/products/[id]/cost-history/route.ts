import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const snapshots = await prisma.costSnapshot.findMany({
    where: { product_id: parseInt(id) },
    orderBy: { snapshotted_at: 'asc' },
    select: {
      id: true,
      total_cost: true,
      snapshotted_at: true,
      triggered_by_invoice_id: true,
    },
  })
  return NextResponse.json(snapshots)
}

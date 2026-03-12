import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const count = await prisma.stockCount.findUnique({ where: { id: parseInt(id) } })
    if (!count) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (count.status === 'submitted') {
      return NextResponse.json({ error: 'Count is already submitted' }, { status: 400 })
    }
    const updated = await prisma.stockCount.update({
      where: { id: parseInt(id) },
      data: { status: 'submitted' },
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed to submit count' }, { status: 500 })
  }
}

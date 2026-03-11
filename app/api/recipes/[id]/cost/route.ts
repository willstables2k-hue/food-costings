import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateRecipeCost } from '@/lib/cost-calculator'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const breakdown = await calculateRecipeCost(parseInt(id), prisma)
    return NextResponse.json(breakdown)
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to calculate cost' }, { status: 500 })
  }
}

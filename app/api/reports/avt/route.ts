import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateAvT } from '@/lib/avt-calculator'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fromStr = searchParams.get('from')
  const toStr = searchParams.get('to')

  if (!fromStr || !toStr) {
    return NextResponse.json({ error: 'from and to query params are required' }, { status: 400 })
  }

  const from = new Date(fromStr)
  const to = new Date(toStr)
  // Extend `to` to end of the selected day
  to.setHours(23, 59, 59, 999)

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
  }
  if (from >= to) {
    return NextResponse.json({ error: '"from" must be before "to"' }, { status: 400 })
  }

  try {
    const result = await calculateAvT(from, to, prisma)
    return NextResponse.json({
      ...result,
      from: result.from.toISOString(),
      to: result.to.toISOString(),
      opening_count_date: result.opening_count_date?.toISOString() ?? null,
      closing_count_date: result.closing_count_date?.toISOString() ?? null,
    })
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: 'Failed to calculate AvT report' }, { status: 500 })
  }
}

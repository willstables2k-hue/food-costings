import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generatePOLines } from '@/lib/po-generator'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const supplierIdStr = searchParams.get('supplier_id')

  if (!supplierIdStr) {
    return NextResponse.json({ error: 'supplier_id is required' }, { status: 400 })
  }

  const supplierId = parseInt(supplierIdStr)
  if (isNaN(supplierId)) {
    return NextResponse.json({ error: 'Invalid supplier_id' }, { status: 400 })
  }

  try {
    const suggestions = await generatePOLines(supplierId, prisma)
    return NextResponse.json(suggestions)
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }
}

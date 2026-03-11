import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supplierSchema } from '@/lib/validations/supplier'

export async function GET() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { invoices: true } } },
  })
  return NextResponse.json(suppliers)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = supplierSchema.parse(body)
    const supplier = await prisma.supplier.create({ data })
    return NextResponse.json(supplier, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && error.constructor.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: (error as unknown as { errors: unknown }).errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
  }
}

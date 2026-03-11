import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { productSchema } from '@/lib/validations/product'

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    include: {
      recipe: true,
      cost_snapshots: {
        orderBy: { snapshotted_at: 'desc' },
        take: 1,
      },
    },
  })
  return NextResponse.json(products)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = productSchema.parse(body)
    const product = await prisma.product.create({
      data,
      include: { recipe: true },
    })
    return NextResponse.json(product, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}

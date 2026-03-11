import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ingredientSchema } from '@/lib/validations/ingredient'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ingredient = await prisma.ingredient.findUnique({
    where: { id: parseInt(id) },
    include: {
      price_history: {
        orderBy: { recorded_at: 'desc' },
        take: 50,
        include: { invoice: { select: { id: true, reference: true, invoice_date: true } } },
      },
      _count: { select: { recipe_components: true } },
    },
  })
  if (!ingredient) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(ingredient)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const data = ingredientSchema.parse(body)
    const ingredient = await prisma.ingredient.update({ where: { id: parseInt(id) }, data })
    return NextResponse.json(ingredient)
  } catch {
    return NextResponse.json({ error: 'Failed to update ingredient' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await prisma.ingredient.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Cannot delete ingredient — it may be in use' }, { status: 400 })
  }
}

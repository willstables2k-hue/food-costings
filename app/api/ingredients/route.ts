import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ingredientSchema } from '@/lib/validations/ingredient'

export async function GET() {
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(ingredients)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = ingredientSchema.parse(body)
    const ingredient = await prisma.ingredient.create({ data })
    return NextResponse.json(ingredient, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create ingredient' }, { status: 500 })
  }
}

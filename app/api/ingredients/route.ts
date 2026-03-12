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
    const { allergen_ids, ...data } = ingredientSchema.parse(body)

    const ingredient = await prisma.$transaction(async (tx) => {
      const created = await tx.ingredient.create({ data })

      if (allergen_ids.length > 0) {
        await tx.ingredientAllergen.createMany({
          data: allergen_ids.map((allergen_id) => ({
            ingredient_id: created.id,
            allergen_id,
          })),
        })
      }

      return tx.ingredient.findUnique({
        where: { id: created.id },
        include: { allergens: { include: { allergen: true } } },
      })
    })

    return NextResponse.json(ingredient, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create ingredient' }, { status: 500 })
  }
}

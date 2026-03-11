import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recipeSchema } from '@/lib/validations/recipe'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  const where = type === 'sub'
    ? { is_sub_recipe: true }
    : type === 'product'
    ? { is_sub_recipe: false }
    : {}

  const recipes = await prisma.recipe.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { components: true } },
      product: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(recipes)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = recipeSchema.parse(body)
    const { components, ...recipeData } = data

    const recipe = await prisma.recipe.create({
      data: {
        ...recipeData,
        components: {
          create: components.map((c, i) => ({
            ingredient_id: c.ingredient_id ?? null,
            sub_recipe_id: c.sub_recipe_id ?? null,
            quantity: c.quantity,
            unit: c.unit,
            sort_order: c.sort_order ?? i,
          })),
        },
      },
      include: {
        components: {
          include: { ingredient: true, sub_recipe: true },
          orderBy: { sort_order: 'asc' },
        },
      },
    })
    return NextResponse.json(recipe, { status: 201 })
  } catch (error: unknown) {
    console.error('Recipe creation error:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create recipe' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recipeSchema } from '@/lib/validations/recipe'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const recipe = await prisma.recipe.findUnique({
    where: { id: parseInt(id) },
    include: {
      components: {
        include: { ingredient: true, sub_recipe: true },
        orderBy: { sort_order: 'asc' },
      },
      product: true,
    },
  })
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(recipe)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const data = recipeSchema.parse(body)
    const { components, ...recipeData } = data

    // Delete existing components and recreate
    await prisma.recipeComponent.deleteMany({ where: { recipe_id: parseInt(id) } })

    const recipe = await prisma.recipe.update({
      where: { id: parseInt(id) },
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
    return NextResponse.json(recipe)
  } catch (error: unknown) {
    console.error('Recipe update error:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await prisma.recipe.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Cannot delete recipe — it may be in use' }, { status: 400 })
  }
}

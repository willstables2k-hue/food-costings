import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { RecipeForm } from '@/components/forms/RecipeForm'

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [recipe, ingredients, subRecipes] = await Promise.all([
    prisma.recipe.findUnique({
      where: { id: parseInt(id) },
      include: {
        components: {
          orderBy: { sort_order: 'asc' },
        },
      },
    }),
    prisma.ingredient.findMany({ orderBy: { name: 'asc' } }),
    prisma.recipe.findMany({ where: { is_sub_recipe: true }, orderBy: { name: 'asc' } }),
  ])
  if (!recipe) notFound()

  return (
    <div>
      <PageHeader title={`Edit ${recipe.name}`} />
      <RecipeForm
        recipeId={recipe.id}
        ingredients={ingredients}
        subRecipes={subRecipes}
        defaultValues={{
          name: recipe.name,
          description: recipe.description ?? undefined,
          is_sub_recipe: recipe.is_sub_recipe,
          yield_quantity: recipe.yield_quantity,
          yield_unit: recipe.yield_unit,
          components: recipe.components.map((c) => ({
            ingredient_id: c.ingredient_id ?? null,
            sub_recipe_id: c.sub_recipe_id ?? null,
            quantity: c.quantity,
            unit: c.unit,
            sort_order: c.sort_order,
          })),
        }}
      />
    </div>
  )
}

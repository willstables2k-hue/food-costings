import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { RecipeForm } from '@/components/forms/RecipeForm'

export default async function NewRecipePage() {
  const [ingredients, subRecipes] = await Promise.all([
    prisma.ingredient.findMany({ orderBy: { name: 'asc' } }),
    prisma.recipe.findMany({ where: { is_sub_recipe: true }, orderBy: { name: 'asc' } }),
  ])

  return (
    <div>
      <PageHeader title="New Recipe" />
      <RecipeForm ingredients={ingredients} subRecipes={subRecipes} />
    </div>
  )
}

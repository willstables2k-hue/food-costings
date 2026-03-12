import type { PrismaClient } from '@prisma/client'

export async function calculateRecipeAllergens(
  recipeId: number,
  prisma: PrismaClient,
  visited: Set<number> = new Set()
): Promise<Set<string>> {
  if (visited.has(recipeId)) {
    return new Set()
  }

  const newVisited = new Set(visited)
  newVisited.add(recipeId)

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      components: {
        include: {
          ingredient: {
            include: {
              allergens: {
                include: { allergen: true },
              },
            },
          },
          sub_recipe: true,
        },
      },
    },
  })

  if (!recipe) throw new Error(`Recipe not found: ${recipeId}`)

  const allergenKeys = new Set<string>()

  for (const component of recipe.components) {
    if (component.ingredient_id && component.ingredient) {
      for (const ia of component.ingredient.allergens) {
        allergenKeys.add(ia.allergen.key)
      }
    } else if (component.sub_recipe_id && component.sub_recipe) {
      const subAllergens = await calculateRecipeAllergens(
        component.sub_recipe.id,
        prisma,
        newVisited
      )
      for (const key of subAllergens) {
        allergenKeys.add(key)
      }
    }
  }

  return allergenKeys
}

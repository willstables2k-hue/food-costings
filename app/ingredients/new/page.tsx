import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { IngredientForm } from '@/components/forms/IngredientForm'

export default async function NewIngredientPage() {
  const allergens = await prisma.allergen.findMany({ orderBy: { display_name: 'asc' } })

  return (
    <div>
      <PageHeader title="New Ingredient" />
      <IngredientForm allergens={allergens} />
    </div>
  )
}

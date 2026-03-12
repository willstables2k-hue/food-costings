import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { IngredientForm } from '@/components/forms/IngredientForm'

export default async function EditIngredientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [ingredient, allergens] = await Promise.all([
    prisma.ingredient.findUnique({
      where: { id: parseInt(id) },
      include: { allergens: { select: { allergen_id: true } } },
    }),
    prisma.allergen.findMany({ orderBy: { display_name: 'asc' } }),
  ])
  if (!ingredient) notFound()

  return (
    <div>
      <PageHeader title={`Edit ${ingredient.name}`} />
      <IngredientForm
        ingredientId={ingredient.id}
        allergens={allergens}
        defaultValues={{
          name: ingredient.name,
          description: ingredient.description ?? undefined,
          unit: ingredient.unit,
          yield_percentage: ingredient.yield_percentage ?? 100,
          prep_loss_notes: ingredient.prep_loss_notes ?? undefined,
          allergen_ids: ingredient.allergens.map((a) => a.allergen_id),
          par_level: ingredient.par_level ?? undefined,
          par_unit: ingredient.par_unit ?? undefined,
        }}
      />
    </div>
  )
}

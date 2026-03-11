import { PageHeader } from '@/components/layout/PageHeader'
import { IngredientForm } from '@/components/forms/IngredientForm'

export default function NewIngredientPage() {
  return (
    <div>
      <PageHeader title="New Ingredient" />
      <IngredientForm />
    </div>
  )
}

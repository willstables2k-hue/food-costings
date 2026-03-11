import { z } from 'zod'

export const ingredientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
})

export type IngredientFormData = z.infer<typeof ingredientSchema>

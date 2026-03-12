import { z } from 'zod'

export const ingredientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  yield_percentage: z
    .number()
    .min(0, 'Must be 0 or above')
    .max(100, 'Must be 100 or below')
    .default(100),
  prep_loss_notes: z.string().optional(),
})

export type IngredientFormData = z.infer<typeof ingredientSchema>

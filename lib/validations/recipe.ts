import { z } from 'zod'

export const recipeComponentSchema = z.object({
  ingredient_id: z.number().int().positive().optional().nullable(),
  sub_recipe_id: z.number().int().positive().optional().nullable(),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  sort_order: z.number().int().default(0),
})

export const recipeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  is_sub_recipe: z.boolean().default(false),
  yield_quantity: z.number().positive('Yield quantity must be positive').default(1),
  yield_unit: z.string().min(1, 'Yield unit is required').default('units'),
  components: z.array(recipeComponentSchema).default([]),
})

export type RecipeFormData = z.infer<typeof recipeSchema>

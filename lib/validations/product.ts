import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  recipe_id: z.number().int().positive('Select a recipe'),
  wholesale_price: z.number().positive('Must be positive').optional().nullable(),
  retail_price: z.number().positive('Must be positive').optional().nullable(),
  selling_unit: z.string().optional(),
  is_active: z.boolean().default(true),
})

export type ProductFormData = z.infer<typeof productSchema>

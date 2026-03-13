import { z } from 'zod'

export const WASTE_REASONS = [
  { value: 'spoilage', label: 'Spoilage' },
  { value: 'overproduction', label: 'Overproduction' },
  { value: 'dropped', label: 'Dropped / Accident' },
  { value: 'expired', label: 'Expired' },
  { value: 'trim', label: 'Trim / Prep Loss' },
  { value: 'staff_meal', label: 'Staff Meal' },
  { value: 'comp', label: 'Comp / Void' },
  { value: 'other', label: 'Other' },
] as const

export const wasteLogSchema = z
  .object({
    ingredient_id: z.number().int().positive().nullable().optional(),
    recipe_id: z.number().int().positive().nullable().optional(),
    quantity: z.number().positive('Quantity must be positive'),
    unit: z.string().min(1, 'Unit is required'),
    reason: z.string().min(1, 'Reason is required'),
    notes: z.string().optional(),
  })
  .refine((d) => d.ingredient_id || d.recipe_id, {
    message: 'Select an ingredient or recipe',
    path: ['ingredient_id'],
  })

export type WasteLogFormData = z.infer<typeof wasteLogSchema>

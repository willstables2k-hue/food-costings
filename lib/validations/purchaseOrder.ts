import { z } from 'zod'

export const poLineSchema = z.object({
  ingredient_id: z.number().int().positive('Select an ingredient'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  unit_price: z.number().positive().nullable().optional(),
})

export const purchaseOrderSchema = z.object({
  supplier_id: z.number().int().positive('Select a supplier'),
  expected_delivery: z.string().nullable().optional(),
  notes: z.string().optional(),
  lines: z.array(poLineSchema).min(1, 'Add at least one line item'),
})

export const updatePurchaseOrderSchema = z.object({
  expected_delivery: z.string().nullable().optional(),
  notes: z.string().optional(),
  lines: z.array(poLineSchema).optional(),
})

export type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>

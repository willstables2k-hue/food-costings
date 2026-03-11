import { z } from 'zod'

export const invoiceLineItemSchema = z.object({
  ingredient_id: z.number().int().positive('Select an ingredient'),
  quantity: z.number().positive('Quantity must be positive'),
  purchase_unit: z.string().min(1, 'Unit is required'),
  total_cost: z.number().positive('Cost must be positive'),
})

export const invoiceSchema = z.object({
  supplier_id: z.number().int().positive('Select a supplier'),
  invoice_date: z.string().min(1, 'Date is required'),
  reference: z.string().optional(),
  notes: z.string().optional(),
  line_items: z.array(invoiceLineItemSchema).min(1, 'Add at least one line item'),
})

export type InvoiceFormData = z.infer<typeof invoiceSchema>

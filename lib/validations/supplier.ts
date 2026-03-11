import { z } from 'zod'

export const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contact: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
})

export type SupplierFormData = z.infer<typeof supplierSchema>

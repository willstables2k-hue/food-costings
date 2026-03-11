import { PageHeader } from '@/components/layout/PageHeader'
import { SupplierForm } from '@/components/forms/SupplierForm'

export default function NewSupplierPage() {
  return (
    <div>
      <PageHeader title="New Supplier" />
      <SupplierForm />
    </div>
  )
}

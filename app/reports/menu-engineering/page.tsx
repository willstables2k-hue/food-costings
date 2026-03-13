import { PageHeader } from '@/components/layout/PageHeader'
import { MenuEngineeringReport } from '@/components/reports/MenuEngineeringReport'

export default function MenuEngineeringPage() {
  return (
    <div>
      <PageHeader
        title="Menu Engineering"
        description="Classify products by popularity and contribution margin to optimise your menu mix."
      />
      <MenuEngineeringReport />
    </div>
  )
}

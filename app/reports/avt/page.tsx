import { PageHeader } from '@/components/layout/PageHeader'
import { AvtReport } from '@/components/reports/AvtReport'

export default function AvtReportPage() {
  return (
    <div>
      <PageHeader
        title="Actual vs Theoretical"
        description="Compare actual food cost (stock movement) against theoretical cost (recipe-based). A positive variance means more was consumed than recipes predict."
      />
      <AvtReport />
    </div>
  )
}

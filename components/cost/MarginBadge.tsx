import { Badge } from '@/components/ui/Badge'

interface MarginBadgeProps {
  margin: number | null
}

export function MarginBadge({ margin }: MarginBadgeProps) {
  if (margin === null) return <Badge variant="gray">No price set</Badge>
  if (margin >= 60) return <Badge variant="green">{margin.toFixed(1)}% margin</Badge>
  if (margin >= 30) return <Badge variant="yellow">{margin.toFixed(1)}% margin</Badge>
  return <Badge variant="red">{margin.toFixed(1)}% margin</Badge>
}

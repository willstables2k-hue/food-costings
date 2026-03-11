import Link from 'next/link'

interface EmptyStateProps {
  title: string
  description?: string
  action?: { label: string; href: string }
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-4">📭</div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {description && <p className="text-slate-500 text-sm mt-1 max-w-sm">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-4 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}

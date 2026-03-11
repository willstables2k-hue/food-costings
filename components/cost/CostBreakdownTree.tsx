'use client'

import { useState } from 'react'
import type { CostBreakdownNode } from '@/types/cost'

interface CostBreakdownTreeProps {
  nodes: CostBreakdownNode[]
  depth?: number
}

function NodeRow({ node, depth = 0 }: { node: CostBreakdownNode; depth: number }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.type === 'sub_recipe' && node.sub_breakdown && node.sub_breakdown.length > 0

  return (
    <>
      <tr className={`border-b border-slate-100 ${depth > 0 ? 'bg-slate-50' : ''}`}>
        <td className="py-2 px-4 text-sm" style={{ paddingLeft: `${16 + depth * 20}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-slate-400 hover:text-slate-700 w-4 h-4 flex items-center justify-center"
              >
                {expanded ? '▼' : '▶'}
              </button>
            )}
            {!hasChildren && <span className="w-4" />}
            <span className={node.type === 'sub_recipe' ? 'font-medium text-slate-700' : 'text-slate-600'}>
              {node.name}
            </span>
            {node.type === 'sub_recipe' && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">sub-recipe</span>
            )}
          </div>
        </td>
        <td className="py-2 px-4 text-sm text-slate-600 text-right">
          {node.quantity} {node.unit}
        </td>
        <td className="py-2 px-4 text-sm text-slate-600 text-right">
          £{node.unit_cost.toFixed(4)}
        </td>
        <td className="py-2 px-4 text-sm font-medium text-slate-900 text-right">
          £{node.line_cost.toFixed(4)}
        </td>
      </tr>
      {hasChildren && expanded && node.sub_breakdown && (
        <CostBreakdownTree nodes={node.sub_breakdown} depth={depth + 1} />
      )}
    </>
  )
}

export function CostBreakdownTree({ nodes, depth = 0 }: CostBreakdownTreeProps) {
  return (
    <>
      {nodes.map((node, i) => (
        <NodeRow key={i} node={node} depth={depth} />
      ))}
    </>
  )
}

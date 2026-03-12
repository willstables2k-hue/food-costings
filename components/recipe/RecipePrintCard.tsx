'use client'

interface PrintComponent {
  name: string
  isSubRecipe: boolean
  quantity: number
  unit: string
}

interface PrintStep {
  step_number: number
  instruction: string
  duration_mins: number | null
}

interface RecipePrintCardProps {
  recipe: {
    name: string
    description: string | null
    yield_quantity: number
    yield_unit: string
  }
  costPerYieldUnit: number | null
  components: PrintComponent[]
  steps: PrintStep[]
}

export function RecipePrintCard({ recipe, costPerYieldUnit, components, steps }: RecipePrintCardProps) {
  return (
    <>
      {/* Screen button — hidden on print */}
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors print:hidden"
      >
        🖨 Print Recipe Card
      </button>

      {/* Print-only card */}
      <div className="hidden print:block print-card">
        <div style={{ fontFamily: 'serif', maxWidth: '680px', margin: '0 auto', padding: '32px' }}>
          {/* Header */}
          <div style={{ borderBottom: '2px solid #1e293b', paddingBottom: '12px', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{recipe.name}</h1>
            {recipe.description && (
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{recipe.description}</p>
            )}
            <div style={{ display: 'flex', gap: '24px', marginTop: '10px', fontSize: '13px', color: '#475569' }}>
              <span>Yield: <strong>{recipe.yield_quantity} {recipe.yield_unit}</strong></span>
              {costPerYieldUnit !== null && (
                <span>Cost per {recipe.yield_unit}: <strong>£{costPerYieldUnit.toFixed(4)}</strong></span>
              )}
            </div>
          </div>

          {/* Two columns: ingredients + method */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
            {/* Ingredients */}
            <div>
              <h2 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '10px' }}>
                Ingredients
              </h2>
              {components.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#94a3b8' }}>None listed</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', lineHeight: '1.8' }}>
                  {components.map((c, i) => (
                    <li key={i} style={{ borderBottom: '1px dotted #e2e8f0', paddingBottom: '3px', marginBottom: '3px' }}>
                      <span style={{ fontWeight: '600' }}>{c.quantity} {c.unit}</span>
                      {' '}{c.name}
                      {c.isSubRecipe && <span style={{ fontSize: '11px', color: '#3b82f6' }}> (sub)</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Method */}
            <div>
              <h2 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '10px' }}>
                Method
              </h2>
              {steps.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#94a3b8' }}>No method steps added yet.</p>
              ) : (
                <ol style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                  {steps.map((step) => (
                    <li key={step.step_number} style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '13px', lineHeight: '1.6' }}>
                      <span style={{ flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%', background: '#1e293b', color: '#fff', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {step.step_number}
                      </span>
                      <span>
                        {step.instruction}
                        {step.duration_mins && (
                          <span style={{ display: 'inline-block', marginLeft: '6px', fontSize: '11px', color: '#64748b' }}>
                            ({step.duration_mins} min)
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '32px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>Food Costings — Internal use only</span>
            <span>Printed {new Date().toLocaleDateString('en-GB')}</span>
          </div>
        </div>
      </div>
    </>
  )
}

// Unit conversion table — all conversions are to a base unit within a family
// Mass base: grams (g)
// Volume base: milliliters (ml)
// Count base: unit

type UnitFamily = 'mass' | 'volume' | 'count'

interface UnitDef {
  family: UnitFamily
  toBase: number  // multiply by this to convert to base unit
}

const UNITS: Record<string, UnitDef> = {
  // Mass
  mg:   { family: 'mass',   toBase: 0.001 },
  g:    { family: 'mass',   toBase: 1 },
  kg:   { family: 'mass',   toBase: 1000 },
  oz:   { family: 'mass',   toBase: 28.3495 },
  lb:   { family: 'mass',   toBase: 453.592 },
  // Volume
  ml:   { family: 'volume', toBase: 1 },
  cl:   { family: 'volume', toBase: 10 },
  dl:   { family: 'volume', toBase: 100 },
  l:    { family: 'volume', toBase: 1000 },
  L:    { family: 'volume', toBase: 1000 },
  tsp:  { family: 'volume', toBase: 4.92892 },
  tbsp: { family: 'volume', toBase: 14.7868 },
  cup:  { family: 'volume', toBase: 236.588 },
  // Count
  unit:  { family: 'count', toBase: 1 },
  each:  { family: 'count', toBase: 1 },
  dozen: { family: 'count', toBase: 12 },
  pack:  { family: 'count', toBase: 1 },
  bag:   { family: 'count', toBase: 1 },
  box:   { family: 'count', toBase: 1 },
}

export function getConversionFactor(fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return 1

  const from = UNITS[fromUnit]
  const to = UNITS[toUnit]

  if (!from) throw new Error(`Unknown unit: "${fromUnit}"`)
  if (!to) throw new Error(`Unknown unit: "${toUnit}"`)

  if (from.family !== to.family) {
    throw new Error(
      `Cannot convert between unit families: "${fromUnit}" (${from.family}) → "${toUnit}" (${to.family})`
    )
  }

  // Convert from → base → to
  return from.toBase / to.toBase
}

export function getSupportedUnits(): string[] {
  return Object.keys(UNITS)
}

export function getUnitFamily(unit: string): UnitFamily | null {
  return UNITS[unit]?.family ?? null
}

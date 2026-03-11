export interface CostBreakdownNode {
  type: 'ingredient' | 'sub_recipe'
  id: number
  name: string
  quantity: number
  unit: string
  unit_cost: number
  line_cost: number
  sub_breakdown?: CostBreakdownNode[]
  sub_recipe_yield_quantity?: number
  sub_recipe_yield_unit?: string
}

export interface CostBreakdown {
  recipe_id: number
  recipe_name: string
  total_cost: number
  yield_quantity: number
  yield_unit: string
  cost_per_yield_unit: number
  components: CostBreakdownNode[]
  calculated_at: string
}

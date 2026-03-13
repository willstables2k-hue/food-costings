# Food Costing Platform — Competitor Research & Claude Code Prompts

**Research date:** 2026-03-12
**Platforms analysed:** MarketMan, Apicbase, meez, BlueCart, Craftable, WISK, ChefTec, Growyze, Kitchen Cut, MarginEdge

---

## What Competitors Do That This App Does Not Yet

The current app has a strong foundation: invoices drive price updates, costs cascade through nested recipes, snapshots track historical product costs, and the dashboard shows live margins. But compared to the leading platforms, several entire capability areas are missing:

| Capability | MarketMan | Apicbase | meez | This App |
|---|---|---|---|---|
| Ingredient yield / prep loss | ✅ | ✅ | ✅ | ❌ |
| Stock counts / stocktaking | ✅ | ✅ | — | ❌ |
| Par levels & low-stock alerts | ✅ | ✅ | — | ❌ |
| Purchase orders | ✅ | ✅ | — | ❌ |
| Waste logging | ✅ | ✅ | ✅ | ❌ |
| Actual vs Theoretical (AvT) | ✅ | ✅ | — | ❌ |
| Allergen tracking | ✅ | ✅ | ✅ | ❌ |
| Nutritional info per recipe | — | ✅ | ✅ | ❌ |
| Recipe method / step instructions | — | ✅ | ✅ | ❌ |
| Recipe import (PDF/Excel) | — | ✅ | — | ❌ |
| Invoice photo / OCR scanning | ✅ | — | ✅ | ❌ |
| Menu engineering analysis | ✅ | ✅ | ✅ | ❌ |
| Multi-location / stock transfers | ✅ | ✅ | ✅ | ❌ |
| User roles & permissions | ✅ | ✅ | — | ❌ |
| Accounting export (Xero/QBO) | ✅ | ✅ | — | ❌ |
| Supplier price-change alerts | ✅ | — | — | ❌ |
| AI demand forecasting | ✅ | — | — | ❌ |

---

## Claude Code Prompts — Ordered by Impact

Each prompt is self-contained and can be pasted directly into Claude Code. They are ordered from highest business value / lowest complexity first.

---

### PROMPT 1 — Ingredient Yield & Prep Loss

**Why:** Every competitor treats yield as fundamental. Without it, recipe costs are systematically wrong. 1 kg of carrots doesn't cost the same as 1 kg of usable carrot — you buy gross, you cook net.

```
I'm working on a Next.js 14 App Router food costing app using Prisma v7 with the libsql
adapter (see lib/prisma.ts). The Prisma schema is in prisma/schema.prisma.

Add yield/prep-loss tracking to the Ingredient model. Here is what I need:

1. SCHEMA — add two new optional Float fields to the `ingredients` table:
   - `yield_percentage` (default 100.0, range 0–100) — the usable fraction after prep
     (e.g. 80 means 80% yield: buy 1 kg, get 0.8 kg usable)
   - `prep_loss_notes` String? — free text (e.g. "peeled & trimmed")

2. MIGRATION — run `npx prisma migrate dev --name add_ingredient_yield`

3. COST CALCULATOR — update `lib/cost-calculator.ts` so that when an ingredient component
   is costed, the unit cost is divided by (yield_percentage / 100). This means if an
   ingredient costs £1/kg and has 80% yield, the effective cost is £1.25/kg usable.
   Guard against yield_percentage being null/0 (treat as 100 in those cases).

4. FORM — update `components/forms/IngredientForm.tsx` to include:
   - A numeric input for "Yield %" (0–100, step 0.1, default 100)
   - A text input for "Prep loss notes"
   - Show a helper text: "e.g. 80% = buy 1 kg, use 800 g after peeling"

5. API — update the PUT /api/ingredients/[id] and POST /api/ingredients handlers to
   accept and save these new fields.

6. DISPLAY — on the ingredient detail/list page, show the yield % as a badge
   (green if 95–100%, amber if 75–94%, red if below 75%).

Follow the existing code patterns: Zod validation in lib/validations/,
react-hook-form + zodResolver in forms, server components query Prisma directly.
```

---

### PROMPT 2 — Allergen Tracking

**Why:** Legally required in the UK (Natasha's Law / Food Information Regulations). Every competitor flags the 14 major EU/UK allergens. This protects users and is a strong selling point.

```
I'm building a Next.js 14 food costing app. Add allergen tracking across ingredients
and recipes. The 14 major UK/EU allergens are: celery, cereals_with_gluten, crustaceans,
eggs, fish, lupin, milk, molluscs, mustard, nuts (tree nuts), peanuts, sesame,
soybeans, sulphites.

1. SCHEMA — create a new model `Allergen` and a join table `IngredientAllergen`:
   model Allergen {
     id           Int                  @id @default(autoincrement())
     key          String               @unique  // e.g. "milk", "gluten"
     display_name String               // e.g. "Milk", "Cereals with Gluten"
     ingredients  IngredientAllergen[]
     @@map("allergens")
   }
   model IngredientAllergen {
     ingredient_id Int
     allergen_id   Int
     ingredient    Ingredient @relation(...)
     allergen      Allergen   @relation(...)
     @@id([ingredient_id, allergen_id])
     @@map("ingredient_allergens")
   }
   Also add `allergens IngredientAllergen[]` to the Ingredient model.

2. SEED — after migrating, seed the 14 standard allergens into the allergens table
   using `prisma/seed.ts` (create this file if it doesn't exist, add to package.json
   as "prisma": { "seed": "ts-node prisma/seed.ts" }).

3. ALLERGEN ROLLUP — create `lib/allergen-calculator.ts` that takes a recipeId and
   returns the Set<string> of all allergen keys present in that recipe, recursively
   traversing sub-recipes. Use the same visited-set pattern as cost-calculator.ts
   to handle circular refs.

4. INGREDIENT FORM — add a multi-checkbox allergen selector to IngredientForm.tsx.
   Show the 14 allergens as a grid of pill checkboxes. Save via the ingredient API.

5. RECIPE & PRODUCT PAGES — on the recipe detail page, show an "Allergens" section
   that calls the allergen rollup and displays coloured pill badges for each allergen
   present. Use amber for "contains", with a ⚠️ icon.

6. API — update GET /api/ingredients/[id] to include allergens in the response.
   Update POST/PUT to accept an `allergen_ids: number[]` field.

Follow the project's existing Zod/react-hook-form patterns. Do not pass explicit
type parameters to useForm — let TypeScript infer from the zodResolver.
```

---

### PROMPT 3 — Recipe Method Steps & Photos

**Why:** meez and Apicbase both emphasise step-by-step instructions as a key differentiator for staff training and consistency. It turns the recipe from a costing tool into an operational one.

```
My food costing app has a Recipe model in Prisma. I want to add structured method
steps to each recipe for staff training and consistency.

1. SCHEMA — add a new model `RecipeStep`:
   model RecipeStep {
     id           Int      @id @default(autoincrement())
     recipe_id    Int
     step_number  Int
     instruction  String   // the step text
     photo_url    String?  // optional image URL
     duration_mins Int?    // optional prep time in minutes
     created_at   DateTime @default(now())
     recipe       Recipe   @relation(fields: [recipe_id], references: [id], onDelete: Cascade)
     @@index([recipe_id])
     @@map("recipe_steps")
   }
   Add `steps RecipeStep[]` to the Recipe model.

2. MIGRATION — run the migration with name "add_recipe_steps".

3. API — add GET/POST to `/app/api/recipes/[id]/steps/route.ts` and
   PUT/DELETE to `/app/api/recipes/[id]/steps/[stepId]/route.ts`.

4. STEP EDITOR COMPONENT — create `components/forms/RecipeStepEditor.tsx`:
   - Renders an ordered list of steps, each with a textarea for instruction,
     optional number input for duration, and an optional photo URL input
   - "Add step" button appends a new blank step
   - Steps can be reordered via up/down arrow buttons (update step_number)
   - Each step has a delete button
   - Auto-saves on blur using the steps API
   - Show a drag handle icon for visual affordance even if drag-drop is not wired

5. RECIPE DETAIL PAGE — add a "Method" tab or section below the ingredients/components
   section. Render the RecipeStepEditor for edit mode and a clean numbered list view
   for read mode.

6. PRINT VIEW — add a "Print Recipe Card" button to the recipe page that opens a
   print-optimised layout (CSS @media print) showing: recipe name, yield, cost per
   unit, ingredient quantities, allergens, and numbered method steps.

Keep consistent with existing Next.js App Router conventions, Zod validation, and
Tailwind styling patterns in the codebase.
```

---

### PROMPT 4 — Physical Stock Counts (Stocktaking)

**Why:** This is the #1 inventory feature across all platforms. Without stock counts, you can't calculate actual food cost, AvT variance, or know what to reorder. MarketMan, Apicbase, and WISK all centre their inventory offering around it.

```
Add physical stock count (stocktaking) functionality to my Next.js food costing app.

1. SCHEMA — add two new models:
   model StockCount {
     id           Int              @id @default(autoincrement())
     name         String           // e.g. "Week 12 Count"
     status       String           @default("draft")  // draft | submitted
     counted_at   DateTime         @default(now())
     notes        String?
     created_at   DateTime         @default(now())
     lines        StockCountLine[]
     @@map("stock_counts")
   }
   model StockCountLine {
     id              Int         @id @default(autoincrement())
     stock_count_id  Int
     ingredient_id   Int
     counted_quantity Float       // what was physically counted
     unit            String      // unit the count was done in
     count           StockCount  @relation(fields: [stock_count_id], references: [id], onDelete: Cascade)
     ingredient      Ingredient  @relation(fields: [ingredient_id], references: [id])
     @@index([stock_count_id])
     @@map("stock_count_lines")
   }

2. STOCK COUNT VALUE CALCULATION — when a count is submitted, calculate the total
   stock value by multiplying each line's counted_quantity (converted to canonical unit)
   by the ingredient's current_price_per_unit. Store this as a computed field or
   calculate on the fly in the API response.

3. PAGES:
   - `/app/stockcounts/page.tsx` — list all stock counts with date, status, total value
   - `/app/stockcounts/new/page.tsx` — create a new count: name, date, then shows
     all ingredients as a list with a quantity input for each (grouped by first letter
     alphabetically for ease of counting). "Submit Count" button finalises it.
   - `/app/stockcounts/[id]/page.tsx` — view a submitted count showing each ingredient,
     counted quantity, unit, and line value (qty × current price)

4. API routes:
   - GET/POST `/api/stockcounts`
   - GET/PUT `/api/stockcounts/[id]`
   - POST `/api/stockcounts/[id]/submit` — sets status to "submitted"

5. SIDEBAR — add a "Stock Counts" link to the sidebar navigation
   (components/layout/Sidebar.tsx) with an appropriate icon.

6. EXPORT — on the count detail page, add a "Download CSV" button that exports
   ingredient, counted quantity, unit, price per unit, line value as a CSV file
   using plain JavaScript (no external library needed).

Follow existing code conventions. Use the PageHeader component and Card component
from components/ui/ for layout consistency.
```

---

### PROMPT 5 — Par Levels & Low-Stock Alerts

**Why:** Par levels are the bridge between stock counts and purchasing. Every platform offers this. It closes the loop: count stock → compare to par → generate reorder suggestion.

```
Add par level management and low-stock alerts to my food costing app.

1. SCHEMA — add two fields to the Ingredient model:
   - `par_level Float?` — minimum stock level to maintain (in the ingredient's base unit)
   - `par_unit String?` — the unit for the par level (defaults to ingredient unit)

   Also add a StockCountLine → Ingredient back-relation if not already present.

2. CURRENT STOCK CALCULATION — create `lib/stock-calculator.ts` with a function
   `getIngredientStockLevels(prisma)` that:
   - Finds the most recently submitted StockCount
   - Returns a map of ingredient_id → { counted_quantity, unit, value, par_level,
     status: 'ok' | 'low' | 'critical' | 'no_count' }
   - 'low' = counted < par_level, 'critical' = counted < par_level * 0.5
   - If no submitted count exists, status is 'no_count'

3. INGREDIENT FORM — add "Par Level" and "Par Unit" inputs to IngredientForm.tsx.
   Show a helper: "Set the minimum stock level you want to keep on hand."

4. LOW STOCK DASHBOARD WIDGET — add a new card to the dashboard page
   (app/dashboard/page.tsx) showing:
   - Count of ingredients with 'critical' stock
   - Count of ingredients with 'low' stock
   - A "View low stock" link to a filtered ingredients page
   If no stock count exists yet, show a prompt to create one.

5. INGREDIENTS LIST PAGE — add a stock status badge next to each ingredient showing
   OK (green), Low (amber), Critical (red), or No Data (grey). Add a filter dropdown
   to show only low/critical items.

6. REORDER SUGGESTION — on the low-stock view, show a "Suggested order quantity"
   column calculated as: max(0, par_level - current_stock). This is not a PO yet,
   just a suggestion column.

Maintain consistency with existing Zod schemas in lib/validations/, Tailwind styling,
and the existing Card/Badge component patterns.
```

---

### PROMPT 6 — Waste Logging

**Why:** MarketMan, Apicbase, and meez all include waste logs. Without logging waste, you can't calculate true food cost or explain the AvT gap. It's also the most operationally useful feature for kitchen teams.

```
Add a food waste log to my Next.js food costing app.

1. SCHEMA — add a new model:
   model WasteLog {
     id            Int        @id @default(autoincrement())
     ingredient_id Int?       // optional: can waste a raw ingredient
     recipe_id     Int?       // optional: can waste a prepared batch
     quantity      Float
     unit          String
     reason        String     // e.g. "spoilage", "overproduction", "dropped", "expired", "trim"
     notes         String?
     cost_at_log   Float?     // calculated at time of logging: qty × current price
     logged_at     DateTime   @default(now())
     ingredient    Ingredient? @relation(...)
     recipe        Recipe?     @relation(...)
     @@index([logged_at])
     @@map("waste_logs")
   }
   Add back-relations to Ingredient and Recipe models.

2. COST AT LOG — when a waste log is created via the API, calculate and store
   `cost_at_log`:
   - For an ingredient: convert quantity to canonical unit × current_price_per_unit
   - For a recipe: use calculateRecipeCost to get cost_per_yield_unit × quantity

3. PAGES:
   - `/app/waste/page.tsx` — list waste logs with date, item, quantity, reason, cost.
     Filter by date range (last 7 days default), ingredient, and reason.
     Show total waste cost for the period in a summary card.
   - A quick-log form (can be on the same page as a slide-in panel or modal):
     - Select: ingredient OR recipe (toggle)
     - Autocomplete search for the item
     - Quantity + unit inputs
     - Reason dropdown: Spoilage | Overproduction | Dropped/Accident | Expired |
       Trim/Prep Loss | Staff Meal | Comp/Void | Other
     - Optional notes
     - Shows estimated cost in real-time as quantity is entered

4. API routes:
   - GET `/api/waste` with query params: from, to, ingredient_id, reason
   - POST `/api/waste`
   - DELETE `/api/waste/[id]`

5. DASHBOARD WIDGET — add a "Waste this week" card to the dashboard showing total
   waste cost for the last 7 days with a sparkline or trend vs previous week.

6. SIDEBAR — add "Waste Log" link to the navigation.

Use the existing Tailwind, Zod, and react-hook-form patterns. Use the Card and
Badge UI components for consistency.
```

---

### PROMPT 7 — Purchase Orders

**Why:** BlueCart and MarketMan both make purchasing a core workflow. Once par levels and stock counts exist, POs are the natural next step — automatically suggesting what to order from each supplier.

```
Add a purchase order (PO) system to my food costing app.

1. SCHEMA — add two models:
   model PurchaseOrder {
     id           Int               @id @default(autoincrement())
     supplier_id  Int
     status       String            @default("draft")  // draft | sent | received | cancelled
     expected_delivery DateTime?
     notes        String?
     created_at   DateTime          @default(now())
     updated_at   DateTime          @updatedAt
     supplier     Supplier          @relation(...)
     lines        PurchaseOrderLine[]
     @@index([supplier_id])
     @@map("purchase_orders")
   }
   model PurchaseOrderLine {
     id                 Int           @id @default(autoincrement())
     purchase_order_id  Int
     ingredient_id      Int
     quantity           Float
     unit               String
     unit_price         Float?        // expected price (from last invoice for this ingredient/supplier)
     order              PurchaseOrder @relation(...)
     ingredient         Ingredient    @relation(...)
     @@map("purchase_order_lines")
   }

2. SMART PO CREATION — add a function `lib/po-generator.ts` that:
   - Accepts a supplier_id
   - Finds all ingredients supplied by that supplier (via InvoiceLineItem history —
     use the most recent invoice_line_item per ingredient to determine supplier
     association and last unit price)
   - Filters to those with 'low' or 'critical' stock status
   - Returns suggested PO lines: ingredient, suggested_quantity (par - current),
     unit, last_unit_price

3. PAGES:
   - `/app/purchase-orders/page.tsx` — list all POs with supplier, status,
     expected delivery, line count, and estimated total value
   - `/app/purchase-orders/new/page.tsx` — create a PO:
     - Select supplier
     - Click "Suggest items" to run the PO generator and pre-fill lines
     - Editable line table: ingredient, quantity, unit, unit price, line total
     - Add/remove lines manually
   - `/app/purchase-orders/[id]/page.tsx` — view/edit PO, change status buttons
     (Mark as Sent, Mark as Received, Cancel). When "Received" is clicked,
     offer to auto-create an Invoice from the PO lines.

4. CONVERT PO TO INVOICE — when a PO is marked as Received, create a modal asking
   "Create invoice from this PO?" with a date picker. If confirmed, create an Invoice
   and InvoiceLineItems from the PO lines using the existing invoice-processor.ts flow.

5. API routes:
   - GET/POST `/api/purchase-orders`
   - GET/PUT `/api/purchase-orders/[id]`
   - POST `/api/purchase-orders/[id]/status` — updates status
   - POST `/api/purchase-orders/[id]/convert-to-invoice`

6. SIDEBAR — add "Purchase Orders" with a shopping cart icon.

Follow existing codebase conventions throughout. The invoice conversion must call
the existing processInvoice function in lib/invoice-processor.ts.
```

---

### PROMPT 8 — Actual vs Theoretical (AvT) Food Cost Report

**Why:** This is the most important analytical feature in the industry. It's the gap between what your recipes say you should use and what you actually used. MarketMan, Apicbase, Crunchtime, and MarginEdge all lead with this. It identifies waste, theft, and portioning errors.

```
Add an Actual vs Theoretical (AvT) food cost report to my food costing app.

CONCEPT:
- Theoretical cost = sum of (units_sold × recipe_cost_per_unit) for all products,
  over a period. This requires sales data input.
- Actual cost = opening stock value + purchases - closing stock value (from stock counts)
- AvT Variance = Actual - Theoretical (positive = you used more than recipes predict)

Since we don't have POS integration yet, sales data will be entered manually.

1. SCHEMA — add a model for sales entries:
   model SalesEntry {
     id          Int      @id @default(autoincrement())
     product_id  Int
     quantity    Float    // units sold
     period_date DateTime // the day/week this covers
     created_at  DateTime @default(now())
     product     Product  @relation(...)
     @@index([period_date])
     @@map("sales_entries")
   }

2. AvT CALCULATION ENGINE — create `lib/avt-calculator.ts`:
   function calculateAvT(from: Date, to: Date, prisma):
   - Opening stock: most recent StockCount BEFORE `from`, valued at current prices
   - Closing stock: most recent StockCount AT OR AFTER `to`, valued at current prices
   - Purchases in period: sum of InvoiceLineItem total_cost where invoice_date is
     between from and to
   - Actual cost: opening_value + purchases - closing_value
   - Theoretical cost: for each SalesEntry in period, get product → recipe →
     calculateRecipeCost → multiply cost_per_yield_unit × quantity_sold, sum all
   - Return: { actual_cost, theoretical_cost, variance, variance_pct,
     opening_stock_value, closing_stock_value, purchases_total,
     sales_by_product: [{ product_name, qty_sold, theoretical_cost }] }

3. SALES ENTRY FORM — create a simple page `/app/sales/page.tsx`:
   - Period date picker (week ending date)
   - Table of all active products with a quantity input for each
   - Submit saves all as SalesEntry records
   - Show past sales entries in a list below

4. AvT REPORT PAGE — `/app/reports/avt/page.tsx`:
   - Date range picker (from/to)
   - On submit, run calculateAvT and display:
     - Summary cards: Actual cost, Theoretical cost, Variance (£ and %),
       Purchases in period
     - Traffic-light: green if variance < 3%, amber if 3–7%, red if >7%
     - Table: product, units sold, theoretical cost — sorted by highest cost
     - Explanation section: "A positive variance means you spent more on food
       than your recipes predict. Common causes: waste, portioning errors, theft,
       unrecorded waste."

5. NAVIGATION — add a "Reports" section to the sidebar with "Actual vs Theoretical"
   as the first item.

Use existing Prisma patterns. The AvT calculator should handle missing stock counts
gracefully (show a warning if no count exists for the period boundaries).
```

---

### PROMPT 9 — Menu Engineering Analysis

**Why:** meez, Apicbase, and MarketMan all offer menu engineering. It goes beyond cost — it combines margin with popularity to categorise every product as a Star, Puzzle, Plowhorse, or Dog (the classic BCG-style matrix for menus).

```
Add a menu engineering analysis page to my food costing app.

CONCEPT: Menu Engineering plots each product on a 2×2 matrix:
- X-axis: Popularity (units sold vs average — above/below)
- Y-axis: Profitability (contribution margin vs average — above/below)
- Stars: high popularity + high margin (promote heavily)
- Puzzles: low popularity + high margin (improve marketing or simplify)
- Plowhorses: high popularity + low margin (increase price or reduce cost)
- Dogs: low popularity + low margin (consider removing)

Contribution margin = selling_price - cost_per_unit (use retail_price if set,
else wholesale_price).

1. CALCULATION — create `lib/menu-engineer.ts`:
   - Accepts a date range (uses SalesEntry records from that period)
   - For each active product with a price and sales data:
     - units_sold = sum of SalesEntry quantity for that product in period
     - contribution_margin = price - cost_per_yield_unit
     - revenue = units_sold × price
     - total_contribution = units_sold × contribution_margin
   - Calculate averages across all products
   - Classify each product into Star | Puzzle | Plowhorse | Dog
   - Return sorted list with all metrics

2. MENU ENGINEERING PAGE — `/app/reports/menu-engineering/page.tsx`:
   - Date range picker to select the sales period
   - 2×2 matrix visualisation (use a simple CSS grid — no charting library needed):
     Each quadrant contains product name cards with their margin % and units sold
   - Below the matrix: a detailed data table showing all products with columns:
     Product | Units Sold | Food Cost | Price | Contribution Margin | CM% | Category
   - Category filter buttons to show only Stars/Puzzles/etc.
   - "Export CSV" button

3. DASHBOARD INTEGRATION — on the main dashboard, add a small summary row below
   the existing stats showing counts: X Stars, X Puzzles, X Plowhorses, X Dogs
   (based on last 30 days of sales), with a "Full analysis →" link.

4. PRODUCT PAGE BADGE — on each individual product detail page, show the current
   menu engineering category as a coloured badge (based on last 30 days).

Add "Menu Engineering" under a "Reports" section in the sidebar navigation.
Use existing Tailwind styling, Card, and Badge component conventions.
```

---

### PROMPT 10 — User Roles & Authentication

**Why:** Right now there is no authentication. For a real deployment serving a kitchen team with multiple roles (owner, manager, chef), role-based access is essential. MarketMan and Apicbase both enforce role permissions.

```
Add authentication and role-based access control to my Next.js 14 App Router
food costing app.

1. LIBRARY — install NextAuth.js v5 (Auth.js): `npm install next-auth@beta`.
   Use the Credentials provider with email + password (bcrypt for hashing).
   Store sessions in the database using the Prisma adapter:
   `npm install @auth/prisma-adapter bcryptjs @types/bcryptjs`

2. SCHEMA — add Auth.js required models (User, Account, Session, VerificationToken)
   following the Auth.js Prisma adapter schema exactly. Add a `role` field to User:
   role String @default("chef")  // owner | manager | chef | viewer

3. MIDDLEWARE — create `middleware.ts` at the project root to protect all routes
   except `/login`. Redirect unauthenticated users to `/login`.

4. LOGIN PAGE — create `/app/login/page.tsx` with:
   - Email + password form using react-hook-form + Zod
   - Clean centered card layout matching the existing Tailwind design system
   - Error message display for invalid credentials
   - No "register" link — accounts are created by owners only

5. ROLE PERMISSIONS:
   - viewer: read-only access to dashboard, products, recipes
   - chef: viewer + can log waste, add stock counts, enter sales
   - manager: chef + can manage ingredients, recipes, suppliers, invoices, POs
   - owner: full access including user management

6. USER MANAGEMENT — create `/app/settings/users/page.tsx` (owner only):
   - List all users with name, email, role, last login
   - "Invite user" form: email, name, role, temporary password
   - Change role dropdown per user
   - Deactivate user button

7. HEADER — update the layout to show the logged-in user's name and role in the
   top-right of the sidebar/header, with a Sign Out button.

8. SEED an initial owner account in `prisma/seed.ts`:
   email: admin@restaurant.com, password: changeme123, role: owner

Follow Next.js 14 App Router Auth.js v5 patterns. Keep the existing Tailwind
design system throughout.
```

---

### PROMPT 11 — Accounting Export (Xero / CSV)

**Why:** MarketMan integrates with QuickBooks and Xero. Food cost data needs to flow into accounting. A CSV export bridges the gap for smaller operators who don't want a full integration.

```
Add an accounting data export feature to my food costing app.

1. PURCHASE SUMMARY EXPORT — create a page `/app/reports/accounting/page.tsx`:
   - Date range picker
   - Shows a summary table grouping invoices by supplier with:
     supplier name, invoice count, total spend for the period
   - Shows a line-level breakdown: invoice date, reference, supplier,
     total amount, line items count
   - "Export for Xero" button — generates a CSV in Xero's purchase import format:
     ContactName, InvoiceDate, InvoiceNumber, Description, Quantity, UnitAmount,
     AccountCode, TaxType
     Map: supplier→ContactName, invoice.reference→InvoiceNumber,
     ingredient→Description, line_item quantity and price_per_canonical_unit,
     AccountCode hardcoded to "500" (Cost of Sales), TaxType "NONE"
   - "Export generic CSV" button — simpler format with all invoice line items

2. COST OF GOODS SOLD SUMMARY — on the same page, show a COGS summary card:
   - Total purchases in period (from invoices)
   - Estimated COGS = opening stock + purchases - closing stock
     (use the most recent stock counts before/after the period if available)
   - Gross profit estimation if retail sales value can be entered manually
     (add a "Total sales revenue for period" input that is not saved — just used
     for the on-page calculation)

3. WASTE COST EXPORT — add a "Waste report CSV" export on the same page:
   date, item_name, type (ingredient/recipe), quantity, unit, reason, cost

4. PRICE CHANGE LOG — add a "Ingredient price changes CSV" export:
   ingredient_name, old_price, new_price, change_pct, invoice_date, supplier_name

All exports should use plain JavaScript to build CSV strings and trigger a
browser download (no external libraries). Use `Content-Disposition: attachment`
headers on API routes to serve the files.

Keep the existing design patterns (PageHeader, Card, Tailwind).
```

---

### PROMPT 12 — Supplier Price Alerts & Price Comparison

**Why:** MarketMan sends real-time alerts when supplier prices change. This is one of the most actionable features for operators — knowing immediately when a key ingredient has jumped in price lets them reprice or substitute.

```
Add supplier price change alerts and price comparison to my food costing app.

1. PRICE CHANGE DETECTION — update `lib/invoice-processor.ts` so that when an
   invoice is processed and ingredient prices are updated:
   - Compare new price to previous price
   - If change > 5% (configurable), create a PriceAlert record

2. SCHEMA — add a new model:
   model PriceAlert {
     id              Int        @id @default(autoincrement())
     ingredient_id   Int
     invoice_id      Int
     old_price       Float
     new_price       Float
     change_pct      Float      // positive = increase, negative = decrease
     is_read         Boolean    @default(false)
     created_at      DateTime   @default(now())
     ingredient      Ingredient @relation(...)
     invoice         Invoice    @relation(...)
     @@index([is_read])
     @@index([created_at])
     @@map("price_alerts")
   }

3. ALERT BELL — add a notification bell icon to the page header (layout.tsx):
   - Show a red badge with the count of unread PriceAlerts
   - Clicking opens a slide-down panel listing unread alerts:
     "Flour (Allinson) increased 12% — from £0.85/kg to £0.95/kg (Invoice #123)"
   - "Mark all read" button
   - "View all" link to the full alerts page
   - Fetch alert count on every page load using a small server component

4. PRICE ALERTS PAGE — `/app/alerts/page.tsx`:
   - List all alerts (paginated), filterable by read/unread and by ingredient
   - Each row: ingredient, old price, new price, % change (red if increase,
     green if decrease), invoice date, supplier, mark-read toggle
   - "Mark all as read" button

5. INGREDIENT PRICE HISTORY PAGE — on the ingredient detail page, enhance the
   price history section:
   - Show a line chart (use Recharts, already in the project) of price over time
   - Show a table below: date, price, invoice reference, supplier, % change vs previous
   - Highlight rows where price change was >5% in amber, >15% in red

6. SUPPLIER PRICE COMPARISON — create `/app/reports/supplier-prices/page.tsx`:
   - Table of all ingredients with a price column per supplier (based on their
     most recent invoice line item for that ingredient)
   - Highlight the cheapest supplier per ingredient in green
   - Shows potential saving if you switched all ingredients to cheapest supplier

Add a threshold setting: store the alert threshold (default 5%) as a constant in
`lib/config.ts` that can be changed without a code change.
```

---

## Summary of Feature Roadmap

Listed by build order (each depends on or complements the previous):

1. **Ingredient Yield** → fixes cost accuracy immediately, zero UI risk
2. **Allergen Tracking** → legal compliance, high value
3. **Recipe Method Steps** → staff training, turns costing tool into ops tool
4. **Stock Counts** → enables all inventory features downstream
5. **Par Levels** → depends on stock counts, enables reorder logic
6. **Waste Logging** → standalone value, feeds AvT later
7. **Purchase Orders** → depends on par levels + supplier history
8. **Actual vs Theoretical Report** → depends on stock counts + sales entries
9. **Menu Engineering** → depends on sales entries
10. **Authentication & Roles** → should be done before any public/team deployment
11. **Accounting Export** → depends on invoices + stock counts
12. **Price Alerts** → standalone value, enhances invoice processor

---

*Researched from: [MarketMan](https://www.marketman.com), [Apicbase](https://get.apicbase.com), [meez](https://www.getmeez.com), [BlueCart](https://www.bluecart.com), [WISK](https://www.wisk.ai), [Craftable](https://www.craftable.com), [MarginEdge](https://www.marginedge.com), [ChefTec](https://www.cheftec.com), [Kitchen Cut](https://kitchencut.com), [Growyze](https://www.growyze.com)*

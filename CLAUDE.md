# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
npx tsc --noEmit # Type-check without emitting files
npx prisma studio         # Open Prisma database GUI
npx prisma migrate dev    # Run migrations in development
npx prisma generate       # Regenerate Prisma client after schema changes
```

There is no test runner configured.

## Architecture

This is a **Next.js 14 App Router** application for managing food ingredient costs, recipes, and product pricing. It uses SQLite via Prisma ORM.

### Prisma v7 + SQLite Setup

Prisma v7 requires a driver adapter — the built-in SQLite engine was removed. The project uses `@prisma/adapter-libsql` with `@libsql/client`. See `lib/prisma.ts` for the adapter setup. The database URL (`file:./prisma/dev.db`) lives in `.env` and is consumed by both `lib/prisma.ts` (at runtime) and `prisma.config.ts` (for migrations). Do **not** add `url` to `prisma/schema.prisma` — Prisma v7 will reject it.

After any schema change: run `npx prisma migrate dev` then `npx prisma generate`.

### Data Model (prisma/schema.prisma)

9 core models with these relationships:
- `Supplier` → `Invoice` → `InvoiceLineItem` → `Ingredient` (invoice-driven price updates)
- `Ingredient` → `IngredientPriceHistory` (price change tracking, linked to invoices)
- `Recipe` → `RecipeComponent` (ingredients or sub-recipes, supporting nested recipes)
- `Product` → `Recipe` (one-to-one, adds selling price/margin)
- `Product` → `CostSnapshot` (historical cost records created when prices change)

### API Layer (app/api/)

REST endpoints following Next.js App Router conventions (`route.ts` files). Each resource (ingredients, invoices, products, recipes, suppliers) has its own directory with GET/POST handlers, and `[id]/` subdirectories for GET/PUT/DELETE on individual records.

### Business Logic (lib/)

- `lib/cost-calculator.ts` — Core cost calculation engine. Recursively calculates recipe costs with circular dependency detection (`CircularDependencyError`). Most critical file.
- `lib/invoice-processor.ts` — Processes invoices atomically: creates records, updates ingredient prices, then BFS-traverses the recipe tree to find all affected products and creates a `CostSnapshot` for each.
- `lib/unit-converter.ts` — Converts between measurement unit families (mass, volume, count). Throws if units are incompatible.
- `lib/validations/` — Zod schemas shared between client and server validation.
- `lib/prisma.ts` — Singleton Prisma client using libsql adapter.

### Frontend Structure

Server components query Prisma directly (not via fetch). Client forms live in `components/forms/` and use `react-hook-form` with `zodResolver` from `@hookform/resolvers/zod`. Do **not** pass an explicit type parameter to `useForm<T>` when using Zod schemas with `.default()` fields — let TypeScript infer from the resolver to avoid input/output type conflicts.

- `components/ui/` — Reusable primitives (Button, Card, Input, Select, Badge, Spinner, etc.)
- `components/forms/` — Domain-specific forms for each resource (handle both create and edit via optional `*Id` prop)
- `components/cost/` — Cost visualization: `CostBreakdownTree.tsx`, `CostHistoryChart.tsx` (Recharts), `MarginBadge.tsx`
- `components/layout/` — `Sidebar.tsx` and `PageHeader.tsx`

### Path Aliases

`@/*` maps to the project root — use `@/lib/...`, `@/components/...`, `@/types/...` etc.

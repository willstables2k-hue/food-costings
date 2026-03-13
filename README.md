# Food Costings — Build & Verification Guide

Production cost tracker for food businesses: ingredients, recipes, products, invoices, stock counts, and margin analysis. Built with Next.js 14 App Router, Prisma v7 (libsql/SQLite), and TypeScript.

**Repository:** https://github.com/willstables2k-hue/food-costings

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Install](#2-install)
3. [Environment & Config](#3-environment--config)
4. [Database Setup](#4-database-setup)
5. [Lint](#5-lint)
6. [Type Check](#6-type-check)
7. [Tests](#7-tests)
8. [Build](#8-build)
9. [Artifact Verification](#9-artifact-verification)
10. [Smoke Test / Runtime Validation](#10-smoke-test--runtime-validation)
11. [Build Verification Checklist](#build-verification-checklist)

---

## 1. Prerequisites

| Tool | Minimum version | Check |
|------|----------------|-------|
| Node.js | 18.17 (LTS) | `node --version` |
| npm | 9.x | `npm --version` |
| Git | any recent | `git --version` |

> The project is developed and tested on Node 24. Any version ≥ 18.17 is supported by Next.js 14.

**Expected output (example):**
```
node --version   →  v24.13.1
npm --version    →  11.8.0
```

**Failure symptoms:** `npm run build` emits `warn - You are using Node.js X.X.X. Next.js requires Node.js 18.17` — upgrade Node.

---

## 2. Install

```bash
npm install
```

**Expected result:** `node_modules/` is populated; no `npm ERR!` lines; ends with `added N packages`.

**Verification:**
```bash
ls node_modules/.prisma/client   # Prisma client present
ls node_modules/next             # Next.js present
```

**Failure symptoms:**
- `ERESOLVE` peer-dep conflicts — run `npm install --legacy-peer-deps` (should not be needed; flag if it is).
- `node-gyp` native build failures — usually an outdated Node or missing build tools; `npm install --ignore-scripts` lets you proceed but pdf-parse may degrade.
- Lock-file conflicts after a merge — delete `node_modules/` and `package-lock.json` then re-install.

---

## 3. Environment & Config

### 3.1 Create `.env`

```bash
cp .env.example .env   # if .env.example exists
# or create manually:
echo 'DATABASE_URL="file:./prisma/dev.db"' > .env
```

**Required variables:**

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | SQLite file path, e.g. `file:./prisma/dev.db` |
| `ANTHROPIC_API_KEY` | For PDF upload only | `sk-ant-…`. Without it, `/invoices/new` PDF tab returns HTTP 500. |

**Verification:**
```bash
grep DATABASE_URL .env     # should print the file:// line
```

**Failure symptoms:**
- `PrismaClientInitializationError: datasource url must be set` — `DATABASE_URL` is missing or `.env` is not in the project root.
- `ANTHROPIC_API_KEY is not set` banner on the invoice PDF upload page — add the key or test without the upload feature.

### 3.2 Prisma config

`prisma.config.ts` wires the datasource URL and migration path for Prisma v7. It is committed and should not need editing in development. **Do not** add a `url` field to `prisma/schema.prisma` — Prisma v7 rejects it.

---

## 4. Database Setup

> Run this on first clone and after every schema change.

```bash
npx prisma migrate dev
npx prisma generate
```

**Expected result:**
```
✔  Applied N migration(s)
✔  Generated Prisma Client to ./node_modules/.prisma/client
```

**Verification:**
```bash
# Check DB file exists and has non-zero size
ls -lh prisma/dev.db

# Confirm all migrations are applied (no pending drift)
npx prisma migrate status
# Expected: "All migrations have been applied"
```

**Optional — seed allergen reference data:**
```bash
npx ts-node prisma/seed.ts
# Expected: "Seeded 14 allergens"
```

**Failure symptoms:**
- `Error: P3005 — database schema is not empty` — the DB was created manually without migrations. Run `npx prisma migrate reset --force` (destroys all data) then re-run `migrate dev`.
- `Error: P1001 — can't reach database server` — `DATABASE_URL` path is wrong or the `prisma/` directory doesn't exist.
- TypeScript errors referencing missing Prisma model fields after a schema change — you ran `migrate dev` but forgot `prisma generate`. Run `npx prisma generate`.

---

## 5. Lint

```bash
npm run lint
```

**Config:** `.eslintrc.json` extends `next/core-web-vitals` and `next/typescript`.

**Expected result:**
```
✔  No ESLint warnings or errors
```

Or, if warnings exist:
```
warn  - ESLint: X warning(s) found.
```
The build does **not** fail on warnings — only on errors.

**Verification:**
```bash
# Exit code 0 = clean, 1 = errors present
npm run lint; echo "Exit: $?"
```

**Failure symptoms:**
- `Error: X errors found` with non-zero exit — fix reported issues before building.
- `Parsing error: Cannot find module 'next/babel'` — Node or Next version mismatch; re-install.

---

## 6. Type Check

```bash
npx tsc --noEmit
```

**Config:** `tsconfig.json` — strict mode, `"target": "es2015"`, `moduleResolution: "bundler"`, path alias `@/*`.

**Expected result:** No output, exit code 0.

**Verification:**
```bash
npx tsc --noEmit; echo "Exit: $?"
# Expected: "Exit: 0"
```

**Failure symptoms:**
- `TS2339: Property 'X' does not exist` on a Prisma model — run `npx prisma generate` to regenerate the client types.
- `TS2802: Type 'Set<…>' can only be iterated with '--downlevelIteration'` — `target` must be `es2015` or higher in `tsconfig.json`.
- `TS2345: Argument of type 'Client' is not assignable to parameter of type 'Config'` in `prisma/seed.ts` — the seed file must use `new PrismaLibSql({ url: … })`, not `new PrismaLibSql(client)`.
- `useForm<T>` resolver type mismatch — do **not** pass an explicit type parameter to `useForm` when the Zod schema uses `.default()`. Remove the type parameter and let TypeScript infer from `zodResolver`.

---

## 7. Tests

**There is no test runner configured in this repository.** `package.json` defines no `test` script.

```bash
npm test   # → "Missing script: test"
```

This is a known gap. Until a test suite is added, functional verification is done through:
1. TypeScript type-checking (§6) — catches contract and type errors.
2. ESLint (§5) — catches static code issues.
3. Next.js build (§8) — catches page-level and import errors.
4. Manual smoke tests (§10).

---

## 8. Build

```bash
npm run build
```

This runs `next build`, which:
- Compiles and bundles all pages and API routes
- Pre-renders static pages
- Reports per-page bundle sizes

**Expected result:**
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (N/N)
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                    …
…
```

No `Error:` lines. Exit code 0.

**Verification:**
```bash
npm run build; echo "Exit: $?"
ls -lh .next/BUILD_ID          # build artefact exists
ls .next/server/app/           # server route manifests exist
```

**Failure symptoms:**
- `Error: ANTHROPIC_API_KEY is not set` **at build time** — this should not occur; the key is only checked at runtime in the API route. If it does, a `process.env` access was moved to module scope by mistake.
- `Error occurred prerendering page "/X"` — a server component threw during static generation. Common causes: DB not migrated, Prisma client not generated, or a missing required field.
- `Module not found: Can't resolve 'pdf-parse'` — `serverComponentsExternalPackages` must include `'pdf-parse'` in `next.config.mjs`, which it does. If this appears, verify `next.config.mjs` has not been reverted.
- Bundle size warnings (`First Load JS > 500kB`) — investigate with `npx next build --debug` but do not treat as a blocker.

---

## 9. Artifact Verification

After `npm run build` succeeds:

```bash
# Build manifest exists
test -f .next/BUILD_ID && echo "BUILD_ID present" || echo "MISSING"

# Static HTML was generated
ls .next/server/app/*.html 2>/dev/null | head -5

# API route bundles exist
ls .next/server/app/api/ | head -10

# No leftover TypeScript source in output (confirming noEmit)
ls .next/server/*.ts 2>/dev/null && echo "WARNING: .ts files in output" || echo "No stray .ts files"
```

**Migration state must match schema before starting the production server:**
```bash
npx prisma migrate status
# All migrations must be listed as "applied"
```

---

## 10. Smoke Test / Runtime Validation

### 10.1 Dev server

```bash
npm run dev
```

Expected: `✓ Ready in Xs` on `http://localhost:3000` (may auto-increment to 3001/3002 if port is busy).

### 10.2 Production server

```bash
npm run build && npm run start
```

Expected: `▲ Next.js 14.x.x — Local: http://localhost:3000`.

### 10.3 Manual smoke checks

Run these in order after the server is up:

| # | URL | What to verify |
|---|-----|----------------|
| 1 | `/dashboard` | Page loads, no runtime errors in console |
| 2 | `/ingredients` | Table renders; yield badges appear |
| 3 | `/ingredients/new` | Form renders with unit select, yield %, par level inputs, allergen toggles |
| 4 | `/recipes` | Table renders |
| 5 | `/recipes/new` | Form renders; can add components |
| 6 | `/invoices/new` | "Upload PDF" / "Enter Manually" tabs both render |
| 7 | `/stockcounts/new` | Ingredient list appears grouped A–Z |
| 8 | `GET /api/ingredients` | Returns `[]` or ingredient array with HTTP 200 |
| 9 | `POST /api/ingredients` | Creates a record (see curl below) |

**Quick API check:**
```bash
# Health-check the ingredients API
curl -s http://localhost:3000/api/ingredients | head -c 200
# Expected: JSON array (possibly empty: [])

# Create a test ingredient
curl -s -X POST http://localhost:3000/api/ingredients \
  -H "Content-Type: application/json" \
  -d '{"name":"Smoke Test Flour","unit":"kg","yield_percentage":100,"allergen_ids":[]}' \
  | python3 -m json.tool
# Expected: JSON object with "id" field and HTTP 201
```

**Prisma Studio (optional visual verification):**
```bash
npx prisma studio
# Opens http://localhost:5555 — verify tables and row counts
```

---

## Build Verification Checklist

Use this before merging to `main` or cutting a release.

```
Prerequisites
[ ] node --version  ≥ 18.17
[ ] npm --version   ≥ 9.x

Install
[ ] npm install     exits 0, no ERR! lines
[ ] node_modules/.prisma/client  exists

Environment
[ ] .env present with DATABASE_URL set
[ ] ANTHROPIC_API_KEY set (or PDF feature intentionally disabled)

Database
[ ] npx prisma migrate status  → "All migrations have been applied"
[ ] npx prisma generate        → client regenerated after any schema change
[ ] prisma/dev.db              exists and non-zero size

Lint
[ ] npm run lint               exits 0 (no errors; warnings acceptable)

Type check
[ ] npx tsc --noEmit           exits 0, no output

Tests
[ ] (no automated tests — covered by typecheck + build)

Build
[ ] npm run build              exits 0
[ ] .next/BUILD_ID             exists
[ ] No "Error occurred prerendering" in build output

Artifact
[ ] .next/server/app/api/      contains route bundles
[ ] npx prisma migrate status  still clean (schema not drifted post-build)

Smoke test
[ ] npm run start (or npm run dev) reaches "Ready"
[ ] /dashboard loads without console errors
[ ] GET /api/ingredients returns HTTP 200 JSON
[ ] POST /api/ingredients creates a record successfully
[ ] /invoices/new renders both PDF and manual tabs
```

---

## Known Gaps in Verification Coverage

The following cannot be automatically verified with the current tooling:

| Gap | Detail |
|-----|--------|
| **No test suite** | No unit, integration, or E2E tests. Critical paths (`cost-calculator.ts`, `invoice-processor.ts`, `stock-calculator.ts`, `unit-converter.ts`) have zero automated coverage. |
| **No `.env.example`** | The required env vars are documented here but there is no `.env.example` file in the repo to copy from. New contributors must create `.env` by hand. |
| **`ANTHROPIC_API_KEY` untestable in CI** | The PDF parsing route cannot be exercised without a live API key. The key should be a CI secret; the smoke test table above omits this step. |
| **No CI pipeline** | There is no `.github/workflows/` — lint, typecheck, and build are not run automatically on pull requests. |
| **Seed is manual** | `npx ts-node prisma/seed.ts` seeds the 14 UK allergens but is not called by `npm run build` or `prisma migrate dev`. A freshly migrated DB will have no allergen rows until seeded explicitly. |
| **`pdf-parse` test coverage** | `pdf-parse` is excluded from the webpack bundle (`serverComponentsExternalPackages`) and its behaviour with scanned/encrypted PDFs is untested. |

/**
 * Apply Prisma migration SQL files to a remote Turso database.
 * Tracks applied migrations in a _prisma_migrations table (matches Prisma's schema).
 *
 * Usage:
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node scripts/migrate-turso.mjs
 */
import { createClient } from '@libsql/client'
import { readdir, readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, '..', 'prisma', 'migrations')

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url) { console.error('TURSO_DATABASE_URL not set'); process.exit(1) }

const db = createClient({ url, authToken })

// Ensure migrations tracking table exists (Prisma-compatible schema)
await db.execute(`
  CREATE TABLE IF NOT EXISTS _prisma_migrations (
    id                TEXT    PRIMARY KEY NOT NULL,
    checksum          TEXT    NOT NULL,
    finished_at       TEXT,
    migration_name    TEXT    NOT NULL,
    logs              TEXT,
    rolled_back_at    TEXT,
    started_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    applied_steps_count INTEGER NOT NULL DEFAULT 0
  )
`)

// Get already-applied migrations
const applied = await db.execute(`SELECT migration_name FROM _prisma_migrations WHERE rolled_back_at IS NULL`)
const appliedNames = new Set(applied.rows.map(r => r.migration_name))

// Read all migration directories in order
const dirs = (await readdir(migrationsDir, { withFileTypes: true }))
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort()

let applied_count = 0
let skipped_count = 0

for (const dir of dirs) {
  if (appliedNames.has(dir)) {
    console.log(`  ✓ ${dir} (already applied)`)
    skipped_count++
    continue
  }

  const sqlPath = join(migrationsDir, dir, 'migration.sql')
  let sql
  try {
    sql = await readFile(sqlPath, 'utf8')
  } catch {
    console.log(`  ⚠ ${dir} — no migration.sql, skipping`)
    continue
  }

  console.log(`  → Applying ${dir}…`)

  // Split on semicolons, strip comment lines, keep non-empty SQL
  const statements = sql
    .split(';')
    .map(s => s.split('\n').filter(line => !line.trimStart().startsWith('--')).join('\n').trim())
    .filter(s => s.length > 0)

  try {
    for (const stmt of statements) {
      await db.execute(stmt)
    }

    const checksum = crypto.createHash('sha256').update(sql).digest('hex')
    const id = crypto.randomUUID()
    await db.execute({
      sql: `INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, applied_steps_count)
            VALUES (?, ?, ?, datetime('now'), ?)`,
      args: [id, checksum, dir, statements.length],
    })

    console.log(`    ✓ Applied (${statements.length} statements)`)
    applied_count++
  } catch (err) {
    console.error(`    ✗ Failed: ${err.message}`)
    process.exit(1)
  }
}

console.log(`\nDone. Applied: ${applied_count}, Skipped: ${skipped_count}`)
db.close()

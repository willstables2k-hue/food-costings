import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const ALLERGENS = [
  { key: 'celery', display_name: 'Celery' },
  { key: 'cereals_with_gluten', display_name: 'Cereals with Gluten' },
  { key: 'crustaceans', display_name: 'Crustaceans' },
  { key: 'eggs', display_name: 'Eggs' },
  { key: 'fish', display_name: 'Fish' },
  { key: 'lupin', display_name: 'Lupin' },
  { key: 'milk', display_name: 'Milk' },
  { key: 'molluscs', display_name: 'Molluscs' },
  { key: 'mustard', display_name: 'Mustard' },
  { key: 'nuts', display_name: 'Tree Nuts' },
  { key: 'peanuts', display_name: 'Peanuts' },
  { key: 'sesame', display_name: 'Sesame' },
  { key: 'soybeans', display_name: 'Soybeans' },
  { key: 'sulphites', display_name: 'Sulphites' },
]

async function main() {
  for (const allergen of ALLERGENS) {
    await prisma.allergen.upsert({
      where: { key: allergen.key },
      update: { display_name: allergen.display_name },
      create: allergen,
    })
  }
  console.log(`Seeded ${ALLERGENS.length} allergens`)

  // Seed initial owner account
  const passwordHash = await bcrypt.hash('changeme123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@restaurant.com' },
    update: {},
    create: {
      email: 'admin@restaurant.com',
      name: 'Admin',
      password: passwordHash,
      role: 'owner',
    },
  })
  console.log('Seeded owner account: admin@restaurant.com / changeme123')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })

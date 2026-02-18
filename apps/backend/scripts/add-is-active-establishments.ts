/**
 * Script one-off: añade la columna is_active a establishments si no existe.
 * Ejecutar desde apps/backend: npx ts-node -P tsconfig.migration.json scripts/add-is-active-establishments.ts
 */
import { AppDataSource } from '../src/data-source';

async function run() {
  await AppDataSource.initialize();
  try {
    await AppDataSource.query(`
      ALTER TABLE establishments
      ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true
    `);
    console.log('Columna is_active añadida (o ya existía) en establishments.');
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

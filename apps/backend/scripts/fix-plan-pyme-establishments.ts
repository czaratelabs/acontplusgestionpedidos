/**
 * Script para aumentar max_establishments del Plan Pyme de 1 a 2.
 * Ejecutar: npx ts-node -P tsconfig.json scripts/fix-plan-pyme-establishments.ts
 */
import { DataSource } from 'typeorm';
import * as path from 'path';

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER ?? process.env.DB_USERNAME ?? 'admin',
    password: process.env.DB_PASSWORD ?? 'adminpassword',
    database: process.env.DB_NAME ?? process.env.DB_DATABASE ?? 'erp_db',
  });

  await dataSource.initialize();

  const result = await dataSource.query(`
    UPDATE subscription_plans
    SET limits = jsonb_set(COALESCE(limits, '{}'), '{max_establishments}', '2')
    WHERE name = 'Plan Pyme'
    RETURNING id, name, limits
  `);

  if (result.length > 0) {
    console.log('✓ Plan Pyme actualizado. max_establishments = 2');
    console.log(result[0]);
  } else {
    console.log('No se encontró plan con nombre "Plan Pyme"');
  }

  await dataSource.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

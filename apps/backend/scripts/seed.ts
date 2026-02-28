/**
 * Seed de datos iniciales: roles del sistema, plan de suscripción y usuario Super Admin.
 * Ejecutar desde apps/backend: npm run seed
 * Requiere .env con DB_* (o DATABASE_URL). Para el Super Admin: SEED_SUPER_ADMIN_EMAIL y SEED_SUPER_ADMIN_PASSWORD.
 */
import * as path from 'path';
// Cargar .env desde la raíz del backend
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch {
  // dotenv puede no estar instalado; asumir que las variables ya están definidas
}

process.env.TZ = 'America/Guayaquil';

import { AppDataSource } from '../src/data-source';
import { IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from '../src/roles/entities/role.entity';
import { SubscriptionPlan } from '../src/companies/entities/subscription-plan.entity';
import { User } from '../src/users/entities/user.entity';

const SYSTEM_ROLES = ['owner', 'admin', 'seller', 'super_admin'] as const;

async function seedRoles() {
  const repo = AppDataSource.getRepository(Role);
  for (const name of SYSTEM_ROLES) {
    const existing = await repo.findOne({
      where: { name, companyId: IsNull() },
    });
    if (existing) {
      console.log(`  Rol "${name}" ya existe.`);
      continue;
    }
    await repo.save(
      repo.create({
        name,
        description: `Rol del sistema: ${name}`,
        companyId: null,
        isActive: true,
        permissions: name === 'super_admin' ? { '*': true } : {},
      }),
    );
    console.log(`  Rol "${name}" creado.`);
  }
}

async function seedSubscriptionPlan() {
  const repo = AppDataSource.getRepository(SubscriptionPlan);
  const count = await repo.count();
  if (count > 0) {
    console.log('  Ya existen planes de suscripción. No se inserta "Plan Básico".');
    return;
  }
  await repo.save(
    repo.create({
      name: 'Plan Básico',
      price: '0',
      implementationFee: '0',
      limits: {
        max_sellers: 2,
        max_establishments: 1,
        max_warehouses: 1,
        max_inventory_items: 200,
        max_total_users: 3,
      },
      modules: {
        audit: true,
        logistics: false,
        business_rules: true,
        sri: true,
      },
      isActive: true,
    }),
  );
  console.log('  Plan "Plan Básico" creado.');
}

async function seedSuperAdmin() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL?.trim();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log(
      '  Super Admin omitido: define SEED_SUPER_ADMIN_EMAIL y SEED_SUPER_ADMIN_PASSWORD en .env para crearlo.',
    );
    return;
  }

  const userRepo = AppDataSource.getRepository(User);
  const existing = await userRepo.findOne({ where: { email } });
  if (existing) {
    if (existing.is_super_admin) {
      console.log(`  Super Admin ya existe: ${email}`);
    } else {
      existing.is_super_admin = true;
      const salt = await bcrypt.genSalt();
      existing.password_hash = await bcrypt.hash(password, salt);
      await userRepo.save(existing);
      console.log(`  Usuario ${email} actualizado a Super Admin.`);
    }
    return;
  }

  const salt = await bcrypt.genSalt();
  const password_hash = await bcrypt.hash(password, salt);
  await userRepo.save(
    userRepo.create({
      full_name: 'Super Admin',
      email,
      password_hash,
      is_active: true,
      is_super_admin: true,
    }),
  );
  console.log(`  Super Admin creado: ${email}`);
}

async function run() {
  console.log('Conectando a la base de datos...');
  await AppDataSource.initialize();
  console.log('Conexión OK.\n');

  try {
    console.log('1. Roles del sistema (owner, admin, seller, super_admin):');
    await seedRoles();

    console.log('\n2. Plan de suscripción inicial:');
    await seedSubscriptionPlan();

    console.log('\n3. Usuario Super Admin:');
    await seedSuperAdmin();

    console.log('\nSeed completado correctamente.');
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

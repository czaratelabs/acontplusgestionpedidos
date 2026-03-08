import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Habilita Row Level Security (RLS) en todas las tablas del schema public
 * para cumplir con el linter de Supabase (Performance / Security).
 *
 * El backend NestJS se conecta con el usuario postgres (superuser), que
 * ignora RLS; la API de PostgREST queda protegida (sin políticas = sin filas visibles).
 */
const PUBLIC_TABLES = [
  'subscription_plans',
  'companies',
  'roles',
  'users',
  'user_companies',
  'establishments',
  'emission_points',
  'warehouses',
  'taxes',
  'contacts',
  'system_settings',
  'business_rules',
  'measures',
  'colors',
  'sizes',
  'flavors',
  'categories',
  'brands',
  'articles',
  'article_variants',
  'article_images',
  'article_batches',
  'audit_logs',
  'article_variant_prices',
  'article_variant_barcodes',
] as const;

export class EnableRlsOnPublicTables1743100000000 implements MigrationInterface {
  name = 'EnableRlsOnPublicTables1743100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of PUBLIC_TABLES) {
      await queryRunner.query(
        `ALTER TABLE IF EXISTS public."${table}" ENABLE ROW LEVEL SECURITY`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of PUBLIC_TABLES) {
      await queryRunner.query(
        `ALTER TABLE IF EXISTS public."${table}" DISABLE ROW LEVEL SECURITY`,
      );
    }
  }
}

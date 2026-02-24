import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Mejoras prioridad alta para módulo Articles (BD.sql):
 * 1. Eliminar FKs duplicadas
 * 2. Índice article_images(article_id)
 * 3. Índices article_batches(company_id, expiration_date)
 * 4. Índice article_variant_prices(article_variant_id)
 * 5. articles.name NOT NULL
 * 6. article_variant_prices.price NOT NULL
 * 7. Eliminar search_vector y GIN index (evita errores to_tsvector)
 */
export class ArticlesHighPriorityImprovements1742100000000 implements MigrationInterface {
  name = 'ArticlesHighPriorityImprovements1742100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ─── 1. ELIMINAR FKs DUPLICADAS ─────────────────────────────────────────────
    const duplicateFks = [
      { table: 'articles', constraint: 'articles_brand_id_fkey' },
      { table: 'articles', constraint: 'articles_category_id_fkey' },
      { table: 'articles', constraint: 'articles_company_id_fkey' },
      { table: 'articles', constraint: 'articles_tax_id_fkey' },
      { table: 'article_images', constraint: 'article_images_article_id_fkey' },
      { table: 'article_variants', constraint: 'article_variants_article_id_fkey' },
      { table: 'article_variants', constraint: 'article_variants_company_id_fkey' },
      { table: 'article_batches', constraint: 'article_batches_article_variant_id_fkey' },
      { table: 'article_batches', constraint: 'article_batches_company_id_fkey' },
      { table: 'article_variant_prices', constraint: 'article_variant_prices_article_variant_id_fkey' },
    ];

    for (const { table, constraint } of duplicateFks) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${constraint}"`,
      );
    }

    // ─── 2. ÍNDICE article_images(article_id) ───────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_article_images_article_id"
      ON "article_images" ("article_id")
    `);

    // ─── 3. ÍNDICES article_batches ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_article_batches_company_id"
      ON "article_batches" ("company_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_article_batches_expiration"
      ON "article_batches" ("expiration_date")
      WHERE "expiration_date" IS NOT NULL
    `);

    // ─── 4. ÍNDICE article_variant_prices(article_variant_id) ───────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_article_variant_prices_variant"
      ON "article_variant_prices" ("article_variant_id")
    `);

    // ─── 5. articles.name NOT NULL ─────────────────────────────────────────────
    await queryRunner.query(`
      UPDATE "articles" SET "name" = '(Sin nombre)' WHERE "name" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "articles" ALTER COLUMN "name" SET NOT NULL
    `);

    // ─── 6. article_variant_prices.price NOT NULL ───────────────────────────────
    await queryRunner.query(`
      UPDATE "article_variant_prices" SET "price" = 0 WHERE "price" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "article_variant_prices" ALTER COLUMN "price" SET NOT NULL
    `);

    // ─── 7. ELIMINAR search_vector (evita errores to_tsvector) ──────────────────
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_article_variants_search"
    `);
    await queryRunner.query(`
      ALTER TABLE "article_variants" DROP COLUMN IF EXISTS "search_vector"
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Restaurar search_vector (columna sin trigger, índice GIN no recreamos)
    const hasSearchVector = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'article_variants'
        AND column_name = 'search_vector'
    `);
    if (hasSearchVector.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "article_variants" ADD COLUMN "search_vector" tsvector NULL
      `);
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_article_variants_search"
        ON "article_variants" USING gin ("search_vector")
      `);
    }

    // Revertir NOT NULL
    await queryRunner.query(`
      ALTER TABLE "articles" ALTER COLUMN "name" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "article_variant_prices" ALTER COLUMN "price" DROP NOT NULL
    `);

    // Eliminar índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_article_images_article_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_article_batches_company_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_article_batches_expiration"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_article_variant_prices_variant"`);

    // NOTA: Las FKs duplicadas no se recrean en down (eran redundantes)
  }
}

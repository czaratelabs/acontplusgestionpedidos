import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Mejoras para articles, article_images, article_variants, article_batches,
 * article_variant_prices, flavors, sizes, colors (según análisis BD.sql)
 */
export class ArticlesCatalogsImprovements1742300000000 implements MigrationInterface {
  name = 'ArticlesCatalogsImprovements1742300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ─── 1. ARTICLE_IMAGES: FK duplicada + índice ───────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "article_images" DROP CONSTRAINT IF EXISTS "article_images_article_id_fkey"
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_article_images_article_id"
      ON "article_images" ("article_id")
    `);

    // ─── 2. ARTICLE_BATCHES: FKs duplicadas + índices + UNIQUE ───────────────────
    await queryRunner.query(`
      ALTER TABLE "article_batches" DROP CONSTRAINT IF EXISTS "article_batches_article_variant_id_fkey"
    `);
    await queryRunner.query(`
      ALTER TABLE "article_batches" DROP CONSTRAINT IF EXISTS "article_batches_company_id_fkey"
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_article_batches_company_id"
      ON "article_batches" ("company_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_article_batches_expiration"
      ON "article_batches" ("expiration_date")
      WHERE "expiration_date" IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "article_batches"
      ADD CONSTRAINT "UQ_article_batches_variant_number"
      UNIQUE ("article_variant_id", "batch_number")
    `);

    // ─── 3. ARTICLE_VARIANT_PRICES: FK duplicada + price NOT NULL + índice + UNIQUE ─
    await queryRunner.query(`
      ALTER TABLE "article_variant_prices" DROP CONSTRAINT IF EXISTS "article_variant_prices_article_variant_id_fkey"
    `);
    await queryRunner.query(`
      UPDATE "article_variant_prices" SET "price" = 0 WHERE "price" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "article_variant_prices" ALTER COLUMN "price" SET NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_article_variant_prices_variant"
      ON "article_variant_prices" ("article_variant_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "article_variant_prices"
      ADD CONSTRAINT "UQ_article_variant_prices_variant_type"
      UNIQUE ("article_variant_id", "price_type")
    `);

    // ─── 4. FLAVORS, SIZES, COLORS: FKs duplicadas + índices + UNIQUE ───────────
    const catalogTables = ['flavors', 'sizes', 'colors'] as const;
    for (const table of catalogTables) {
      const fkName = `${table}_company_id_fkey`;
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${fkName}"`,
      );
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_${table}_company_id"
        ON "${table}" ("company_id")
      `);
      const uqName = `UQ_${table}_company_name`;
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD CONSTRAINT "${uqName}"
        UNIQUE ("company_id", "name")
      `);
    }

    // ─── 5. ARTICLE_VARIANTS: sku NOT NULL (opcional, si hay datos NULL fallaría) ─
    const skuNulls = await queryRunner.query(`
      SELECT COUNT(*) AS n FROM "article_variants" WHERE "sku" IS NULL
    `);
    if (skuNulls[0]?.n === '0' || skuNulls[0]?.n === 0) {
      await queryRunner.query(`
        ALTER TABLE "article_variants" ALTER COLUMN "sku" SET NOT NULL
      `);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // article_variants sku
    await queryRunner.query(`
      ALTER TABLE "article_variants" ALTER COLUMN "sku" DROP NOT NULL
    `).catch(() => {});

    // flavors, sizes, colors
    for (const table of ['flavors', 'sizes', 'colors'] as const) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "UQ_${table}_company_name"`,
      );
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${table}_company_id"`);
      // No recreamos FKs duplicadas
    }

    // article_variant_prices
    await queryRunner.query(`
      ALTER TABLE "article_variant_prices" DROP CONSTRAINT IF EXISTS "UQ_article_variant_prices_variant_type"
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_article_variant_prices_variant"`);
    await queryRunner.query(`
      ALTER TABLE "article_variant_prices" ALTER COLUMN "price" DROP NOT NULL
    `);
    // No recreamos FK duplicada

    // article_batches
    await queryRunner.query(`
      ALTER TABLE "article_batches" DROP CONSTRAINT IF EXISTS "UQ_article_batches_variant_number"
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_article_batches_expiration"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_article_batches_company_id"`);
    // No recreamos FKs duplicadas

    // article_images
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_article_images_article_id"`);
    // No recreamos FK duplicada
  }
}

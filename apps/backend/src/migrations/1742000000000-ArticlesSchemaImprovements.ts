import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

/**
 * Mejoras del esquema Articles según análisis de arquitectura:
 * - Índices compuestos para reportes y queries por company_id + is_active
 * - FK unit_id en article_variant_prices -> measures
 * - CHECK para price_type (no vacío)
 * - measure_id en article_variants -> measures (opcional, convive con measure VARCHAR)
 */
export class ArticlesSchemaImprovements1742000000000 implements MigrationInterface {
  name = 'ArticlesSchemaImprovements1742000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ─── 1. ÍNDICES COMPUESTOS (Performance) ────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_articles_company_active"
      ON "articles" ("company_id", "is_active") WHERE "is_active" = true
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_article_variants_article_company"
      ON "article_variants" ("article_id", "company_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_article_variants_company_active"
      ON "article_variants" ("company_id", "is_active") WHERE "is_active" = true
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_article_variant_prices_variant_default"
      ON "article_variant_prices" ("article_variant_id", "is_default")
      WHERE "is_default" = true
    `);

    // ─── 2. COLUMNA unit_id Y FK EN article_variant_prices ──────────────────────
    const pricesTable = await queryRunner.getTable('article_variant_prices');
    const hasUnitId = pricesTable?.columns.some((c) => c.name === 'unit_id');
    if (!hasUnitId) {
      await queryRunner.addColumn(
        'article_variant_prices',
        new TableColumn({
          name: 'unit_id',
          type: 'uuid',
          isNullable: true,
        }),
      );
    }
    // FK a measures (si measures existe y no hay FK previa)
    const fks = await queryRunner.query(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'article_variant_prices'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%unit%'
    `);
    if (fks.length === 0) {
      await queryRunner.createForeignKey(
        'article_variant_prices',
        new TableForeignKey({
          columnNames: ['unit_id'],
          referencedTableName: 'measures',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
          name: 'FK_article_variant_prices_unit',
        }),
      );
    }

    // ─── 3. CHECK price_type NO VACÍO ───────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "article_variant_prices"
      DROP CONSTRAINT IF EXISTS "CHK_article_variant_prices_price_type_not_empty"
    `);
    await queryRunner.query(`
      ALTER TABLE "article_variant_prices"
      ADD CONSTRAINT "CHK_article_variant_prices_price_type_not_empty"
      CHECK (price_type IS NOT NULL AND char_length(trim(price_type)) > 0)
    `);

    // ─── 4. COLUMNA measure_id EN article_variants (FK a measures) ──────────────
    const variantsTable = await queryRunner.getTable('article_variants');
    const hasMeasureId = variantsTable?.columns.some((c) => c.name === 'measure_id');
    if (!hasMeasureId) {
      await queryRunner.addColumn(
        'article_variants',
        new TableColumn({
          name: 'measure_id',
          type: 'uuid',
          isNullable: true,
        }),
      );
      await queryRunner.createForeignKey(
        'article_variants',
        new TableForeignKey({
          columnNames: ['measure_id'],
          referencedTableName: 'measures',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
          name: 'FK_article_variants_measure',
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_articles_company_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_article_variants_article_company"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_article_variants_company_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_article_variant_prices_variant_default"`);

    // FK y columna measure_id
    const variantsTable = await queryRunner.getTable('article_variants');
    if (variantsTable?.foreignKeys.some((fk) => fk.columnNames.includes('measure_id'))) {
      await queryRunner.dropForeignKey('article_variants', 'FK_article_variants_measure');
      await queryRunner.dropColumn('article_variants', 'measure_id');
    }

    // CHECK price_type
    await queryRunner.query(`
      ALTER TABLE "article_variant_prices"
      DROP CONSTRAINT IF EXISTS "CHK_article_variant_prices_price_type_not_empty"
    `);

    // FK y columna unit_id (solo si la migración la creó - no eliminamos si existía)
    const pricesTable = await queryRunner.getTable('article_variant_prices');
    if (pricesTable?.foreignKeys.some((fk) => fk.columnNames.includes('unit_id'))) {
      await queryRunner.dropForeignKey('article_variant_prices', 'FK_article_variant_prices_unit');
      // No eliminamos unit_id por si existía antes de la migración
    }
  }
}

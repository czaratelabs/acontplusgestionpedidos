import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Búsqueda combinada: SKU/barcode exactos + FTS para nombres.
 * Añade search_vector en articles (name + observations) con GIN index.
 */
export class AddArticlesSearchVectorFts1742200000000 implements MigrationInterface {
  name = 'AddArticlesSearchVectorFts1742200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'articles'
        AND column_name = 'search_vector'
    `);
    if (hasColumn.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "articles"
        ADD COLUMN "search_vector" tsvector
        GENERATED ALWAYS AS (
          to_tsvector('spanish', coalesce(name, '') || ' ' || coalesce(observations, ''))
        ) STORED
      `);
    }

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_articles_search_vector"
      ON "articles" USING gin ("search_vector")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_articles_search_vector"`);
    await queryRunner.query(`
      ALTER TABLE "articles" DROP COLUMN IF EXISTS "search_vector"
    `);
  }
}

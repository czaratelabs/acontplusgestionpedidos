import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fixes: function to_tsvector(unknown, character varying, ...) does not exist
 * Drops any GIN/tsvector indexes or triggers on article tables
 * that may use to_tsvector with wrong argument types.
 */
export class DropBrokenTsvectorIndexes1741800000000 implements MigrationInterface {
  name = 'DropBrokenTsvectorIndexes1741800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop indexes that use to_tsvector (often malformed with wrong args)
    await queryRunner.query(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN
          SELECT indexname, schemaname
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND tablename = ANY(ARRAY['articles', 'article_variants', 'article_variant_prices', 'article_images', 'article_batches'])
            AND indexdef ILIKE '%to_tsvector%'
        LOOP
          EXECUTE format('DROP INDEX IF EXISTS %I.%I CASCADE', r.schemaname, r.indexname);
        END LOOP;
      END $$;
    `);

    // 2. Drop triggers whose function body contains to_tsvector
    await queryRunner.query(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN
          SELECT t.tgname AS tgname, c.relname AS tablename
          FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          JOIN pg_namespace n ON c.relnamespace = n.oid
          JOIN pg_proc p ON t.tgfoid = p.oid
          WHERE n.nspname = 'public'
            AND c.relname = ANY(ARRAY['articles', 'article_variants', 'article_variant_prices', 'article_images', 'article_batches'])
            AND NOT t.tgisinternal
            AND p.prosrc ILIKE '%to_tsvector%'
        LOOP
          EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', r.tgname, r.tablename);
        END LOOP;
      END $$;
    `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: we cannot recreate broken indexes/triggers
  }
}

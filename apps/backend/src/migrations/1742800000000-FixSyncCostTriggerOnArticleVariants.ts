import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Corrige el trigger trg_sync_cost_update en article_variants.
 * El trigger anterior llamaba fn_calculate_article_profitability(), que espera
 * NEW de article_variant_prices (con article_variant_id). En article_variants
 * NEW tiene "id", no "article_variant_id", causando:
 * "record 'new' has no field 'article_variant_id'"
 *
 * Solución: crear fn_sync_cost_to_profitability() específica para article_variants,
 * que al cambiar cost hace UPDATE en article_variant_prices para disparar su trigger.
 */
export class FixSyncCostTriggerOnArticleVariants1742800000000 implements MigrationInterface {
  name = 'FixSyncCostTriggerOnArticleVariants1742800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_sync_cost_update ON public.article_variants
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.fn_sync_cost_to_profitability()
      RETURNS TRIGGER AS $$
      BEGIN
        IF (OLD.cost IS DISTINCT FROM NEW.cost) THEN
          UPDATE article_variant_prices
          SET updated_at = now()
          WHERE article_variant_id = NEW.id;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_sync_cost_update
      AFTER UPDATE OF cost ON public.article_variants
      FOR EACH ROW EXECUTE FUNCTION public.fn_sync_cost_to_profitability()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_sync_cost_update ON public.article_variants
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS public.fn_sync_cost_to_profitability()
    `);
  }
}

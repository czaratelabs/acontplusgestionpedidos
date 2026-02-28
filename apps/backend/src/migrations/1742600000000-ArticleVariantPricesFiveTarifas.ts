import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Nuevo esquema de precios: 5 tarifas (precio_venta1-5, pvp1-5, rentabilidad1-5).
 * Rentabilidad calculada por trigger. Relación 1:1 variant-prices.
 */
export class ArticleVariantPricesFiveTarifas1742600000000 implements MigrationInterface {
  name = 'ArticleVariantPricesFiveTarifas1742600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_update_profitability ON public.article_variant_prices`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS public.fn_calculate_article_profitability()`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.article_variant_prices CASCADE`);

    await queryRunner.query(`
      CREATE TABLE public.article_variant_prices (
        id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        article_variant_id  UUID NOT NULL UNIQUE,
        precio_venta1       NUMERIC(18, 4) DEFAULT 0 NOT NULL,
        precio_venta2       NUMERIC(18, 4) DEFAULT 0 NOT NULL,
        precio_venta3       NUMERIC(18, 4) DEFAULT 0 NOT NULL,
        precio_venta4       NUMERIC(18, 4) DEFAULT 0 NOT NULL,
        precio_venta5       NUMERIC(18, 4) DEFAULT 0 NOT NULL,
        pvp1                NUMERIC(18, 4) DEFAULT 0 NOT NULL,
        pvp2                NUMERIC(18, 4) DEFAULT 0 NOT NULL,
        pvp3                NUMERIC(18, 4) DEFAULT 0 NOT NULL,
        pvp4                NUMERIC(18, 4) DEFAULT 0 NOT NULL,
        pvp5                NUMERIC(18, 4) DEFAULT 0 NOT NULL,
        rentabilidad1       NUMERIC(18, 2) DEFAULT 0 NOT NULL,
        rentabilidad2       NUMERIC(18, 2) DEFAULT 0 NOT NULL,
        rentabilidad3       NUMERIC(18, 2) DEFAULT 0 NOT NULL,
        rentabilidad4       NUMERIC(18, 2) DEFAULT 0 NOT NULL,
        rentabilidad5       NUMERIC(18, 2) DEFAULT 0 NOT NULL,
        unit_id             UUID REFERENCES public.measures(id) ON DELETE SET NULL,
        updated_at          TIMESTAMP DEFAULT now(),
        CONSTRAINT FK_prices_variant_v2 FOREIGN KEY (article_variant_id)
          REFERENCES public.article_variants(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.fn_calculate_article_profitability()
      RETURNS TRIGGER AS $$
      DECLARE
        v_cost NUMERIC(18, 4);
      BEGIN
        SELECT cost INTO v_cost FROM article_variants WHERE id = NEW.article_variant_id;
        IF NEW.precio_venta1 > 0 THEN NEW.rentabilidad1 := (NEW.precio_venta1 - v_cost); END IF;
        IF NEW.precio_venta2 > 0 THEN NEW.rentabilidad2 := (NEW.precio_venta2 - v_cost); END IF;
        IF NEW.precio_venta3 > 0 THEN NEW.rentabilidad3 := (NEW.precio_venta3 - v_cost); END IF;
        IF NEW.precio_venta4 > 0 THEN NEW.rentabilidad4 := (NEW.precio_venta4 - v_cost); END IF;
        IF NEW.precio_venta5 > 0 THEN NEW.rentabilidad5 := (NEW.precio_venta5 - v_cost); END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_update_profitability
      BEFORE INSERT OR UPDATE ON public.article_variant_prices
      FOR EACH ROW EXECUTE FUNCTION public.fn_calculate_article_profitability()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_update_profitability ON public.article_variant_prices`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS public.fn_calculate_article_profitability()`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.article_variant_prices CASCADE`);
    // Restore old table structure would require recreating price_type, price, is_default, created_at - omitted for brevity
  }
}

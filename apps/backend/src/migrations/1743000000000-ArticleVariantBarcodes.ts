import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Multi-barcode support: additional barcodes per variant (e.g. packaging, flavor).
 * Primary barcode remains on article_variants.barcode (Master Barcode).
 */
export class ArticleVariantBarcodes1743000000000 implements MigrationInterface {
  name = 'ArticleVariantBarcodes1743000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE public.article_variant_barcodes (
        id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        article_variant_id  UUID NOT NULL,
        barcode             VARCHAR(100) NOT NULL,
        description         VARCHAR(255) NULL,
        CONSTRAINT UQ_article_variant_barcodes_barcode UNIQUE (barcode),
        CONSTRAINT FK_variant_barcodes_variant FOREIGN KEY (article_variant_id)
          REFERENCES public.article_variants(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IDX_article_variant_barcodes_variant ON public.article_variant_barcodes(article_variant_id)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.article_variant_barcodes CASCADE`);
  }
}

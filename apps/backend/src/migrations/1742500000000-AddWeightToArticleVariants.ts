import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Add weight column to article_variants (decimal 10,2, nullable, default 0).
 */
export class AddWeightToArticleVariants1742500000000 implements MigrationInterface {
  name = 'AddWeightToArticleVariants1742500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const hasWeight = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'article_variants' AND column_name = 'weight'
    `);
    if (Array.isArray(hasWeight) && hasWeight.length > 0) return;

    await queryRunner.addColumn(
      'article_variants',
      new TableColumn({
        name: 'weight',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: true,
        default: 0,
      }),
    );
    await queryRunner.query(`
      UPDATE article_variants SET weight = 0 WHERE weight IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('article_variants', 'weight');
  }
}

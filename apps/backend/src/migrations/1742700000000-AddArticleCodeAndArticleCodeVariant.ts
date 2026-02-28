import { MigrationInterface, QueryRunner, TableColumn, TableUnique } from 'typeorm';

/**
 * Añade código maestro al artículo (único por company_id) y article_code a variantes.
 */
export class AddArticleCodeAndArticleCodeVariant1742700000000 implements MigrationInterface {
  name = 'AddArticleCodeAndArticleCodeVariant1742700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const articlesTable = await queryRunner.getTable('articles');
    const hasCode = articlesTable?.columns.find((c) => c.name === 'code');
    if (!hasCode) {
      await queryRunner.addColumn(
        'articles',
        new TableColumn({
          name: 'code',
          type: 'varchar',
          length: '100',
          isNullable: true,
        }),
      );
      await queryRunner.createUniqueConstraint(
        'articles',
        new TableUnique({
          name: 'UQ_articles_company_code',
          columnNames: ['company_id', 'code'],
        }),
      );
    }

    const variantsTable = await queryRunner.getTable('article_variants');
    const hasArticleCode = variantsTable?.columns.find((c) => c.name === 'article_code');
    if (!hasArticleCode) {
      await queryRunner.addColumn(
        'article_variants',
        new TableColumn({
          name: 'article_code',
          type: 'varchar',
          length: '100',
          isNullable: true,
        }),
      );
      // Sincronizar article_code desde el artículo padre (opcional, para datos existentes)
      await queryRunner.query(`
        UPDATE article_variants av
        SET article_code = a.code
        FROM articles a
        WHERE av.article_id = a.id AND a.code IS NOT NULL
      `);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.dropUniqueConstraint('articles', 'UQ_articles_company_code');
    } catch {
      // ignore if not exists
    }
    await queryRunner.dropColumn('articles', 'code').catch(() => {});
    await queryRunner.dropColumn('article_variants', 'article_code').catch(() => {});
  }
}

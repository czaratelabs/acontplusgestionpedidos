import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

/**
 * Normaliza article_variants: reemplaza color, size, flavor (varchar)
 * por color_id, size_id, flavor_id (FKs a catálogos).
 */
export class ArticleVariantsColorSizeFlavorIds1742400000000 implements MigrationInterface {
  name = 'ArticleVariantsColorSizeFlavorIds1742400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const hasColorId = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'article_variants' AND column_name = 'color_id'
    `);
    if (hasColorId.length > 0) return; // Ya migrado

    await queryRunner.addColumn(
      'article_variants',
      new TableColumn({ name: 'color_id', type: 'uuid', isNullable: true }),
    );
    await queryRunner.addColumn(
      'article_variants',
      new TableColumn({ name: 'size_id', type: 'uuid', isNullable: true }),
    );
    await queryRunner.addColumn(
      'article_variants',
      new TableColumn({ name: 'flavor_id', type: 'uuid', isNullable: true }),
    );

    // Migrar datos: vincular por nombre dentro de la misma empresa
    await queryRunner.query(`
      UPDATE article_variants v
      SET color_id = c.id
      FROM colors c
      WHERE v.company_id = c.company_id
        AND TRIM(v.color) = TRIM(c.name)
        AND v.color IS NOT NULL AND v.color <> ''
    `);
    await queryRunner.query(`
      UPDATE article_variants v
      SET size_id = s.id
      FROM sizes s
      WHERE v.company_id = s.company_id
        AND TRIM(v.size) = TRIM(s.name)
        AND v.size IS NOT NULL AND v.size <> ''
    `);
    await queryRunner.query(`
      UPDATE article_variants v
      SET flavor_id = f.id
      FROM flavors f
      WHERE v.company_id = f.company_id
        AND TRIM(v.flavor) = TRIM(f.name)
        AND v.flavor IS NOT NULL AND v.flavor <> ''
    `);

    await queryRunner.createForeignKey(
      'article_variants',
      new TableForeignKey({
        columnNames: ['color_id'],
        referencedTableName: 'colors',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        name: 'FK_article_variants_color',
      }),
    );
    await queryRunner.createForeignKey(
      'article_variants',
      new TableForeignKey({
        columnNames: ['size_id'],
        referencedTableName: 'sizes',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        name: 'FK_article_variants_size',
      }),
    );
    await queryRunner.createForeignKey(
      'article_variants',
      new TableForeignKey({
        columnNames: ['flavor_id'],
        referencedTableName: 'flavors',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        name: 'FK_article_variants_flavor',
      }),
    );

    await queryRunner.dropColumn('article_variants', 'color');
    await queryRunner.dropColumn('article_variants', 'size');
    await queryRunner.dropColumn('article_variants', 'flavor');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'article_variants',
      new TableColumn({ name: 'color', type: 'varchar', isNullable: true, length: '255' }),
    );
    await queryRunner.addColumn(
      'article_variants',
      new TableColumn({ name: 'size', type: 'varchar', isNullable: true, length: '255' }),
    );
    await queryRunner.addColumn(
      'article_variants',
      new TableColumn({ name: 'flavor', type: 'varchar', isNullable: true, length: '255' }),
    );
    await queryRunner.query(`
      UPDATE article_variants v SET color = c.name FROM colors c WHERE v.color_id = c.id
    `);
    await queryRunner.query(`
      UPDATE article_variants v SET size = s.name FROM sizes s WHERE v.size_id = s.id
    `);
    await queryRunner.query(`
      UPDATE article_variants v SET flavor = f.name FROM flavors f WHERE v.flavor_id = f.id
    `);
    await queryRunner.dropForeignKey('article_variants', 'FK_article_variants_color');
    await queryRunner.dropForeignKey('article_variants', 'FK_article_variants_size');
    await queryRunner.dropForeignKey('article_variants', 'FK_article_variants_flavor');
    await queryRunner.dropColumn('article_variants', 'color_id');
    await queryRunner.dropColumn('article_variants', 'size_id');
    await queryRunner.dropColumn('article_variants', 'flavor_id');
  }
}

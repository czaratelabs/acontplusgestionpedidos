import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateArticlesParentVariantModel1741500000000 implements MigrationInterface {
  name = 'CreateArticlesParentVariantModel1741500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'brands',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar' },
          { name: 'company_id', type: 'uuid', isNullable: false },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'brands',
      new TableForeignKey({
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'categories',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar' },
          { name: 'company_id', type: 'uuid', isNullable: false },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'categories',
      new TableForeignKey({
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'articles',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar' },
          { name: 'brand_id', type: 'uuid', isNullable: true },
          { name: 'category_id', type: 'uuid', isNullable: true },
          { name: 'tax_id', type: 'uuid', isNullable: true },
          { name: 'company_id', type: 'uuid', isNullable: false },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'articles',
      new TableForeignKey({
        columnNames: ['brand_id'],
        referencedTableName: 'brands',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
    await queryRunner.createForeignKey(
      'articles',
      new TableForeignKey({
        columnNames: ['category_id'],
        referencedTableName: 'categories',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
    await queryRunner.createForeignKey(
      'articles',
      new TableForeignKey({
        columnNames: ['tax_id'],
        referencedTableName: 'taxes',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
    await queryRunner.createForeignKey(
      'articles',
      new TableForeignKey({
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'article_variants',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'article_id', type: 'uuid', isNullable: false },
          { name: 'sku', type: 'varchar' },
          { name: 'barcode', type: 'varchar', isNullable: true },
          { name: 'cost', type: 'decimal', precision: 18, scale: 4, default: 0 },
          { name: 'color', type: 'varchar', isNullable: true },
          { name: 'size', type: 'varchar', isNullable: true },
          { name: 'flavor', type: 'varchar', isNullable: true },
          { name: 'measure', type: 'varchar', isNullable: true },
          { name: 'stock_actual', type: 'decimal', precision: 18, scale: 4, default: 0 },
          { name: 'stock_min', type: 'decimal', precision: 18, scale: 4, default: 0 },
          { name: 'company_id', type: 'uuid', isNullable: false },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'article_variants',
      new TableForeignKey({
        columnNames: ['article_id'],
        referencedTableName: 'articles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'article_variants',
      new TableForeignKey({
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_article_variants_company_sku" ON "article_variants" ("company_id", "sku")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_article_variants_barcode" ON "article_variants" ("barcode")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_article_variants_sku" ON "article_variants" ("sku")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_article_variants_company_id" ON "article_variants" ("company_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_article_variants_company_barcode" ON "article_variants" ("company_id", "barcode") WHERE "barcode" IS NOT NULL`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'article_variant_prices',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'article_variant_id', type: 'uuid', isNullable: false },
          { name: 'price_type', type: 'varchar' },
          { name: 'price', type: 'decimal', precision: 18, scale: 4 },
          { name: 'is_default', type: 'boolean', default: false },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'article_variant_prices',
      new TableForeignKey({
        columnNames: ['article_variant_id'],
        referencedTableName: 'article_variants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('article_variant_prices', true);
    await queryRunner.dropTable('article_variants', true);
    await queryRunner.dropTable('articles', true);
    await queryRunner.dropTable('categories', true);
    await queryRunner.dropTable('brands', true);
  }
}

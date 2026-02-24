import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddObservationsImagesBatches1741600000000 implements MigrationInterface {
  name = 'AddObservationsImagesBatches1741600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "observations" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "article_variants" ADD COLUMN IF NOT EXISTS "observations" TEXT`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'article_images',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'article_id', type: 'uuid', isNullable: false },
          { name: 'url', type: 'text', isNullable: false },
          { name: 'is_main', type: 'boolean', default: false },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'article_images',
      new TableForeignKey({
        columnNames: ['article_id'],
        referencedTableName: 'articles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'article_batches',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'article_variant_id', type: 'uuid', isNullable: false },
          { name: 'batch_number', type: 'varchar', length: '100', isNullable: false },
          { name: 'expiration_date', type: 'date', isNullable: true },
          { name: 'current_stock', type: 'decimal', precision: 18, scale: 4, default: 0 },
          { name: 'company_id', type: 'uuid', isNullable: false },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'article_batches',
      new TableForeignKey({
        columnNames: ['article_variant_id'],
        referencedTableName: 'article_variants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'article_batches',
      new TableForeignKey({
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('article_batches', true);
    await queryRunner.dropTable('article_images', true);
    await queryRunner.query(`ALTER TABLE "article_variants" DROP COLUMN IF EXISTS "observations"`);
    await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN IF EXISTS "observations"`);
  }
}

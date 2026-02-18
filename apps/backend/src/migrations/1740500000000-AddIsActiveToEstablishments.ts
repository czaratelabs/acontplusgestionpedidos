import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsActiveToEstablishments1740500000000 implements MigrationInterface {
  name = 'AddIsActiveToEstablishments1740500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('establishments');
    if (!table) return;

    const hasIsActive = table.columns.some((c) => c.name === 'is_active');
    if (hasIsActive) return;

    await queryRunner.addColumn(
      'establishments',
      new TableColumn({
        name: 'is_active',
        type: 'boolean',
        default: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('establishments', 'is_active');
  }
}

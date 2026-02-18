import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsActiveToContacts1740700000000 implements MigrationInterface {
  name = 'AddIsActiveToContacts1740700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('contacts');
    if (!table) return;

    const hasIsActive = table.columns.some((c) => c.name === 'is_active');
    if (hasIsActive) return;

    await queryRunner.addColumn(
      'contacts',
      new TableColumn({
        name: 'is_active',
        type: 'boolean',
        default: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('contacts', 'is_active');
  }
}

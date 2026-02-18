import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsActiveToEmissionPoints1740600000000 implements MigrationInterface {
  name = 'AddIsActiveToEmissionPoints1740600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('emission_points');
    if (!table) return;

    const hasIsActive = table.columns.some((c) => c.name === 'is_active');
    if (hasIsActive) return;

    await queryRunner.addColumn(
      'emission_points',
      new TableColumn({
        name: 'is_active',
        type: 'boolean',
        default: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('emission_points', 'is_active');
  }
}

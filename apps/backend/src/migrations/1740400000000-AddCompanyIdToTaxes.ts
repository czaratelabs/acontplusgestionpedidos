import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddCompanyIdToTaxes1740400000000 implements MigrationInterface {
  name = 'AddCompanyIdToTaxes1740400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('taxes');
    if (!table) return;

    const hasCompanyId = table.columns.some((c) => c.name === 'company_id');
    if (hasCompanyId) return;

    // Add as nullable first (table may have existing rows)
    await queryRunner.addColumn(
      'taxes',
      new TableColumn({
        name: 'company_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Backfill: assign first company to existing rows
    await queryRunner.query(`
      UPDATE taxes
      SET company_id = (SELECT id FROM companies LIMIT 1)
      WHERE company_id IS NULL
    `);

    // Make NOT NULL
    await queryRunner.changeColumn(
      'taxes',
      'company_id',
      new TableColumn({
        name: 'company_id',
        type: 'uuid',
        isNullable: false,
      }),
    );

    await queryRunner.createForeignKey(
      'taxes',
      new TableForeignKey({
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('taxes');
    if (!table) return;

    const fk = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('company_id') !== -1,
    );
    if (fk) {
      await queryRunner.dropForeignKey('taxes', fk);
    }

    await queryRunner.dropColumn('taxes', 'company_id');
  }
}

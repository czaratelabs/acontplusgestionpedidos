import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddCompanyToSystemSettings1739632800000 implements MigrationInterface {
  name = 'AddCompanyToSystemSettings1739632800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('system_settings');

    if (!table) {
      await queryRunner.query(`
        CREATE TABLE "system_settings" (
          "company_id" uuid NOT NULL,
          "key" varchar NOT NULL,
          "value" text NOT NULL,
          "description" varchar,
          CONSTRAINT "PK_system_settings" PRIMARY KEY ("company_id", "key"),
          CONSTRAINT "FK_system_settings_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
        )
      `);
      return;
    }

    const hasCompanyId = table.columns.some((c) => c.name === 'company_id');
    if (hasCompanyId) {
      return;
    }

    // Add as nullable first (table has existing rows)
    await queryRunner.addColumn(
      'system_settings',
      new TableColumn({
        name: 'company_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Backfill: assign first company to existing rows
    await queryRunner.query(`
      UPDATE system_settings
      SET company_id = (SELECT id FROM companies LIMIT 1)
      WHERE company_id IS NULL
    `);

    // Make NOT NULL
    await queryRunner.changeColumn(
      'system_settings',
      'company_id',
      new TableColumn({
        name: 'company_id',
        type: 'uuid',
        isNullable: false,
      }),
    );

    await queryRunner.createForeignKey(
      'system_settings',
      new TableForeignKey({
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('system_settings');
    if (!table) return;

    const fk = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('company_id') !== -1,
    );
    if (fk) {
      await queryRunner.dropForeignKey('system_settings', fk);
    }

    await queryRunner.dropColumn('system_settings', 'company_id');
  }
}

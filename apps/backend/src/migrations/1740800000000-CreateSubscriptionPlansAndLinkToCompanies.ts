import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey } from 'typeorm';

export class CreateSubscriptionPlansAndLinkToCompanies1740800000000 implements MigrationInterface {
  name = 'CreateSubscriptionPlansAndLinkToCompanies1740800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'subscription_plans',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          { name: 'name', type: 'varchar' },
          { name: 'price', type: 'decimal', precision: 12, scale: 2 },
          { name: 'implementation_fee', type: 'decimal', precision: 12, scale: 2, default: 0 },
          { name: 'limits', type: 'jsonb', default: "'{}'" },
          { name: 'modules', type: 'jsonb', default: "'{}'" },
          { name: 'is_active', type: 'boolean', default: true },
        ],
      }),
      true,
    );

    await queryRunner.query(`
      INSERT INTO subscription_plans (id, name, price, implementation_fee, limits, modules, is_active)
      VALUES
        (
          uuid_generate_v4(),
          'Plan Pyme',
          45.00,
          0,
          '{"max_sellers": 3, "max_establishments": 1, "max_warehouses": 1, "max_inventory_items": 500, "storage_gb": 1}',
          '{"audit": true, "logistics": false, "business_rules": true, "sri": true}',
          true
        ),
        (
          uuid_generate_v4(),
          'Plan Crecimiento',
          95.00,
          0,
          '{"max_sellers": 10, "max_establishments": 2, "max_warehouses": 3, "max_inventory_items": 5000, "storage_gb": 10}',
          '{"audit": true, "logistics": true, "business_rules": true, "sri": true}',
          true
        ),
        (
          uuid_generate_v4(),
          'Plan Corporativo',
          190.00,
          0,
          '{"max_sellers": -1, "max_establishments": -1, "max_warehouses": -1, "max_inventory_items": -1, "storage_gb": 50}',
          '{"audit": true, "logistics": true, "business_rules": true, "sri": true}',
          true
        )
    `);

    await queryRunner.addColumn(
      'companies',
      new TableColumn({
        name: 'plan_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      'companies',
      new TableForeignKey({
        columnNames: ['plan_id'],
        referencedTableName: 'subscription_plans',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const companiesTable = await queryRunner.getTable('companies');
    const fk = companiesTable?.foreignKeys.find((k) => k.columnNames.includes('plan_id'));
    if (fk) await queryRunner.dropForeignKey('companies', fk);
    await queryRunner.dropColumn('companies', 'plan_id');
    await queryRunner.dropTable('subscription_plans');
  }
}

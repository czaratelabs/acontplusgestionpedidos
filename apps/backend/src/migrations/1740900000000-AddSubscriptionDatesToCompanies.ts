import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSubscriptionDatesToCompanies1740900000000 implements MigrationInterface {
  name = 'AddSubscriptionDatesToCompanies1740900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'companies',
      new TableColumn({
        name: 'subscription_start_date',
        type: 'date',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'companies',
      new TableColumn({
        name: 'subscription_end_date',
        type: 'date',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'companies',
      new TableColumn({
        name: 'subscription_period',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('companies', 'subscription_start_date');
    await queryRunner.dropColumn('companies', 'subscription_end_date');
    await queryRunner.dropColumn('companies', 'subscription_period');
  }
}

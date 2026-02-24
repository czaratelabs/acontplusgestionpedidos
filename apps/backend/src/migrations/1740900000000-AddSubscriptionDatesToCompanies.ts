import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionDatesToCompanies1740900000000 implements MigrationInterface {
  name = 'AddSubscriptionDatesToCompanies1740900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('companies');
    const columns = table?.columns.map((c) => c.name) ?? [];

    if (!columns.includes('subscription_start_date')) {
      await queryRunner.query(
        `ALTER TABLE "companies" ADD "subscription_start_date" date`,
      );
    }
    if (!columns.includes('subscription_end_date')) {
      await queryRunner.query(
        `ALTER TABLE "companies" ADD "subscription_end_date" date`,
      );
    }
    if (!columns.includes('subscription_period')) {
      await queryRunner.query(
        `ALTER TABLE "companies" ADD "subscription_period" character varying(20)`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('companies', 'subscription_start_date');
    await queryRunner.dropColumn('companies', 'subscription_end_date');
    await queryRunner.dropColumn('companies', 'subscription_period');
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPlanCrecimientoMaxEstablishments1741100000000 implements MigrationInterface {
  name = 'FixPlanCrecimientoMaxEstablishments1741100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE subscription_plans
      SET limits = jsonb_set(limits, '{max_establishments}', '2')
      WHERE name = 'Plan Crecimiento'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE subscription_plans
      SET limits = jsonb_set(limits, '{max_establishments}', '3')
      WHERE name = 'Plan Crecimiento'
    `);
  }
}

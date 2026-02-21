import { MigrationInterface, QueryRunner } from 'typeorm';

export class IncreasePlanPymeMaxEstablishments1741200000000 implements MigrationInterface {
  name = 'IncreasePlanPymeMaxEstablishments1741200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE subscription_plans
      SET limits = jsonb_set(limits, '{max_establishments}', '2')
      WHERE name = 'Plan Pyme'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE subscription_plans
      SET limits = jsonb_set(limits, '{max_establishments}', '1')
      WHERE name = 'Plan Pyme'
    `);
  }
}

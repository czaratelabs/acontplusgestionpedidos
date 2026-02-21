import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds max_total_users to plans that only have max_sellers.
 * Sets max_total_users = max_sellers for backward compatibility (total users cap = sellers cap).
 */
export class AddMaxTotalUsersToSubscriptionPlans1741300000000 implements MigrationInterface {
  name = 'AddMaxTotalUsersToSubscriptionPlans1741300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE subscription_plans
      SET limits = jsonb_set(
        limits,
        '{max_total_users}',
        to_jsonb(COALESCE((limits->>'max_sellers')::int, -1))
      )
      WHERE limits->>'max_total_users' IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE subscription_plans
      SET limits = limits - 'max_total_users'
      WHERE limits ? 'max_total_users'
    `);
  }
}

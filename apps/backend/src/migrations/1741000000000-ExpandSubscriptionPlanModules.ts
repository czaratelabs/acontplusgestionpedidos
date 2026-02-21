import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandSubscriptionPlanModules1741000000000 implements MigrationInterface {
  name = 'ExpandSubscriptionPlanModules1741000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const modulesJson = JSON.stringify({
      directory_clients: true,
      directory_providers: true,
      directory_employees: true,
      admin_users_roles: true,
      admin_establishments: true,
      admin_company_config: true,
      admin_general_config: true,
      admin_taxes: true,
      admin_audit: true,
      admin_roles: true,
      admin_business_rules: true,
      audit: true,
      logistics: true,
      business_rules: true,
      sri: true,
    });

    await queryRunner.query(
      `UPDATE subscription_plans SET modules = modules || $1::jsonb WHERE name IN ('Plan Pyme', 'Plan Crecimiento', 'Plan Corporativo')`,
      [modulesJson],
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the new keys, restore previous structure
    await queryRunner.query(`
      UPDATE subscription_plans
      SET modules = modules - 'directory_clients' - 'directory_providers' - 'directory_employees'
          - 'admin_users_roles' - 'admin_establishments' - 'admin_company_config'
          - 'admin_general_config' - 'admin_taxes' - 'admin_audit' - 'admin_roles' - 'admin_business_rules'
      WHERE name IN ('Plan Pyme', 'Plan Crecimiento', 'Plan Corporativo')
    `);
  }
}

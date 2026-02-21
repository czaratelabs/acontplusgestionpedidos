import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsSuperAdminToUsers1741400000000 implements MigrationInterface {
  name = 'AddIsSuperAdminToUsers1741400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'is_super_admin',
        type: 'boolean',
        default: false,
      }),
    );

    // Mark superadmin@acontplus.com as SuperAdmin and remove from user_companies (fully decoupled)
    await queryRunner.query(`
      UPDATE users SET is_super_admin = true
      WHERE LOWER(email) = 'superadmin@acontplus.com'
    `);
    await queryRunner.query(`
      DELETE FROM user_companies
      WHERE user_id IN (SELECT id FROM users WHERE LOWER(email) = 'superadmin@acontplus.com')
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'is_super_admin');
  }
}

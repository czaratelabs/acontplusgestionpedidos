import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyAndIsActiveToRoles1740100000000 implements MigrationInterface {
  name = 'AddCompanyAndIsActiveToRoles1740100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing unique constraint on name (will be replaced by partial indexes)
    await queryRunner.query(`
      ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "UQ_roles_name"
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      ADD COLUMN IF NOT EXISTS "company_id" uuid,
      ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true
    `);

    const table = await queryRunner.getTable('roles');
    const hasFk = table?.foreignKeys.some((fk) =>
      fk.columnNames.includes('company_id'),
    );
    if (!hasFk) {
      await queryRunner.query(`
        ALTER TABLE "roles"
        ADD CONSTRAINT "FK_roles_company" FOREIGN KEY ("company_id")
        REFERENCES "companies"("id") ON DELETE CASCADE
      `);
    }

    // Unique: system roles (company_id IS NULL) - name must be unique
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_roles_name_system"
      ON "roles" ("name") WHERE "company_id" IS NULL
    `);

    // Unique: company roles - (name, company_id) must be unique
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_roles_name_company"
      ON "roles" ("name", "company_id") WHERE "company_id" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_roles_name_company"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_roles_name_system"`);

    const table = await queryRunner.getTable('roles');
    const fk = table?.foreignKeys.find((k) => k.columnNames.includes('company_id'));
    if (fk) await queryRunner.dropForeignKey('roles', fk);

    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN IF EXISTS "company_id"`);
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN IF EXISTS "is_active"`);

    await queryRunner.query(`
      ALTER TABLE "roles" ADD CONSTRAINT "UQ_roles_name" UNIQUE ("name")
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserMultiCompanyRoles1740000000000 implements MigrationInterface {
  name = 'UserMultiCompanyRoles1740000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create roles table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" character varying,
        CONSTRAINT "PK_roles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_roles_name" UNIQUE ("name")
      )
    `);

    // 2. Insert default roles (ignore if already exist)
    await queryRunner.query(`
      INSERT INTO "roles" ("name", "description")
      VALUES
        ('owner', 'Propietario de la empresa'),
        ('admin', 'Administrador'),
        ('seller', 'Vendedor')
      ON CONFLICT (name) DO NOTHING
    `);

    // 3. Create user_companies table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_companies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "company_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_user_companies" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_companies_user_company" UNIQUE ("user_id", "company_id"),
        CONSTRAINT "FK_user_companies_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_companies_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_companies_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_companies_user_id" ON "user_companies" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_companies_company_id" ON "user_companies" ("company_id")`,
    );

    // 4. Migrate existing data: users -> user_companies (only if users still has company_id and role)
    const usersTable = await queryRunner.getTable('users');
    const hasCompanyId = usersTable?.columns.some((c) => c.name === 'company_id');
    const hasRole = usersTable?.columns.some((c) => c.name === 'role');

    if (hasCompanyId && hasRole) {
      await queryRunner.query(`
        INSERT INTO "user_companies" ("user_id", "company_id", "role_id", "is_active")
        SELECT u.id, u.company_id, r.id, COALESCE(u.is_active, true)
        FROM "users" u
        INNER JOIN "roles" r ON r.name = LOWER(COALESCE(u.role, 'seller'))
        WHERE NOT EXISTS (
          SELECT 1 FROM "user_companies" uc
          WHERE uc.user_id = u.id AND uc.company_id = u.company_id
        )
      `);
    }

    // 5. Drop FK on users.company_id (find and drop by column)
    const companyIdFk = usersTable?.foreignKeys.find(
      (fk) => fk.columnNames.includes('company_id'),
    );
    if (companyIdFk) {
      await queryRunner.dropForeignKey('users', companyIdFk);
    }

    // 6. Drop company_id and role columns from users
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "company_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Restore company_id and role columns
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "company_id" uuid,
      ADD COLUMN "role" character varying DEFAULT 'seller'
    `);

    // Restore data from user_companies (pick first company per user)
    await queryRunner.query(`
      UPDATE "users" u
      SET
        company_id = uc.company_id,
        role = r.name
      FROM "user_companies" uc
      INNER JOIN "roles" r ON r.id = uc.role_id
      WHERE uc.user_id = u.id
      AND uc.id = (
        SELECT id FROM "user_companies"
        WHERE user_id = u.id
        ORDER BY company_id
        LIMIT 1
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "company_id" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "fk_company" FOREIGN KEY ("company_id")
      REFERENCES "companies"("id") ON DELETE CASCADE
    `);

    // Drop user_companies and roles
    await queryRunner.query(`DROP TABLE IF EXISTS "user_companies"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class BusinessRulesAndCleanCompany1740200000000
  implements MigrationInterface
{
  name = 'BusinessRulesAndCleanCompany1740200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create business_rules table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "business_rules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "rule_key" character varying NOT NULL,
        "is_enabled" boolean NOT NULL DEFAULT false,
        "metadata" jsonb,
        CONSTRAINT "PK_business_rules" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_business_rules_company_rule" UNIQUE ("company_id", "rule_key"),
        CONSTRAINT "FK_business_rules_company" FOREIGN KEY ("company_id") 
          REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_business_rules_company_id" ON "business_rules" ("company_id")`,
    );

    // 2. Migrate prevent_negative_stock from companies to business_rules (if column exists)
    const companiesTable = await queryRunner.getTable('companies');
    const hasPreventNegative = companiesTable?.columns.some(
      (c) => c.name === 'prevent_negative_stock',
    );

    if (hasPreventNegative) {
      await queryRunner.query(`
        INSERT INTO "business_rules" ("company_id", "rule_key", "is_enabled")
        SELECT id, 'INVENTORY_PREVENT_NEGATIVE_STOCK', COALESCE(prevent_negative_stock, false)
        FROM "companies"
      `);
    }

    // 3. Drop decimal_precision and prevent_negative_stock from companies
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN IF EXISTS "decimal_precision"`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN IF EXISTS "prevent_negative_stock"`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Restore columns
    await queryRunner.query(`
      ALTER TABLE "companies"
      ADD COLUMN IF NOT EXISTS "decimal_precision" integer DEFAULT 2,
      ADD COLUMN IF NOT EXISTS "prevent_negative_stock" boolean DEFAULT false
    `);

    await queryRunner.query(`
      UPDATE "companies" c
      SET prevent_negative_stock = COALESCE((
        SELECT br.is_enabled FROM "business_rules" br
        WHERE br.company_id = c.id AND br.rule_key = 'INVENTORY_PREVENT_NEGATIVE_STOCK'
        LIMIT 1
      ), false)
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "business_rules"`);
  }
}

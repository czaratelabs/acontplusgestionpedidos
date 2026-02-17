import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterAuditLogsPerformedByToUuid1740300000000
  implements MigrationInterface
{
  name = 'AlterAuditLogsPerformedByToUuid1740300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Clean any non-UUID values (set to NULL)
    // UUID format: 8-4-4-4-12 hex digits (e.g., 550e8400-e29b-41d4-a716-446655440000)
    await queryRunner.query(`
      UPDATE audit_logs 
      SET performed_by = NULL
      WHERE performed_by IS NOT NULL 
        AND performed_by !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    `);

    // Step 2: Drop the foreign key constraint if it exists (TypeORM may have created it)
    const table = await queryRunner.getTable('audit_logs');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('performed_by') !== -1,
    );
    
    if (foreignKey) {
      await queryRunner.query(
        `ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS "${foreignKey.name}"`,
      );
    }

    // Step 3: Alter the column type from varchar to uuid
    await queryRunner.query(`
      ALTER TABLE audit_logs
      ALTER COLUMN performed_by TYPE uuid USING performed_by::uuid
    `);

    // Step 4: Recreate the foreign key constraint
    await queryRunner.query(`
      ALTER TABLE audit_logs
      ADD CONSTRAINT "FK_audit_logs_performed_by" 
      FOREIGN KEY ("performed_by") 
      REFERENCES "users"("id") 
      ON DELETE SET NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the foreign key constraint
    await queryRunner.query(`
      ALTER TABLE audit_logs
      DROP CONSTRAINT IF EXISTS "FK_audit_logs_performed_by"
    `);

    // Revert column type from uuid to varchar
    await queryRunner.query(`
      ALTER TABLE audit_logs
      ALTER COLUMN performed_by TYPE varchar USING performed_by::text
    `);
  }
}

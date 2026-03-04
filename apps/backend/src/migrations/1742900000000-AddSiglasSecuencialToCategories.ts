import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Añade siglas y secuencial a categories.
 * - siglas: código corto generado del nombre (editable por backend en create/update).
 * - secuencial: contador que se incrementa al crear artículos en la categoría.
 */
export class AddSiglasSecuencialToCategories1742900000000 implements MigrationInterface {
  name = 'AddSiglasSecuencialToCategories1742900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "categories"
      ADD COLUMN "siglas" varchar(20) DEFAULT '' NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "categories"
      ADD COLUMN "secuencial" integer DEFAULT 1 NOT NULL
    `);

    // Generar siglas para categorías existentes
    const rows = await queryRunner.query(`
      SELECT id, name FROM "categories"
    `);
    for (const row of rows) {
      const siglas = this.computeSiglas(row.name || '');
      await queryRunner.query(
        `UPDATE "categories" SET "siglas" = $1, "secuencial" = COALESCE("secuencial", 1) WHERE "id" = $2`,
        [siglas, row.id],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "siglas"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "secuencial"`);
  }

  private computeSiglas(name: string): string {
    const trimmed = (name || '').trim();
    if (!trimmed) return '';
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      return words[0].slice(0, 3).toUpperCase();
    }
    const parts = words.map((w, i) => (i === 0 ? w.slice(0, 2) : w.slice(0, 1)));
    return parts.join('').toUpperCase();
  }
}

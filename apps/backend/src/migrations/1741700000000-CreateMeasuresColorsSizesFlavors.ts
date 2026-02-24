import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateMeasuresColorsSizesFlavors1741700000000 implements MigrationInterface {
  name = 'CreateMeasuresColorsSizesFlavors1741700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      { name: 'measures', label: 'Medidas' },
      { name: 'colors', label: 'Colores' },
      { name: 'sizes', label: 'Tallas' },
      { name: 'flavors', label: 'Sabores' },
    ];

    for (const { name } of tables) {
      await queryRunner.createTable(
        new Table({
          name,
          columns: [
            { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
            { name: 'name', type: 'varchar', isNullable: false },
            { name: 'company_id', type: 'uuid', isNullable: false },
            { name: 'created_at', type: 'timestamp', default: 'now()' },
            { name: 'updated_at', type: 'timestamp', default: 'now()' },
          ],
        }),
        true,
      );
      await queryRunner.createForeignKey(
        name,
        new TableForeignKey({
          columnNames: ['company_id'],
          referencedTableName: 'companies',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const name of ['measures', 'colors', 'sizes', 'flavors']) {
      await queryRunner.dropTable(name, true);
    }
  }
}

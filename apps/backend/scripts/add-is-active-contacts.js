"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const data_source_1 = require("../src/data-source");
async function run() {
    await data_source_1.AppDataSource.initialize();
    try {
        await data_source_1.AppDataSource.query(`
      ALTER TABLE contacts
      ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true
    `);
        console.log('Columna is_active añadida (o ya existía) en contacts.');
    }
    finally {
        await data_source_1.AppDataSource.destroy();
    }
}
run().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=add-is-active-contacts.js.map
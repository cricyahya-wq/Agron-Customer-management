/**
 * api/database.js
 * Uses @libsql/client to connect to Turso (hosted libSQL / SQLite).
 * Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN as environment variables
 * in your Vercel project settings.
 *
 * For local development you can use a local SQLite file by setting:
 *   TURSO_DATABASE_URL=file:./customers.db
 *   TURSO_AUTH_TOKEN=   (leave empty for local file)
 */
const { createClient } = require('@libsql/client/node');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./customers.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

/**
 * Initialize the database: create table if it doesn't exist and seed
 * sample data if the table is empty.
 */
async function initDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_details TEXT,
      phone_number TEXT,
      crop_type TEXT,
      area_of_crop TEXT,
      season TEXT,
      location TEXT
    )
  `);

  const result = await db.execute('SELECT COUNT(*) AS count FROM customers');
  const count = result.rows[0].count;

  if (count === 0) {
    console.log('Seeding initial data...');
    const sampleData = [
      ['John Doe',       '555-0100', 'Wheat',     '50 acres',  'Kharif', 'Punjab'],
      ['Jane Smith',     '555-0101', 'Rice',      '120 acres', 'Rabi',   'Haryana'],
      ['Bob Johnson',    '555-0102', 'Maize',     '30 acres',  'Kharif', 'Punjab'],
      ['Alice Brown',    '555-0103', 'Wheat',     '45 acres',  'Rabi',   'Uttar Pradesh'],
      ['Charlie Davis',  '555-0104', 'Sugarcane', '80 acres',  'Zaid',   'Maharashtra'],
    ];

    for (const row of sampleData) {
      await db.execute({
        sql: 'INSERT INTO customers (customer_details, phone_number, crop_type, area_of_crop, season, location) VALUES (?,?,?,?,?,?)',
        args: row,
      });
    }
  }
}

// Run init once when the module loads (Vercel reuses warm instances)
initDatabase().catch(console.error);

module.exports = db;

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

const isVercel = process.env.VERCEL === '1';
const defaultDbPath = isVercel ? 'file:/tmp/customers.db' : 'file:./customers.db';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || defaultDbPath,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

/**
 * Initialize the database: create table if it doesn't exist.
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

  // Seed mock data if the database is empty
  const countRes = await db.execute('SELECT COUNT(*) as count FROM customers');
  if (countRes.rows[0].count === 0 || countRes.rows[0].count === 0n) {
    const mockData = [
      ['John Doe', '555-0101', 'Wheat', '50 acres', 'Spring', 'Midwest'],
      ['Jane Smith', '555-0102', 'Corn', '100 acres', 'Summer', 'Plains'],
      ['Bob Johnson', '555-0103', 'Soybeans', '75 acres', 'Fall', 'Valley'],
      ['Alice Brown', '555-0104', 'Rice', '200 acres', 'Summer', 'Delta']
    ];
    for (const data of mockData) {
      await db.execute({
        sql: 'INSERT INTO customers (customer_details, phone_number, crop_type, area_of_crop, season, location) VALUES (?,?,?,?,?,?)',
        args: data
      });
    }
  }
}

// Run init once when the module loads (Vercel reuses warm instances)
initDatabase().catch(console.error);

module.exports = db;

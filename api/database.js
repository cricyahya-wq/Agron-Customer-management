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
}

// Run init once when the module loads (Vercel reuses warm instances)
initDatabase().catch(console.error);

module.exports = db;

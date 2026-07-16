/**
 * api/index.js
 * Express app exported as a Vercel Serverless Function.
 * All routes under /api are handled here.
 * Vercel calls this module's default export for every request to /api/*.
 *
 * Data is read from BOTH tables:
 *   - agron_customers_500  (500 imported CSV records, column: phone_numbers)
 *   - customers            (manually added records,   column: phone_number)
 * Both are unified via a UNION query with phone_number aliased consistently.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database');
const authMiddleware = require('./authMiddleware');

const app = express();

app.use(cors());
app.use(express.json());

// Protect all routes with Bearer token auth
app.use('/', authMiddleware);

/**
 * UNION view that merges both tables, normalising column names.
 * phone_numbers (agron_customers_500) is aliased as phone_number.
 */
const ALL_CUSTOMERS_SQL = `
  SELECT id, customer_details, phone_numbers AS phone_number, crop_type, area_of_crop, season, location
  FROM   agron_customers_500
  UNION ALL
  SELECT id, customer_details, phone_number,                  crop_type, area_of_crop, season, location
  FROM   customers
`;

// ── Dashboard stats ──────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const [totalCustomers, uniqueCrops, uniqueLocations, uniqueSeasons, recentlyAdded] =
      await Promise.all([
        db.execute(`SELECT COUNT(*) AS totalCustomers FROM (${ALL_CUSTOMERS_SQL})`),
        db.execute(`SELECT COUNT(DISTINCT crop_type) AS uniqueCrops FROM (${ALL_CUSTOMERS_SQL})`),
        db.execute(`SELECT COUNT(DISTINCT location) AS uniqueLocations FROM (${ALL_CUSTOMERS_SQL})`),
        db.execute(`SELECT COUNT(DISTINCT season) AS uniqueSeasons FROM (${ALL_CUSTOMERS_SQL})`),
        db.execute(`SELECT * FROM (${ALL_CUSTOMERS_SQL}) ORDER BY id DESC LIMIT 5`),
      ]);

    res.json({
      data: {
        totalCustomers:  totalCustomers.rows[0].totalCustomers,
        uniqueCrops:     uniqueCrops.rows[0].uniqueCrops,
        uniqueLocations: uniqueLocations.rows[0].uniqueLocations,
        uniqueSeasons:   uniqueSeasons.rows[0].uniqueSeasons,
        recentlyAdded:   recentlyAdded.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get all customers ─────────────────────────────────────────────────────────
app.get('/api/customers', async (req, res) => {
  try {
    const result = await db.execute(`${ALL_CUSTOMERS_SQL}`);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Add a new customer ────────────────────────────────────────────────────────
app.post('/api/customers', async (req, res) => {
  const { customer_details, phone_number, crop_type, area_of_crop, season, location } = req.body;

  if (!customer_details || !phone_number || !crop_type || !area_of_crop || !season || !location) {
    return res.status(400).json({ error: 'Please provide all details' });
  }

  try {
    const result = await db.execute({
      sql: 'INSERT INTO customers (customer_details, phone_number, crop_type, area_of_crop, season, location) VALUES (?,?,?,?,?,?)',
      args: [customer_details, phone_number, crop_type, area_of_crop, season, location],
    });
    res.json({ message: 'success', data: { id: Number(result.lastInsertRowid), ...req.body } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Group customers by a field ────────────────────────────────────────────────
app.get('/api/customers/grouped/:field', async (req, res) => {
  const field = req.params.field;
  const allowedFields = ['crop_type', 'season', 'location'];

  if (!allowedFields.includes(field)) {
    return res.status(400).json({ error: 'Invalid grouping field' });
  }

  try {
    const result = await db.execute(
      `SELECT ${field}, COUNT(id) as count FROM (${ALL_CUSTOMERS_SQL}) GROUP BY ${field} ORDER BY count DESC`
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Compatibility routes for direct grouping fields (e.g. /api/crop_type)
app.get('/api/:field', async (req, res, next) => {
  const field = req.params.field;
  const allowedFields = ['crop_type', 'season', 'location'];
  if (!allowedFields.includes(field)) {
    return next();
  }
  try {
    const result = await db.execute(
      `SELECT ${field}, COUNT(id) as count FROM (${ALL_CUSTOMERS_SQL}) GROUP BY ${field} ORDER BY count DESC`
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Delete a customer ─────────────────────────────────────────────────────────
// Tries agron_customers_500 first, then customers table
app.delete('/api/customers/:id', async (req, res) => {
  try {
    const r1 = await db.execute({ sql: 'DELETE FROM agron_customers_500 WHERE id = ?', args: [req.params.id] });
    if (r1.rowsAffected > 0) return res.json({ message: 'deleted', changes: r1.rowsAffected });
    const r2 = await db.execute({ sql: 'DELETE FROM customers WHERE id = ?', args: [req.params.id] });
    res.json({ message: 'deleted', changes: r2.rowsAffected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Edit a customer ───────────────────────────────────────────────────────────
// Tries agron_customers_500 first, then customers table
app.put('/api/customers/:id', async (req, res) => {
  const { customer_details, phone_number, crop_type, area_of_crop, season, location } = req.body;

  if (!customer_details || !phone_number || !crop_type || !area_of_crop || !season || !location) {
    return res.status(400).json({ error: 'Please provide all details' });
  }

  try {
    const r1 = await db.execute({
      sql: `UPDATE agron_customers_500
            SET customer_details = ?, phone_numbers = ?, crop_type = ?,
                area_of_crop = ?, season = ?, location = ?
            WHERE id = ?`,
      args: [customer_details, phone_number, crop_type, area_of_crop, season, location, req.params.id],
    });
    if (r1.rowsAffected > 0) return res.json({ message: 'updated', changes: r1.rowsAffected });

    const r2 = await db.execute({
      sql: `UPDATE customers
            SET customer_details = ?, phone_number = ?, crop_type = ?,
                area_of_crop = ?, season = ?, location = ?
            WHERE id = ?`,
      args: [customer_details, phone_number, crop_type, area_of_crop, season, location, req.params.id],
    });
    res.json({ message: 'updated', changes: r2.rowsAffected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export for Vercel — do NOT call app.listen()
module.exports = app;

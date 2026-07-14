/**
 * api/index.js
 * Express app exported as a Vercel Serverless Function.
 * All routes under /api are handled here.
 * Vercel calls this module's default export for every request to /api/*.
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

// ── Dashboard stats ──────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const [totalCustomers, uniqueCrops, uniqueLocations, uniqueSeasons, recentlyAdded] =
      await Promise.all([
        db.execute('SELECT COUNT(*) AS totalCustomers FROM customers'),
        db.execute('SELECT COUNT(DISTINCT crop_type) AS uniqueCrops FROM customers'),
        db.execute('SELECT COUNT(DISTINCT location) AS uniqueLocations FROM customers'),
        db.execute('SELECT COUNT(DISTINCT season) AS uniqueSeasons FROM customers'),
        db.execute('SELECT * FROM customers ORDER BY id DESC LIMIT 5'),
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
    const result = await db.execute('SELECT * FROM customers');
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
      `SELECT ${field}, COUNT(id) as count FROM customers GROUP BY ${field} ORDER BY count DESC`
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Delete a customer ─────────────────────────────────────────────────────────
app.delete('/api/customers/:id', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'DELETE FROM customers WHERE id = ?',
      args: [req.params.id],
    });
    res.json({ message: 'deleted', changes: result.rowsAffected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Edit a customer ───────────────────────────────────────────────────────────
app.put('/api/customers/:id', async (req, res) => {
  const { customer_details, phone_number, crop_type, area_of_crop, season, location } = req.body;

  if (!customer_details || !phone_number || !crop_type || !area_of_crop || !season || !location) {
    return res.status(400).json({ error: 'Please provide all details' });
  }

  try {
    const result = await db.execute({
      sql: `UPDATE customers
            SET customer_details = ?, phone_number = ?, crop_type = ?,
                area_of_crop = ?, season = ?, location = ?
            WHERE id = ?`,
      args: [customer_details, phone_number, crop_type, area_of_crop, season, location, req.params.id],
    });
    res.json({ message: 'updated', changes: result.rowsAffected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export for Vercel — do NOT call app.listen()
module.exports = app;

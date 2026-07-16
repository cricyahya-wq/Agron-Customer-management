const { createClient } = require('@libsql/client/node');
require('dotenv').config({ path: './.env.turso' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const ALL = `
  SELECT id, customer_details, phone_numbers AS phone_number, crop_type, area_of_crop, season, location
  FROM agron_customers_500
  UNION ALL
  SELECT id, customer_details, phone_number, crop_type, area_of_crop, season, location
  FROM customers
`;

async function check() {
  const crops    = await db.execute(`SELECT DISTINCT crop_type, COUNT(*) as cnt FROM (${ALL}) GROUP BY crop_type ORDER BY cnt DESC`);
  const seasons  = await db.execute(`SELECT DISTINCT season, COUNT(*) as cnt FROM (${ALL}) GROUP BY season ORDER BY cnt DESC`);
  const locs     = await db.execute(`SELECT DISTINCT location, COUNT(*) as cnt FROM (${ALL}) GROUP BY location ORDER BY cnt DESC`);
  console.log('CROPS:', crops.rows.map(r => `${r.crop_type} (${r.cnt})`));
  console.log('\nSEASONS:', seasons.rows.map(r => `${r.season} (${r.cnt})`));
  console.log('\nLOCATIONS:', locs.rows.map(r => `${r.location} (${r.cnt})`));
}
check().catch(console.error);

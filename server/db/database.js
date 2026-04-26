/**
 * Database initialization and access layer — PostgreSQL (Neon)
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_2SYFQyXIA8ML@ep-autumn-rain-am4rb627-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
});

/**
 * Initialize database — run schema migration
 */
async function init() {
  const client = await pool.connect();
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('PostgreSQL database initialized (Neon)');
  } catch (err) {
    console.error('Database init error:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get the connection pool (use pool.query for simple queries)
 */
function getDb() {
  return pool;
}

module.exports = { init, getDb };

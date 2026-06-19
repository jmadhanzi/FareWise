const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const { logger } = require('./logger');

// Supabase client (for ORM-style queries)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

// Raw PostgreSQL pool (for complex queries)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

pool.on('connect', () => logger.debug('PostgreSQL client connected'));
pool.on('error', (err) => logger.error('PostgreSQL pool error', { error: err.message }));

// Test connection
(async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.info('PostgreSQL connection established');
  } catch (err) {
    logger.warn('PostgreSQL connection failed — running without DB', { error: err.message });
  }
})();

const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query executed', { duration, rows: result.rowCount });
    return result;
  } catch (err) {
    logger.error('Query error', { text, error: err.message });
    throw err;
  }
};

const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const release = client.release.bind(client);
  let timeout = setTimeout(() => {
    logger.error('Client checkout timeout — possible connection leak');
  }, 5000);
  client.release = () => {
    clearTimeout(timeout);
    client.release = release;
    return release();
  };
  return client;
};

module.exports = { supabase, pool, query, getClient };

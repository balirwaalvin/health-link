const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// Prefer backend-node/.env, fallback to existing backend/.env to reuse credentials.
dotenv.config({ path: path.join(__dirname, '..', '.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Set it in backend-node/.env or backend/.env');
}

function normalizeConnectionString(rawUrl) {
  try {
    const url = new URL(rawUrl);
    url.searchParams.delete('sslmode');
    url.searchParams.delete('sslrootcert');
    url.searchParams.delete('sslcert');
    url.searchParams.delete('sslkey');
    return url.toString();
  } catch {
    return rawUrl;
  }
}

const normalizedConnectionString = normalizeConnectionString(process.env.DATABASE_URL);
const requiresSsl = /[?&]sslmode=(require|prefer|verify-ca|verify-full)(?:&|$)/i.test(process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: normalizedConnectionString,
  ssl: requiresSsl ? { rejectUnauthorized: false } : false,
});

async function query(text, params = []) {
  return pool.query(text, params);
}

module.exports = {
  pool,
  query,
};

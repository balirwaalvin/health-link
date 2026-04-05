const { Pool } = require('pg');

let pool = null;
let initializationPromise = null;

function requireDatabaseUrl() {
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required in backend-node/.env');
  }

  return databaseUrl;
}

function normalizeConnectionString(connectionString) {
  try {
    const parsed = new URL(connectionString);
    parsed.searchParams.delete('sslmode');
    return parsed.toString();
  } catch {
    return connectionString
      .replace(/[?&]sslmode=[^&]+/gi, '')
      .replace(/\?&/, '?')
      .replace(/&&/g, '&')
      .replace(/[?&]$/, '');
  }
}

function shouldUseSsl(connectionString) {
  const explicitSsl = String(process.env.DATABASE_SSL || process.env.PGSSLMODE || '').trim().toLowerCase();
  if (['true', '1', 'require', 'verify-ca', 'verify-full'].includes(explicitSsl)) {
    return true;
  }

  try {
    const parsed = new URL(connectionString);
    const sslMode = String(parsed.searchParams.get('sslmode') || '').trim().toLowerCase();
    return ['require', 'verify-ca', 'verify-full'].includes(sslMode);
  } catch {
    return /sslmode=(require|verify-ca|verify-full)/i.test(connectionString);
  }
}

function getPool() {
  if (!pool) {
    const connectionString = requireDatabaseUrl();
    pool = new Pool({
      connectionString: normalizeConnectionString(connectionString),
      ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.DB_POOL_MAX || 10),
    });
  }

  return pool;
}

async function query(text, params = []) {
  return getPool().query(text, params);
}

async function withTransaction(work) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function initializeDatabase() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const statements = [
        `CREATE TABLE IF NOT EXISTS users (
          id BIGSERIAL PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'staff',
          password_hash TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS patients (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL DEFAULT '',
          phone TEXT,
          medical_history TEXT NOT NULL DEFAULT 'N/A',
          blood_type TEXT NOT NULL DEFAULT 'N/A',
          allergies TEXT NOT NULL DEFAULT 'N/A',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS clinics (
          id BIGSERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          location TEXT,
          phone TEXT,
          address TEXT,
          email TEXT,
          website TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS visits (
          id BIGSERIAL PRIMARY KEY,
          patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          clinic_id BIGINT REFERENCES clinics(id) ON DELETE SET NULL,
          user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
          visit_date TEXT NOT NULL,
          reason TEXT NOT NULL DEFAULT '',
          diagnosis TEXT NOT NULL DEFAULT '',
          treatment TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS otp_challenges (
          patient_id BIGINT PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
          patient_email TEXT NOT NULL,
          code_hash TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          requested_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
          requested_at TIMESTAMPTZ NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id)`,
        `CREATE INDEX IF NOT EXISTS idx_visits_clinic_id ON visits(clinic_id)`,
      ];

      for (const statement of statements) {
        await query(statement);
      }
    })();
  }

  return initializationPromise;
}

module.exports = {
  initializeDatabase,
  query,
  withTransaction,
};
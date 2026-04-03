const path = require('path');
const dotenv = require('dotenv');
const { verifyToken } = require('@clerk/backend');
const db = require('./db');
const { verifyLocalToken } = require('./localAuth');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
if (!process.env.CLERK_SECRET_KEY) {
  dotenv.config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });
}

async function upsertUserFromTokenClaims(claims) {
  const clerkId = claims.sub;
  const email = claims.email || claims.email_address || `${clerkId}@clerk.local`;
  const name = claims.name || '';

  const existing = await db.query('SELECT * FROM users WHERE clerk_id = $1 LIMIT 1', [clerkId]);
  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const byEmail = await db.query('SELECT * FROM users WHERE email = $1 ORDER BY id ASC LIMIT 1', [email]);
  if (byEmail.rows.length > 0) {
    const updated = await db.query(
      'UPDATE users SET clerk_id = $1, name = COALESCE(NULLIF($2, \'\'), name), updated_at = NOW() WHERE id = $3 RETURNING *',
      [clerkId, name, byEmail.rows[0].id]
    );
    return updated.rows[0];
  }

  const inserted = await db.query(
    'INSERT INTO users (clerk_id, email, name, role, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
    [clerkId, email, name, 'staff']
  );
  return inserted.rows[0];
}

async function upsertUserFromLocalClaims(claims) {
  const email = claims.email;
  if (!email) {
    throw new Error('Local token is missing email claim');
  }

  const name = claims.name || '';
  const role = claims.role || 'staff';
  const localId = `local-${email}`.replace(/[^a-zA-Z0-9:_-]/g, '-');

  const existing = await db.query('SELECT * FROM users WHERE email = $1 ORDER BY id ASC LIMIT 1', [email]);
  if (existing.rows.length > 0) {
    const updated = await db.query(
      "UPDATE users SET name = COALESCE(NULLIF($1, ''), name), role = COALESCE($2, role), clerk_id = COALESCE(clerk_id, $3), updated_at = NOW() WHERE id = $4 RETURNING *",
      [name, role, localId, existing.rows[0].id]
    );
    return updated.rows[0];
  }

  const inserted = await db.query(
    'INSERT INTO users (clerk_id, email, name, role, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
    [localId, email, name, role]
  );
  return inserted.rows[0];
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ detail: 'Missing bearer token' });
    }

    const token = header.slice('Bearer '.length).trim();

    const appAuthSecret = process.env.APP_AUTH_SECRET || 'dev-local-auth-secret-change-me';
    const localClaims = verifyLocalToken(token, appAuthSecret);
    if (localClaims) {
      const user = await upsertUserFromLocalClaims(localClaims);
      req.auth = { claims: localClaims, user, source: 'local' };
      return next();
    }

    if (!process.env.CLERK_SECRET_KEY) {
      return res.status(401).json({ detail: 'Invalid or expired app token' });
    }

    const claims = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });

    if (!claims || !claims.sub) {
      return res.status(401).json({ detail: 'Invalid Clerk token' });
    }

    const user = await upsertUserFromTokenClaims(claims);
    req.auth = { claims, user };
    return next();
  } catch (error) {
    return res.status(401).json({ detail: `Invalid or expired token: ${error.message}` });
  }
}

module.exports = {
  requireAuth,
};

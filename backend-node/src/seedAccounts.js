const path = require('path');
const dotenv = require('dotenv');
const { createClerkClient } = require('@clerk/backend');
const db = require('./db');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
if (!process.env.CLERK_SECRET_KEY) {
  dotenv.config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });
}

const clerkClient = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;

const DEFAULT_ACCOUNTS = [
  {
    email: process.env.ADMIN_EMAIL || 'admin@healthlink.ug',
    name: process.env.ADMIN_NAME || 'Admin User',
    role: 'admin',
    password: process.env.ADMIN_PASSWORD || 'HealthLinkAdmin123!',
  },
  {
    email: process.env.STAFF_EMAIL || 'staff@healthlink.ug',
    name: process.env.STAFF_NAME || 'Staff User',
    role: 'staff',
    password: process.env.STAFF_PASSWORD || 'HealthLinkStaff123!',
  },
];

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
}

function buildUsername(email) {
  return String(email)
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '') || 'healthlink_user';
}

async function syncClerkAccount(account) {
  if (!clerkClient) {
    throw new Error('CLERK_SECRET_KEY is missing. Cannot sync default accounts to Clerk.');
  }

  const { firstName, lastName } = splitName(account.name);
  const username = buildUsername(account.email);
  const { data } = await clerkClient.users.getUserList({ emailAddress: [account.email], limit: 1 });
  const existing = data[0] || null;

  if (existing) {
    return clerkClient.users.updateUser(existing.id, {
      firstName,
      lastName,
      username,
      password: account.password,
      skipLegalChecks: true,
      publicMetadata: {
        ...(existing.publicMetadata || {}),
        role: account.role,
      },
    });
  }

  return clerkClient.users.createUser({
    emailAddress: [account.email],
    password: account.password,
    firstName,
    lastName,
    username,
    skipLegalChecks: true,
    publicMetadata: {
      role: account.role,
    },
  });
}

async function upsertAccount(account) {
  const seedClerkId = `seed-${account.role}-${account.email}`.replace(/[^a-zA-Z0-9:_-]/g, '-');
  const existing = await db.query('SELECT id FROM users WHERE email = $1 ORDER BY id ASC LIMIT 1', [account.email]);

  if (existing.rows.length > 0) {
    const updated = await db.query(
      'UPDATE users SET clerk_id = COALESCE(clerk_id, $1), name = $2, role = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [seedClerkId, account.name, account.role, existing.rows[0].id]
    );
    return updated.rows[0];
  }

  const inserted = await db.query(
    'INSERT INTO users (clerk_id, email, name, role, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
    [seedClerkId, account.email, account.name, account.role]
  );
  return inserted.rows[0];
}

async function seedDefaultAccounts() {
  const results = [];

  for (const account of DEFAULT_ACCOUNTS) {
    await syncClerkAccount(account);
    results.push(await upsertAccount(account));
  }

  return results;
}

module.exports = {
  seedDefaultAccounts,
  DEFAULT_ACCOUNTS,
};
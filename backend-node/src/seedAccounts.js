const { ID, Query } = require('node-appwrite');
const { getUsersService } = require('./appwriteClient');
const store = require('./appwriteStore');

const usersService = getUsersService();

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

async function findAppwriteUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const result = await usersService.list([Query.equal('email', [normalized]), Query.limit(1)]);
  return result.users?.[0] || null;
}

async function ensureAppwriteUser(account) {
  const existing = await findAppwriteUserByEmail(account.email);
  if (existing) {
    return existing;
  }

  return usersService.create(ID.unique(), account.email, undefined, account.password, account.name);
}

async function seedDefaultAccounts() {
  const seeded = [];

  for (const account of DEFAULT_ACCOUNTS) {
    const appwriteUser = await ensureAppwriteUser(account);
    const user = await store.upsertUser({
      email: account.email,
      name: account.name,
      role: account.role,
      appwriteUserId: appwriteUser.$id,
    });
    seeded.push(user);
  }

  return seeded;
}

module.exports = {
  DEFAULT_ACCOUNTS,
  seedDefaultAccounts,
};

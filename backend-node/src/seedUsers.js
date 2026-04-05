const store = require('./store');

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

async function seedDefaultUsers() {
  await store.initializeDatabase();

  const seeded = [];
  for (const account of DEFAULT_ACCOUNTS) {
    const passwordHash = await store.hashPassword(account.password);
    const user = await store.upsertUser({
      email: account.email,
      name: account.name,
      role: account.role,
      passwordHash,
    });
    seeded.push(user);
  }

  return seeded;
}

module.exports = {
  DEFAULT_ACCOUNTS,
  seedDefaultUsers,
};
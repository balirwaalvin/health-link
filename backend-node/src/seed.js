const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });
}

const { seedDefaultUsers, DEFAULT_ACCOUNTS } = require('./seedUsers');
const { initializeDatabase } = require('./store');

async function main() {
  await initializeDatabase();
  const accounts = await seedDefaultUsers();
  console.log(`Seeded ${accounts.length} default account(s).`);
  accounts.forEach((account) => {
    console.log(`- ${account.email} (${account.role})`);
  });
}

main().catch((error) => {
  console.error('Failed to seed default accounts:', error);
  process.exit(1);
});
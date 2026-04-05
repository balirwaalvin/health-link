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
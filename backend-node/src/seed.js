const { seedDefaultAccounts, DEFAULT_ACCOUNTS } = require('./seedAccounts');

async function main() {
  const accounts = await seedDefaultAccounts();
  console.log(`Seeded ${accounts.length} default account(s).`);
  accounts.forEach((account) => {
    console.log(`- ${account.email} (${account.role})`);
  });
}

main().catch((error) => {
  console.error('Failed to seed default accounts:', error);
  process.exit(1);
});
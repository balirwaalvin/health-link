const path = require('path');
const dotenv = require('dotenv');
const { createClerkClient } = require('@clerk/backend');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
if (!process.env.CLERK_SECRET_KEY) {
  dotenv.config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });
}

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY is missing. Cannot disable MFA for users.');
}

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function disableMfaForUser(user) {
  const actions = [];

  await clerkClient.users.disableUserMFA(user.id);
  actions.push('mfa-disabled');

  if (user.totpEnabled) {
    await clerkClient.users.deleteUserTOTP(user.id);
    actions.push('totp-deleted');
  }

  if (user.backupCodeEnabled) {
    await clerkClient.users.deleteUserBackupCodes(user.id);
    actions.push('backup-codes-deleted');
  }

  return actions;
}

async function main() {
  const limit = 100;
  let offset = 0;
  let processed = 0;
  let updated = 0;

  while (true) {
    const response = await clerkClient.users.getUserList({ limit, offset });
    const users = response.data || [];

    if (users.length === 0) {
      break;
    }

    for (const user of users) {
      try {
        const actions = await disableMfaForUser(user);
        updated += 1;
        console.log(`${user.emailAddresses?.[0]?.emailAddress || user.id}: ${actions.join(', ')}`);
      } catch (error) {
        console.warn(`Failed to disable MFA for ${user.id}:`, error.message || error);
      }
      processed += 1;
    }

    if (users.length < limit) {
      break;
    }

    offset += limit;
  }

  console.log(`Processed ${processed} user(s), updated ${updated} user(s).`);
}

main().catch((error) => {
  console.error('Failed to disable MFA for all users:', error);
  process.exit(1);
});
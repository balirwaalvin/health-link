import { Account, Client } from 'appwrite';

const endpoint = String(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1').trim();
const projectId = String(import.meta.env.VITE_APPWRITE_PROJECT_ID || '').trim();

function isConfigured() {
  return Boolean(endpoint && projectId);
}

function getAccount() {
  if (!isConfigured()) {
    throw new Error('Appwrite is not configured. Set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID.');
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId);
  return new Account(client);
}

export async function signInWithAppwrite(email: string, password: string): Promise<string> {
  const account = getAccount();
  await account.createEmailPasswordSession(email, password);
  const jwt = await account.createJWT();
  return jwt.jwt;
}

export async function signOutFromAppwrite() {
  if (!isConfigured()) {
    return;
  }

  try {
    const account = getAccount();
    await account.deleteSession('current');
  } catch {
    // Ignore logout API errors; local session is still cleared.
  }
}

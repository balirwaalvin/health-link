import { Client, Account, Databases } from 'appwrite';

export const appwriteConfig = {
    endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
    projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID || 'PENDING_PROJECT_ID',
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID || 'PENDING_DATABASE_ID',
    patientsCollectionId: import.meta.env.VITE_APPWRITE_PATIENTS_COLLECTION_ID || 'PENDING_PATIENTS_ID',
    clinicsCollectionId: import.meta.env.VITE_APPWRITE_CLINICS_COLLECTION_ID || 'PENDING_CLINICS_ID',
    visitsCollectionId: import.meta.env.VITE_APPWRITE_VISITS_COLLECTION_ID || 'PENDING_VISITS_ID',
};

export const client = new Client();

client
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId);

export const account = new Account(client);
export const databases = new Databases(client);

export async function clearCurrentSession() {
    try {
        await account.deleteSession('current');
    } catch {
        // Ignore when there is no active session.
    }
}

export async function createOrReplaceEmailPasswordSession(email: string, password: string) {
    // Appwrite rejects creating a new session if one is already active on this client.
    await clearCurrentSession();
    return account.createEmailPasswordSession(email, password);
}

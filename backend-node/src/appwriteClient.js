const { Account, Client, Storage, Users } = require('node-appwrite');

const APPWRITE_ENDPOINT = String(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1').trim();
const APPWRITE_PROJECT_ID = String(process.env.APPWRITE_PROJECT_ID || '').trim();
const APPWRITE_API_KEY = String(process.env.APPWRITE_API_KEY || '').trim();
const APPWRITE_DATA_BUCKET_ID = String(process.env.APPWRITE_DATA_BUCKET_ID || '').trim();

function requireConfigured(value, name) {
  if (!value) {
    throw new Error(`${name} is required in backend-node/.env`);
  }
  return value;
}

function buildBaseClient() {
  const client = new Client();
  client
    .setEndpoint(requireConfigured(APPWRITE_ENDPOINT, 'APPWRITE_ENDPOINT'))
    .setProject(requireConfigured(APPWRITE_PROJECT_ID, 'APPWRITE_PROJECT_ID'));
  return client;
}

function getAdminClient() {
  const client = buildBaseClient();
  client.setKey(requireConfigured(APPWRITE_API_KEY, 'APPWRITE_API_KEY'));
  return client;
}

function getStorageService() {
  return new Storage(getAdminClient());
}

function getUsersService() {
  return new Users(getAdminClient());
}

function getAccountServiceForJwt(jwt) {
  if (!jwt) {
    throw new Error('JWT token is required');
  }

  const client = buildBaseClient();
  client.setJWT(jwt);
  return new Account(client);
}

module.exports = {
  APPWRITE_DATA_BUCKET_ID,
  getAccountServiceForJwt,
  getStorageService,
  getUsersService,
};

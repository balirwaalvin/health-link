const { getAccountServiceForJwt } = require('./appwriteClient');
const store = require('./appwriteStore');

function defaultRoleForEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) {
    return 'staff';
  }

  if (normalized === String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()) {
    return 'admin';
  }

  if (normalized === String(process.env.STAFF_EMAIL || '').trim().toLowerCase()) {
    return 'staff';
  }

  return 'staff';
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ detail: 'Missing bearer token' });
    }

    const token = header.slice('Bearer '.length).trim();
    const account = getAccountServiceForJwt(token);
    const appwriteUser = await account.get();

    const email = String(appwriteUser?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(401).json({ detail: 'Authenticated Appwrite user is missing email' });
    }

    const user = await store.upsertUser({
      email,
      name: appwriteUser.name || '',
      role: defaultRoleForEmail(email),
      appwriteUserId: appwriteUser.$id,
    });

    req.auth = {
      claims: {
        sub: appwriteUser.$id,
        email,
        name: appwriteUser.name || '',
      },
      user,
      source: 'appwrite',
    };

    return next();
  } catch (error) {
    return res.status(401).json({ detail: `Invalid or expired Appwrite token: ${error.message}` });
  }
}

module.exports = {
  requireAuth,
};

const jwt = require('jsonwebtoken');
const store = require('./store');

function requireJwtSecret() {
  const jwtSecret = String(process.env.JWT_SECRET || '').trim();
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required in backend-node/.env');
  }

  return jwtSecret;
}

function signAuthToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
    },
    requireJwtSecret(),
    {
      expiresIn: String(process.env.JWT_EXPIRES_IN || '7d').trim() || '7d',
    }
  );
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ detail: 'Missing bearer token' });
    }

    const token = header.slice('Bearer '.length).trim();
    const payload = jwt.verify(token, requireJwtSecret());
    const userId = Number(payload?.sub);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ detail: 'Invalid token subject' });
    }

    const user = await store.getUserById(userId);
    if (!user) {
      return res.status(401).json({ detail: 'Authenticated user not found' });
    }

    req.auth = {
      claims: payload,
      user,
      source: 'local-jwt',
    };

    return next();
  } catch (error) {
    return res.status(401).json({ detail: `Invalid or expired token: ${error.message}` });
  }
}

module.exports = {
  signAuthToken,
  requireAuth,
};

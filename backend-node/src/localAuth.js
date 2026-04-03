const crypto = require('crypto');

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromBase64url(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function signLocalToken(payload, secret, expiresInSeconds = 60 * 60 * 12) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
    typ: 'local',
  };

  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const data = base64url(JSON.stringify(body));
  const unsigned = `${header}.${data}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(unsigned)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${unsigned}.${signature}`;
}

function verifyLocalToken(token, secret) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [header, data, signature] = parts;
    const unsigned = `${header}.${data}`;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(unsigned)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (expected !== signature) {
      return null;
    }

    const claims = JSON.parse(fromBase64url(data));
    const now = Math.floor(Date.now() / 1000);
    if (!claims.exp || now > claims.exp) {
      return null;
    }

    return claims;
  } catch {
    return null;
  }
}

module.exports = {
  signLocalToken,
  verifyLocalToken,
};

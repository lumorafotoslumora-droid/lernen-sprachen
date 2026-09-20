const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'token';
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function setAuthCookie(res, userId, secret) {
  const token = jwt.sign({ sub: userId }, secret, { expiresIn: TOKEN_TTL_SECONDS });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: TOKEN_TTL_SECONDS * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

function requireAuth(secret) {
  return (req, res, next) => {
    const token = req.cookies && req.cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'Nicht angemeldet.' });
    try {
      const decoded = jwt.verify(token, secret);
      req.userId = decoded.sub;
      next();
    } catch {
      return res.status(401).json({ error: 'Sitzung ungültig oder abgelaufen.' });
    }
  };
}

module.exports = { setAuthCookie, clearAuthCookie, requireAuth, COOKIE_NAME };

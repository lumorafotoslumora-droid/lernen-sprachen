const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { setAuthCookie, clearAuthCookie, requireAuth } = require('../auth');
const { STARTER_CARDS } = require('../defaultCards');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = function authRoutes(secret) {
  const router = express.Router();
  router.use(authLimiter);

  router.post('/register', async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Bitte eine gültige E-Mail-Adresse angeben.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Das Passwort muss mindestens 8 Zeichen haben.' });
    }

    const client = await pool.connect();
    try {
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Diese E-Mail-Adresse ist bereits registriert.' });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      await client.query('BEGIN');
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
        [email, passwordHash]
      );
      const userId = userResult.rows[0].id;

      for (const card of STARTER_CARDS) {
        await client.query(
          'INSERT INTO cards (user_id, category, sl, en, de, fr, image) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [userId, card.category || '', card.sl, card.en, card.de, card.fr, '']
        );
      }
      await client.query('COMMIT');

      setAuthCookie(res, userId, secret);
      res.status(201).json({ email });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Registrierung fehlgeschlagen:', err);
      res.status(500).json({ error: 'Registrierung fehlgeschlagen. Bitte später erneut versuchen.' });
    } finally {
      client.release();
    }
  });

  router.post('/login', async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    try {
      const result = await pool.query('SELECT id, password_hash FROM users WHERE email = $1', [email]);
      const user = result.rows[0];
      const ok = user && (await bcrypt.compare(password, user.password_hash));
      if (!ok) {
        return res.status(401).json({ error: 'E-Mail oder Passwort ist falsch.' });
      }
      setAuthCookie(res, user.id, secret);
      res.json({ email });
    } catch (err) {
      console.error('Login fehlgeschlagen:', err);
      res.status(500).json({ error: 'Login fehlgeschlagen. Bitte später erneut versuchen.' });
    }
  });

  router.post('/logout', (req, res) => {
    clearAuthCookie(res);
    res.status(204).end();
  });

  router.get('/me', requireAuth(secret), async (req, res) => {
    try {
      const result = await pool.query('SELECT email FROM users WHERE id = $1', [req.userId]);
      if (result.rows.length === 0) return res.status(401).json({ error: 'Nicht angemeldet.' });
      res.json({ email: result.rows[0].email });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Serverfehler.' });
    }
  });

  return router;
};

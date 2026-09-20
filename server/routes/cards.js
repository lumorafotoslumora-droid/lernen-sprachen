const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../auth');
const { DEFAULT_CARDS } = require('../defaultCards');

const MAX_IMAGE_LENGTH = 2 * 1024 * 1024; // ~2MB of base64 text

function toCardResponse(row) {
  return {
    id: row.id,
    category: row.category,
    sl: row.sl,
    en: row.en,
    de: row.de,
    fr: row.fr,
    image: row.image,
  };
}

function validateCardBody(body) {
  const fields = ['sl', 'en', 'de', 'fr'];
  for (const f of fields) {
    if (typeof body[f] !== 'string' || !body[f].trim()) {
      return `Feld "${f}" darf nicht leer sein.`;
    }
  }
  if (body.image && typeof body.image === 'string' && body.image.length > MAX_IMAGE_LENGTH) {
    return 'Bild ist zu groß (max. ca. 2 MB).';
  }
  return null;
}

module.exports = function cardsRoutes(secret) {
  const router = express.Router();
  router.use(requireAuth(secret));

  // ----- Cards -----

  router.get('/', async (req, res) => {
    const result = await pool.query(
      'SELECT * FROM cards WHERE user_id = $1 ORDER BY created_at ASC',
      [req.userId]
    );
    res.json(result.rows.map(toCardResponse));
  });

  router.post('/', async (req, res) => {
    const error = validateCardBody(req.body);
    if (error) return res.status(400).json({ error });
    const { category = '', sl, en, de, fr, image = '' } = req.body;
    const result = await pool.query(
      `INSERT INTO cards (user_id, category, sl, en, de, fr, image)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.userId, category.trim(), sl.trim(), en.trim(), de.trim(), fr.trim(), image]
    );
    res.status(201).json(toCardResponse(result.rows[0]));
  });

  router.put('/:id', async (req, res) => {
    const error = validateCardBody(req.body);
    if (error) return res.status(400).json({ error });
    const { category = '', sl, en, de, fr, image = '' } = req.body;
    const result = await pool.query(
      `UPDATE cards SET category = $1, sl = $2, en = $3, de = $4, fr = $5, image = $6
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [category.trim(), sl.trim(), en.trim(), de.trim(), fr.trim(), image, req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Karte nicht gefunden.' });
    res.json(toCardResponse(result.rows[0]));
  });

  router.delete('/:id', async (req, res) => {
    const result = await pool.query('DELETE FROM cards WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.userId,
    ]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Karte nicht gefunden.' });
    res.status(204).end();
  });

  // ----- Import / reset -----

  router.post('/import', async (req, res) => {
    const items = Array.isArray(req.body.cards) ? req.body.cards : null;
    const mode = req.body.mode === 'replace' ? 'replace' : 'add';
    if (!items) return res.status(400).json({ error: 'Ungültiges Format: "cards" muss ein Array sein.' });

    for (const item of items) {
      const err = validateCardBody(item);
      if (err) return res.status(400).json({ error: `Ungültige Karte im Import: ${err}` });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (mode === 'replace') {
        await client.query('DELETE FROM cards WHERE user_id = $1', [req.userId]);
      }
      for (const item of items) {
        await client.query(
          `INSERT INTO cards (user_id, category, sl, en, de, fr, image)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            req.userId,
            (item.category || '').trim(),
            item.sl.trim(),
            item.en.trim(),
            item.de.trim(),
            item.fr.trim(),
            item.image || '',
          ]
        );
      }
      await client.query('COMMIT');
      const result = await client.query('SELECT * FROM cards WHERE user_id = $1 ORDER BY created_at ASC', [
        req.userId,
      ]);
      res.json(result.rows.map(toCardResponse));
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Import fehlgeschlagen:', err);
      res.status(500).json({ error: 'Import fehlgeschlagen.' });
    } finally {
      client.release();
    }
  });

  router.post('/reset', async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM cards WHERE user_id = $1', [req.userId]);
      for (const card of DEFAULT_CARDS) {
        await client.query(
          `INSERT INTO cards (user_id, category, sl, en, de, fr, image)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [req.userId, card.category || '', card.sl, card.en, card.de, card.fr, '']
        );
      }
      await client.query('COMMIT');
      const result = await client.query('SELECT * FROM cards WHERE user_id = $1 ORDER BY created_at ASC', [
        req.userId,
      ]);
      res.json(result.rows.map(toCardResponse));
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Reset fehlgeschlagen:', err);
      res.status(500).json({ error: 'Zurücksetzen fehlgeschlagen.' });
    } finally {
      client.release();
    }
  });

  // ----- Progress (simple Leitner system) -----

  router.get('/progress/all', async (req, res) => {
    const result = await pool.query('SELECT card_id, box, due_at FROM progress WHERE user_id = $1', [
      req.userId,
    ]);
    const map = {};
    for (const row of result.rows) {
      map[row.card_id] = { box: row.box, due: new Date(row.due_at).getTime() };
    }
    res.json(map);
  });

  router.put('/progress/:cardId', async (req, res) => {
    const box = Number.isInteger(req.body.box) ? req.body.box : 0;
    const due = Number.isFinite(req.body.due) ? new Date(req.body.due) : new Date();
    await pool.query(
      `INSERT INTO progress (user_id, card_id, box, due_at) VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, card_id) DO UPDATE SET box = $3, due_at = $4`,
      [req.userId, req.params.cardId, box, due]
    );
    res.status(204).end();
  });

  return router;
};

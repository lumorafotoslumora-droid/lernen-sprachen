require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { initSchema } = require('./db');
const authRoutes = require('./routes/auth');
const cardsRoutes = require('./routes/cards');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('Fehler: JWT_SECRET ist nicht gesetzt. Siehe .env.example.');
  process.exit(1);
}

async function initSchemaWithRetry(maxAttempts = 15, delayMs = 4000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await initSchema();
      return;
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      console.log(
        `Datenbank noch nicht erreichbar (Versuch ${attempt}/${maxAttempts}): ${err.message}. Erneuter Versuch in ${delayMs / 1000}s...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function main() {
  await initSchemaWithRetry();

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '3mb' }));
  app.use(cookieParser());

  app.use('/api/auth', authRoutes(JWT_SECRET));
  app.use('/api/cards', cardsRoutes(JWT_SECRET));

  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Unerwarteter Serverfehler.' });
  });

  app.listen(PORT, () => {
    console.log(`Lernen Sprachen läuft auf http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Serverstart fehlgeschlagen:', err);
  process.exit(1);
});

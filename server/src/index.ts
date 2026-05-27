import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './db/database.js';
import pinsRouter from './routes/pins.js';
import peopleRouter from './routes/people.js';
import searchRouter from './routes/search.js';
import directionsRouter from './routes/directions.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from server directory (not process.cwd())
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// ── Init DB ─────────────────────────────────────────────────────────────────
getDb();

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/pins', pinsRouter);
app.use('/api/locations/:locationId/people', peopleRouter);
app.use('/api/search', searchRouter);
app.use('/api/directions', directionsRouter);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Serve built client in production ────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const clientDist = join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

// ── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Seety API running on http://localhost:${PORT}`);
});

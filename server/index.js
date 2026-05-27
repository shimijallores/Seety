import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getDb } from './db/database.js';
import pinsRouter from './routes/pins.js';
import peopleRouter from './routes/people.js';
import searchRouter from './routes/search.js';
import directionsRouter from './routes/directions.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// ── Init DB ─────────────────────────────────────────────────────────────────
getDb(); // Creates DB file + tables on first run

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/pins', pinsRouter);
app.use('/api/locations/:locationId/people', peopleRouter);
app.use('/api/search', searchRouter);
app.use('/api/directions', directionsRouter);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Seety API running on http://localhost:${PORT}`);
});

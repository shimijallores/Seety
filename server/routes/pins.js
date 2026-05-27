import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

// GET /api/pins — all pins
router.get('/', (req, res) => {
  const db = getDb();
  const pins = db.prepare('SELECT * FROM locations ORDER BY created_at DESC').all();
  res.json(pins);
});

// GET /api/pins/:id — single pin
router.get('/:id', (req, res) => {
  const db = getDb();
  const pin = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
  if (!pin) return res.status(404).json({ error: 'Location not found' });
  res.json(pin);
});

// POST /api/pins — create pin
router.post('/', (req, res) => {
  const { name, place_type, description, lat, lng, address } = req.body;
  if (!name || !place_type || lat == null || lng == null) {
    return res.status(400).json({ error: 'name, place_type, lat, and lng are required' });
  }
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO locations (name, place_type, description, lat, lng, address)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(name, place_type, description || null, lat, lng, address || null);

  const pin = db.prepare('SELECT * FROM locations WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(pin);
});

// PUT /api/pins/:id — update pin
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Location not found' });

  const { name, place_type, description, lat, lng, address } = req.body;
  db.prepare(
    `UPDATE locations
     SET name = ?, place_type = ?, description = ?, lat = ?, lng = ?, address = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    name ?? existing.name,
    place_type ?? existing.place_type,
    description !== undefined ? description : existing.description,
    lat ?? existing.lat,
    lng ?? existing.lng,
    address !== undefined ? address : existing.address,
    req.params.id
  );

  const pin = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
  res.json(pin);
});

// DELETE /api/pins/:id — delete pin (cascades to people)
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Location not found' });

  db.prepare('DELETE FROM locations WHERE id = ?').run(req.params.id);
  res.json({ success: true, id: Number(req.params.id) });
});

export default router;

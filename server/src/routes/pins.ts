import { Router, Request, Response } from 'express';
import { getDb } from '../db/database.js';
import type { Location } from '../types.js';

const router = Router();

// GET /api/pins
router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const pins = db.prepare('SELECT * FROM locations ORDER BY created_at DESC').all() as unknown as Location[];
  res.json(pins);
});

// GET /api/pins/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const pin = db.prepare('SELECT * FROM locations WHERE id = ?').get(Number(req.params.id)) as Location | undefined;
  if (!pin) return res.status(404).json({ error: 'Location not found' });
  res.json(pin);
});

// POST /api/pins
router.post('/', (req: Request, res: Response) => {
  const { name, place_type, description, lat, lng, address } = req.body as Partial<Location>;
  if (!name || !place_type || lat == null || lng == null) {
    return res.status(400).json({ error: 'name, place_type, lat, and lng are required' });
  }
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO locations (name, place_type, description, lat, lng, address)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(name, place_type, description ?? null, lat, lng, address ?? null);

  const pin = db.prepare('SELECT * FROM locations WHERE id = ?').get(result.lastInsertRowid) as unknown as Location;
  res.status(201).json(pin);
});

// PUT /api/pins/:id
router.put('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM locations WHERE id = ?').get(Number(req.params.id)) as Location | undefined;
  if (!existing) return res.status(404).json({ error: 'Location not found' });

  const { name, place_type, description, lat, lng, address } = req.body as Partial<Location>;
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
    Number(req.params.id)
  );

  const pin = db.prepare('SELECT * FROM locations WHERE id = ?').get(Number(req.params.id)) as unknown as Location;
  res.json(pin);
});

// DELETE /api/pins/:id
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM locations WHERE id = ?').get(Number(req.params.id)) as Location | undefined;
  if (!existing) return res.status(404).json({ error: 'Location not found' });

  db.prepare('DELETE FROM locations WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true, id: Number(req.params.id) });
});

export default router;

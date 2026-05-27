import { Router, Request, Response } from 'express';
import { getDb } from '../db/database.js';
import type { Person } from '../types.js';

const router = Router({ mergeParams: true });

// GET /api/locations/:locationId/people
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const people = db
    .prepare('SELECT * FROM people WHERE location_id = ? ORDER BY last_name, first_name')
    .all(Number(req.params.locationId)) as unknown as Person[];
  res.json(people);
});

// POST /api/locations/:locationId/people
router.post('/', (req: Request, res: Response) => {
  const { first_name, last_name, role, contact, notes } = req.body as Partial<Person>;
  if (!first_name || !last_name) {
    return res.status(400).json({ error: 'first_name and last_name are required' });
  }
  const db = getDb();

  const location = db.prepare('SELECT id FROM locations WHERE id = ?').get(Number(req.params.locationId));
  if (!location) return res.status(404).json({ error: 'Location not found' });

  const result = db
    .prepare(
      `INSERT INTO people (location_id, first_name, last_name, role, contact, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      Number(req.params.locationId),
      first_name,
      last_name,
      role ?? null,
      contact ?? null,
      notes ?? null
    );

  const person = db.prepare('SELECT * FROM people WHERE id = ?').get(result.lastInsertRowid) as unknown as Person;
  res.status(201).json(person);
});

// PUT /api/locations/:locationId/people/:id
router.put('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db
    .prepare('SELECT * FROM people WHERE id = ? AND location_id = ?')
    .get(Number(req.params.id), Number(req.params.locationId)) as Person | undefined;
  if (!existing) return res.status(404).json({ error: 'Person not found' });

  const { first_name, last_name, role, contact, notes } = req.body as Partial<Person>;
  db.prepare(
    `UPDATE people
     SET first_name = ?, last_name = ?, role = ?, contact = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND location_id = ?`
  ).run(
    first_name ?? existing.first_name,
    last_name ?? existing.last_name,
    role !== undefined ? role : existing.role,
    contact !== undefined ? contact : existing.contact,
    notes !== undefined ? notes : existing.notes,
    Number(req.params.id),
    Number(req.params.locationId)
  );

  const person = db.prepare('SELECT * FROM people WHERE id = ?').get(Number(req.params.id)) as unknown as Person;
  res.json(person);
});

// DELETE /api/locations/:locationId/people/:id
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db
    .prepare('SELECT * FROM people WHERE id = ? AND location_id = ?')
    .get(Number(req.params.id), Number(req.params.locationId)) as Person | undefined;
  if (!existing) return res.status(404).json({ error: 'Person not found' });

  db.prepare('DELETE FROM people WHERE id = ? AND location_id = ?').run(
    Number(req.params.id),
    Number(req.params.locationId)
  );
  res.json({ success: true, id: Number(req.params.id) });
});

export default router;

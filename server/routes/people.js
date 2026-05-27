import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router({ mergeParams: true });

// GET /api/locations/:locationId/people
router.get('/', (req, res) => {
  const db = getDb();
  const people = db
    .prepare('SELECT * FROM people WHERE location_id = ? ORDER BY last_name, first_name')
    .all(req.params.locationId);
  res.json(people);
});

// POST /api/locations/:locationId/people
router.post('/', (req, res) => {
  const { first_name, last_name, role, contact, notes } = req.body;
  if (!first_name || !last_name) {
    return res.status(400).json({ error: 'first_name and last_name are required' });
  }
  const db = getDb();

  // Verify location exists
  const location = db
    .prepare('SELECT id FROM locations WHERE id = ?')
    .get(req.params.locationId);
  if (!location) return res.status(404).json({ error: 'Location not found' });

  const result = db
    .prepare(
      `INSERT INTO people (location_id, first_name, last_name, role, contact, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(req.params.locationId, first_name, last_name, role || null, contact || null, notes || null);

  const person = db.prepare('SELECT * FROM people WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(person);
});

// PUT /api/locations/:locationId/people/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db
    .prepare('SELECT * FROM people WHERE id = ? AND location_id = ?')
    .get(req.params.id, req.params.locationId);
  if (!existing) return res.status(404).json({ error: 'Person not found' });

  const { first_name, last_name, role, contact, notes } = req.body;
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
    req.params.id,
    req.params.locationId
  );

  const person = db.prepare('SELECT * FROM people WHERE id = ?').get(req.params.id);
  res.json(person);
});

// DELETE /api/locations/:locationId/people/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db
    .prepare('SELECT * FROM people WHERE id = ? AND location_id = ?')
    .get(req.params.id, req.params.locationId);
  if (!existing) return res.status(404).json({ error: 'Person not found' });

  db.prepare('DELETE FROM people WHERE id = ? AND location_id = ?').run(
    req.params.id,
    req.params.locationId
  );
  res.json({ success: true, id: Number(req.params.id) });
});

export default router;

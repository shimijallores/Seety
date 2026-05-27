import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

// GET /api/search?q=<query>
router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ locations: [], people: [] });

  const db = getDb();
  const like = `%${q}%`;

  const locations = db
    .prepare(
      `SELECT id, name, place_type, lat, lng, address
       FROM locations
       WHERE name LIKE ? OR address LIKE ? OR description LIKE ?
       LIMIT 20`
    )
    .all(like, like, like);

  const people = db
    .prepare(
      `SELECT p.id, p.first_name, p.last_name, p.role, p.location_id, l.name AS location_name
       FROM people p
       JOIN locations l ON l.id = p.location_id
       WHERE p.first_name LIKE ? OR p.last_name LIKE ? OR p.role LIKE ? OR p.contact LIKE ?
       LIMIT 20`
    )
    .all(like, like, like, like);

  res.json({ locations, people });
});

export default router;

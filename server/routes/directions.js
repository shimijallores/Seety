import { Router } from 'express';

const router = Router();

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

// GET /api/directions?from_lat=&from_lng=&to_lat=&to_lng=
router.get('/', async (req, res) => {
  const { from_lat, from_lng, to_lat, to_lng } = req.query;

  if (!from_lat || !from_lng || !to_lat || !to_lng) {
    return res
      .status(400)
      .json({ error: 'from_lat, from_lng, to_lat, to_lng are required' });
  }

  const url = `${OSRM_BASE}/${from_lng},${from_lat};${to_lng},${to_lat}?overview=full&geometries=geojson&steps=true`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`OSRM responded with ${response.status}`);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      return res.status(404).json({ error: 'No route found' });
    }

    const route = data.routes[0];
    res.json({
      geometry: route.geometry,
      distance_m: route.distance,
      duration_s: route.duration,
      legs: route.legs,
    });
  } catch (err) {
    console.error('[directions] OSRM error:', err.message);
    res.status(502).json({ error: 'Could not reach routing service. Please try again.' });
  }
});

export default router;

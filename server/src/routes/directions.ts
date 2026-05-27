import { Router, Request, Response } from 'express';

const router = Router();

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

// GET /api/directions?from_lat=&from_lng=&to_lat=&to_lng=
router.get('/', async (req: Request, res: Response) => {
  const { from_lat, from_lng, to_lat, to_lng } = req.query as Record<string, string>;

  if (!from_lat || !from_lng || !to_lat || !to_lng) {
    return res.status(400).json({ error: 'from_lat, from_lng, to_lat, to_lng are required' });
  }

  const url = `${OSRM_BASE}/${from_lng},${from_lat};${to_lng},${to_lat}?overview=full&geometries=geojson&steps=true`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`OSRM responded with ${response.status}`);
    const data = await response.json() as {
      routes?: Array<{
        geometry: object;
        distance: number;
        duration: number;
        legs: object[];
      }>;
    };

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
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[directions] OSRM error:', msg);
    res.status(502).json({ error: 'Could not reach routing service. Please try again.' });
  }
});

export default router;

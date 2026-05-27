import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import type { UserLocation } from '../../hooks/useUserLocation';

interface ProximityCircleProps {
  location: UserLocation;
  radiusKm: number;
}

export function ProximityCircle({ location, radiusKm }: ProximityCircleProps) {
  const map = useMap();
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (circleRef.current) {
      map.removeLayer(circleRef.current);
    }

    const circle = L.circle([location.lat, location.lng], {
      radius: radiusKm * 1000,
      color: '#4e3629',
      fillColor: '#4e3629',
      fillOpacity: 0.04,
      weight: 2,
      dashArray: '8 6',
      interactive: false,
    }).addTo(map);

    circleRef.current = circle;

    // Zoom map to fit the new proximity bounds
    map.fitBounds(circle.getBounds(), { padding: [20, 20] });

    return () => {
      if (circleRef.current) {
        map.removeLayer(circleRef.current);
        circleRef.current = null;
      }
    };
  }, [location.lat, location.lng, radiusKm, map]);

  return null;
}

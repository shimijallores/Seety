import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import type { UserLocation } from '../../hooks/useUserLocation';

interface UserLocationMarkerProps {
  location: UserLocation;
}

export function UserLocationMarker({ location }: UserLocationMarkerProps) {
  const map = useMap();
  const groupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (groupRef.current) {
      map.removeLayer(groupRef.current);
    }

    const group = L.layerGroup().addTo(map);
    groupRef.current = group;

    // Accuracy halo
    if (location.accuracy > 0 && location.accuracy < 5000) {
      L.circle([location.lat, location.lng], {
        radius: location.accuracy,
        color: '#4285f4',
        fillColor: '#4285f4',
        fillOpacity: 0.08,
        weight: 1,
      }).addTo(group);
    }

    // Pulsing blue dot
    const icon = L.divIcon({
      html: `
        <div class="user-location-dot">
          <div class="user-location-pulse"></div>
          <div class="user-location-inner"></div>
        </div>
      `,
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      tooltipAnchor: [0, -14],
    });

    L.marker([location.lat, location.lng], { icon, zIndexOffset: 1000 })
      .addTo(group)
      .bindTooltip('Your Location', { direction: 'top', offset: [0, -16], opacity: 0.9 });

    return () => {
      if (groupRef.current) {
        map.removeLayer(groupRef.current);
        groupRef.current = null;
      }
    };
  }, [location.lat, location.lng, location.accuracy, map]);

  return null;
}

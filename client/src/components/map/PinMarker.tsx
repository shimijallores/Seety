import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Location } from '../../lib/api';
import { getPlaceMeta } from '../../lib/placeTypes';

interface PinMarkerProps {
  location: Location;
  selected: boolean;
  onSelect: (location: Location) => void;
  clusterGroup?: any;
}

function createPinIcon(location: Location, selected: boolean): L.DivIcon {
  const meta = getPlaceMeta(location.place_type);
  const Icon = meta.icon;
  const iconSvg = renderToStaticMarkup(
    <Icon size={14} strokeWidth={2.5} color="#fff" />
  );

  const html = `
    <div class="seety-pin ${selected ? 'selected' : ''}" title="${location.name}">
      ${selected ? '<div class="pin-pulse-ring"></div>' : ''}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 44" width="36" height="44">
        <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.06 27.94 0 18 0z"
              fill="${selected ? '#6a4e42' : '#4e3629'}"/>
        <circle cx="18" cy="18" r="11" fill="rgba(255,255,255,0.18)"/>
      </svg>
      <div style="
        position:absolute;top:11px;left:50%;transform:translateX(-50%);
        display:flex;align-items:center;justify-content:center;
      ">
        ${iconSvg}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: '',
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    tooltipAnchor: [0, -40],
  });
}

export function PinMarker({ location, selected, onSelect, clusterGroup }: PinMarkerProps) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    const icon = createPinIcon(location, selected);

    if (!markerRef.current) {
      markerRef.current = L.marker([location.lat, location.lng], { icon })
        .bindTooltip(location.name, { direction: 'top', offset: [0, -40], opacity: 0.95 })
        .on('click', () => onSelect(location));

      if (clusterGroup) {
        clusterGroup.addLayer(markerRef.current);
      } else {
        markerRef.current.addTo(map);
      }
    } else {
      markerRef.current.setIcon(icon);
      markerRef.current.setLatLng([location.lat, location.lng]);
    }

    return () => {
      if (markerRef.current) {
        if (clusterGroup) {
          clusterGroup.removeLayer(markerRef.current);
        } else {
          map.removeLayer(markerRef.current);
        }
        markerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.id, location.lat, location.lng, selected, location.place_type, location.name, clusterGroup]);

  return null;
}

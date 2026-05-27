import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { DirectionsResult } from '../../lib/api';

interface RoutePolylineProps {
  result: DirectionsResult;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}

export function RoutePolyline({ result, from, to }: RoutePolylineProps) {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    // Clear previous
    if (layerGroupRef.current) {
      layerGroupRef.current.clearLayers();
      map.removeLayer(layerGroupRef.current);
    }

    const group = L.layerGroup().addTo(map);
    layerGroupRef.current = group;

    // Route polyline with animated dash
    const polyline = L.geoJSON(result.geometry as GeoJSON.GeoJsonObject, {
      style: {
        color: '#41176b',
        weight: 5,
        opacity: 0.85,
        dashArray: '10, 5',
        className: 'route-line',
      },
    }).addTo(group);

    // Start marker (green circle)
    L.circleMarker([from.lat, from.lng], {
      radius: 9,
      fillColor: '#16a34a',
      color: '#fff',
      weight: 2.5,
      fillOpacity: 1,
    })
      .bindTooltip('Start', { permanent: false })
      .addTo(group);

    // Zoom in to current start location (like Waze)
    map.setView([from.lat, from.lng], 16);

    return () => {
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
    };
  }, [result, from, to, map]);

  return null;
}

import { useRef, useCallback, useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
(window as unknown as { L: typeof L }).L = L;
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/leaflet.markercluster.js';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { Location, DirectionsResult } from '../../lib/api';
import type { UserLocation } from '../../hooks/useUserLocation';
import { PinMarker } from './PinMarker';
import { RoutePolyline } from './RoutePolyline';
import { UserLocationMarker } from './UserLocationMarker';
import { ProximityCircle } from './ProximityCircle';

const CALABARZON_CENTER: L.LatLngTuple = [14.1, 121.5];

interface MapViewProps {
  pins: Location[];
  selectedPin: Location | null;
  onSelectPin: (pin: Location) => void;
  onMapClick: (lat: number, lng: number) => void;
  directions: DirectionsResult | null;
  directionsFrom: { lat: number; lng: number } | null;
  activeFilter: string;
  userLocation: UserLocation | null;
  proximityKm: number | null;   // null = circle hidden
  mapStyle: 'warm' | 'classic';
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if ((e.originalEvent.target as HTMLElement).closest('.seety-pin, .user-location-dot')) return;
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface ClusteredMarkersProps {
  pins: Location[];
  selectedPin: Location | null;
  onSelectPin: (pin: Location) => void;
}

function ClusteredMarkers({ pins, selectedPin, onSelectPin }: ClusteredMarkersProps) {
  const map = useMap();
  const [mcg, setMcg] = useState<any>(null);

  useEffect(() => {
    const group = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      animate: true,
      animateAddingMarkers: true,
      iconCreateFunction: function (cluster: any) {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div class="seety-cluster-inner">${count}</div>`,
          className: 'seety-cluster-marker',
          iconSize: L.point(40, 40, true),
        });
      },
    });

    map.addLayer(group);
    setMcg(group);

    return () => {
      map.removeLayer(group);
      setMcg(null);
    };
  }, [map]);

  return (
    <>
      {mcg && pins.map(pin => (
        <PinMarker
          key={pin.id}
          location={pin}
          selected={selectedPin?.id === pin.id}
          onSelect={onSelectPin}
          clusterGroup={mcg}
        />
      ))}
    </>
  );
}

export function MapView({
  pins, selectedPin, onSelectPin, onMapClick,
  directions, directionsFrom, activeFilter,
  userLocation, proximityKm, mapStyle,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);

  const flyTo = useCallback((lat: number, lng: number) => {
    mapRef.current?.flyTo([lat, lng], 15, { duration: 1 });
  }, []);

  // Expose flyTo globally for sidebar click
  (window as unknown as { _seetyFlyTo?: typeof flyTo })._seetyFlyTo = flyTo;

  // Auto-focus map on selected pin when it changes
  useEffect(() => {
    if (selectedPin) {
      flyTo(selectedPin.lat, selectedPin.lng);
    }
  }, [selectedPin, flyTo]);

  const visiblePins = activeFilter === 'ALL'
    ? pins
    : pins.filter(p => p.place_type === activeFilter);

  return (
    <MapContainer
      center={CALABARZON_CENTER}
      zoom={10}
      minZoom={3} // Allow zooming out to render the whole map
      maxZoom={18}
      style={{ height: '100%', width: '100%' }}
      className={mapStyle === 'warm' ? 'map-warm' : ''}
      ref={mapRef as unknown as React.Ref<L.Map>}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />

      <MapClickHandler onClick={onMapClick} />

      {/* User location */}
      {userLocation && <UserLocationMarker location={userLocation} />}

      {/* Proximity circle */}
      {userLocation && proximityKm && (
        <ProximityCircle location={userLocation} radiusKm={proximityKm} />
      )}

      {/* Pin markers clustered */}
      <ClusteredMarkers
        pins={visiblePins}
        selectedPin={selectedPin}
        onSelectPin={onSelectPin}
      />

      {/* Route polyline */}
      {directions && directionsFrom && selectedPin && (
        <RoutePolyline
          result={directions}
          from={directionsFrom}
          to={{ lat: selectedPin.lat, lng: selectedPin.lng }}
        />
      )}
    </MapContainer>
  );
}

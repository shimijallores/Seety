import { Heart, ChevronRight } from 'lucide-react';
import type { Location } from '../../lib/api';
import { getPlaceMeta } from '../../lib/placeTypes';

interface PinListProps {
  pins: Location[];
  selectedPin: Location | null;
  onSelect: (pin: Location) => void;
  userLocation: { lat: number; lng: number } | null;
  unitSystem: 'metric' | 'imperial';
}

function getDistanceText(lat1: number, lon1: number, lat2: number, lon2: number, unitSystem: 'metric' | 'imperial'): string {
  const R = 6371000; // Radius of the earth in meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dMeters = R * c;

  if (unitSystem === 'imperial') {
    if (dMeters < 804.672) {
      const feet = Math.round(dMeters * 3.28084);
      return `${feet}ft`;
    } else {
      const miles = (dMeters / 1609.344).toFixed(1);
      return `${miles}mi`;
    }
  } else {
    if (dMeters < 1000) {
      return `${Math.round(dMeters)}m`;
    } else {
      return `${(dMeters / 1000).toFixed(1)}km`;
    }
  }
}

export function PinList({ pins, selectedPin, onSelect, userLocation, unitSystem }: PinListProps) {
  if (pins.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text)' }}>No locations yet</p>
        <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>Add pins on the map to get started.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {pins.map(pin => {
        const meta = getPlaceMeta(pin.place_type);
        const Icon = meta.icon;
        const isSelected = selectedPin?.id === pin.id;
        
        let distanceStr = '';
        if (userLocation) {
          distanceStr = getDistanceText(userLocation.lat, userLocation.lng, pin.lat, pin.lng, unitSystem);
        }

        return (
          <div
            key={pin.id}
            id={`pin-list-item-${pin.id}`}
            onClick={() => {
              onSelect(pin);
              const flyTo = (window as unknown as { _seetyFlyTo?: (lat: number, lng: number) => void })._seetyFlyTo;
              flyTo?.(pin.lat, pin.lng);
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '1rem',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
              boxShadow: '0 2px 8px rgba(78, 54, 41, 0.04)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
              {/* Image/Icon container */}
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: '#f3ece3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                <Icon size={20} color="var(--color-primary)" strokeWidth={2} />
                <div style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  border: '1.5px solid #fff'
                }} />
              </div>

              {/* Title & metadata */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--color-text)',
                    margin: 0,
                    lineHeight: 1.2,
                    fontFamily: 'system-ui, sans-serif',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {pin.name}
                  </h3>
                  
                  {distanceStr && (
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                      backgroundColor: '#f3ece3',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '12px',
                      whiteSpace: 'nowrap',
                    }}>
                      {distanceStr}
                    </span>
                  )}
                </div>

                <p style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                  marginTop: '0.125rem',
                  marginBottom: '0.375rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {meta.label} {pin.address ? `· ${pin.address}` : ''}
                </p>

                {/* Sub-tags / categories pills */}
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.6875rem',
                    backgroundColor: '#faf6f0',
                    color: 'var(--color-primary)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    fontWeight: 500,
                    textTransform: 'lowercase',
                  }}>
                    {pin.place_type.replace('_', ' ')}
                  </span>
                  <span style={{
                    fontSize: '0.6875rem',
                    backgroundColor: '#faf6f0',
                    color: 'var(--color-text-muted)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    fontWeight: 500,
                  }}>
                    local
                  </span>
                </div>
              </div>
            </div>

            {/* Favorite heart icon on bottom right */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              color: 'var(--color-text-muted)',
              opacity: 0.7,
              cursor: 'pointer',
            }} onClick={(e) => {
              e.stopPropagation();
            }}>
              <Heart size={14} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

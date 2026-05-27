import { Navigation, Clock, X, Loader2 } from 'lucide-react';
import type { DirectionsState } from '../../hooks/useDirections';

interface DirectionsPanelProps {
  state: DirectionsState;
  destinationName: string;
  onClear: () => void;
}

export function DirectionsPanel({ state, destinationName, onClear }: DirectionsPanelProps) {
  if (!state.result && !state.loading && !state.error) return null;

  const distanceKm = state.result ? (state.result.distance_m / 1000).toFixed(1) : '—';
  
  const fmtDuration = (s: number): string => {
    if (s < 60) return `${Math.round(s)} sec`;
    const min = Math.round(s / 60);
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)}h ${min % 60}m`;
  };

  return (
    <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)' }}>
      {state.loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 0.8s linear infinite' }} />
          Loading directions…
        </div>
      )}

      {state.error && (
        <div className="toast toast-error" style={{ marginBottom: 0 }}>
          {state.error}
        </div>
      )}

      {state.result && (
        <div className="directions-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Navigation size={16} color="#fff" strokeWidth={2.5} />
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Directions</span>
            </div>
            <button
              id="clear-directions-btn"
              onClick={onClear}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={14} color="#fff" />
            </button>
          </div>

          <div style={{ fontSize: '0.75rem', opacity: 0.85, marginBottom: '0.875rem' }}>
            <span style={{ fontWeight: 500 }}>{state.fromLabel}</span>
            <span style={{ margin: '0 0.375rem' }}>→</span>
            <span style={{ fontWeight: 500 }}>{destinationName}</span>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div className="directions-stat">
              <p className="value">{distanceKm}<span style={{ fontSize: '0.875rem', fontWeight: 400 }}> km</span></p>
              <p className="label">Distance</p>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.25)' }} />
            <div className="directions-stat">
              <p className="value">{state.result ? fmtDuration(state.result.duration_s) : '—'}</p>
              <p className="label">
                <Clock size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                Estimated
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

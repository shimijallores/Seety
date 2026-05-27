import { useState, useEffect, useCallback } from 'react';
import {
  ArrowUp, ArrowUpRight, ArrowUpLeft,
  CornerDownRight, CornerDownLeft, CornerUpRight, CornerUpLeft,
  RotateCcw, Navigation2, Flag, RefreshCw,
  X, ChevronUp, ChevronDown, Clock,
  type LucideIcon,
} from 'lucide-react';
import type { OsrmStep } from '../../lib/api';
import type { UserLocation } from '../../hooks/useUserLocation';

// ── Haversine distance ───────────────────────────────────────────────────
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Formatters ───────────────────────────────────────────────────────────
function fmtDist(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function fmtDur(s: number): string {
  if (s < 60) return `${Math.round(s)} sec`;
  const min = Math.floor(s / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}min`;
}

function eta(durationSeconds: number): string {
  const d = new Date(Date.now() + durationSeconds * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Maneuver → icon + text ────────────────────────────────────────────────
interface ManeuverInfo { Icon: LucideIcon; text: string }

function getManeuverInfo(type: string, modifier?: string): ManeuverInfo {
  if (type === 'depart')  return { Icon: Navigation2, text: 'Start driving' };
  if (type === 'arrive')  return { Icon: Flag,         text: 'You have arrived' };
  if (type === 'roundabout' || type === 'rotary') return { Icon: RefreshCw, text: 'Take the roundabout' };
  if (type === 'merge')   return { Icon: ArrowUpRight, text: 'Merge' };
  if (type === 'on ramp') return { Icon: ArrowUpRight, text: 'Take the ramp' };

  switch (modifier) {
    case 'right':       return { Icon: CornerDownRight, text: 'Turn right' };
    case 'left':        return { Icon: CornerDownLeft,  text: 'Turn left' };
    case 'slight right':return { Icon: ArrowUpRight,    text: 'Keep right' };
    case 'slight left': return { Icon: ArrowUpLeft,     text: 'Keep left' };
    case 'sharp right': return { Icon: CornerUpRight,   text: 'Sharp right' };
    case 'sharp left':  return { Icon: CornerUpLeft,    text: 'Sharp left' };
    case 'uturn':       return { Icon: RotateCcw,       text: 'Make a U-turn' };
    case 'straight':    return { Icon: ArrowUp,         text: 'Continue straight' };
    default:            return { Icon: ArrowUp,         text: 'Continue' };
  }
}

// ── Props ────────────────────────────────────────────────────────────────
interface NavigationOverlayProps {
  steps: OsrmStep[];
  totalDistanceM: number;
  totalDurationS: number;
  destinationName: string;
  userLocation: UserLocation | null;
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────────
export function NavigationOverlay({
  steps, totalDistanceM, totalDurationS,
  destinationName, userLocation, onClose,
}: NavigationOverlayProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showSteps, setShowSteps] = useState(false);

  // Auto-advance step when user approaches the next maneuver point
  useEffect(() => {
    if (!userLocation || currentIdx >= steps.length - 1) return;
    const nextStep = steps[currentIdx + 1];
    if (!nextStep) return;
    const [lng, lat] = nextStep.maneuver.location;
    const dist = haversine(userLocation.lat, userLocation.lng, lat, lng);
    if (dist < 30) {
      setCurrentIdx(i => Math.min(i + 1, steps.length - 1));
    }
  }, [userLocation, currentIdx, steps]);

  const current = steps[currentIdx];
  const next    = steps[currentIdx + 1];
  if (!current) return null;

  const { Icon: CurrIcon, text: currText } = getManeuverInfo(
    current.maneuver.type, current.maneuver.modifier
  );

  // Remaining distance/duration from current step onwards
  const remainingDist = steps.slice(currentIdx).reduce((s, st) => s + st.distance, 0);
  const remainingDur  = steps.slice(currentIdx).reduce((s, st) => s + st.duration, 0);

  return (
    <>
      {/* ── Top instruction banner ── */}
      <div className="nav-top-banner animate-fade-in">
        <div className="nav-maneuver-icon">
          <CurrIcon size={26} strokeWidth={2.5} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="nav-instruction">{currText}</p>
          {current.name && (
            <p className="nav-road-name">{current.name}</p>
          )}
        </div>
        {next && (
          <div className="nav-dist-badge">
            <span className="nav-dist-value">{fmtDist(current.distance)}</span>
          </div>
        )}
      </div>

      {/* ── Bottom ETA bar ── */}
      <div className="nav-bottom-bar animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          <Navigation2 size={18} color="var(--color-primary)" strokeWidth={2} />
          <div className="nav-stat">
            <span className="nav-stat-value">{fmtDur(remainingDur)}</span>
          </div>
          <span style={{ color: 'var(--color-border)', fontSize: '1.25rem' }}>·</span>
          <div className="nav-stat">
            <span className="nav-stat-value">{fmtDist(remainingDist)}</span>
          </div>
          <span style={{ color: 'var(--color-border)', fontSize: '1.25rem' }}>·</span>
          <div className="nav-stat" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Clock size={13} color="var(--color-text-muted)" />
            <span className="nav-stat-value">{eta(remainingDur)}</span>
          </div>
        </div>

        <button
          id="nav-show-steps-btn"
          className="btn btn-primary btn-sm"
          onClick={() => setShowSteps(v => !v)}
          style={{ gap: 4 }}
        >
          {showSteps ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          Steps
        </button>
        <button
          id="nav-close-btn"
          className="btn btn-ghost btn-icon btn-sm"
          onClick={onClose}
          style={{ color: 'var(--color-danger)' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Steps modal ── */}
      {showSteps && (
        <div className="nav-steps-overlay animate-fade-in" onClick={() => setShowSteps(false)}>
          <div
            className="nav-steps-modal animate-slide-in-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="nav-steps-header">
              <div>
                <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  TURN-BY-TURN
                </p>
                <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)' }}>
                  {destinationName}
                </p>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setShowSteps(false)}
                id="close-steps-modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="sep" />

            {/* Step list */}
            <div className="nav-steps-list">
              {steps.map((step, i) => {
                const { Icon, text } = getManeuverInfo(step.maneuver.type, step.maneuver.modifier);
                const isActive = i === currentIdx;
                const isDone = i < currentIdx;
                return (
                  <div
                    key={i}
                    className={`nav-step-row ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                    onClick={() => { setCurrentIdx(i); setShowSteps(false); }}
                  >
                    {/* Step number */}
                    <div className={`nav-step-num ${isActive ? 'active' : ''}`}>
                      {isDone ? '✓' : i + 1}
                    </div>

                    {/* Instruction + road */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="nav-step-text">{text}</p>
                      {step.name && (
                        <p className="nav-step-road">{step.name}</p>
                      )}
                    </div>

                    {/* Icon + distance */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                      <Icon size={16} color={isActive ? 'var(--color-primary)' : 'var(--color-text-muted)'} strokeWidth={2} />
                      <span className="nav-step-dist">{fmtDist(step.distance)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary footer */}
            <div className="sep" />
            <div style={{ padding: '0.75rem 1rem', display: 'flex', gap: '1.5rem' }}>
              <div className="nav-stat">
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total</span>
                <span className="nav-stat-value">{fmtDist(totalDistanceM)}</span>
              </div>
              <div className="nav-stat">
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ETA</span>
                <span className="nav-stat-value">{fmtDur(totalDurationS)} · {eta(totalDurationS)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

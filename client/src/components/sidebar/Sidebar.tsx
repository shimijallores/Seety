import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search, Plus, MapPin, X, LocateFixed, Loader2,
  Heart, Clock, Settings, Info, ChevronLeft, ChevronRight,
  Navigation, Pencil, Trash2, Copy, Sparkles, ExternalLink, Tag,
  Sun, Moon, Map, Ruler, Trash, ShieldAlert
} from 'lucide-react';
import type { Location, Person } from '../../lib/api';
import { searchApi, type SearchResults } from '../../lib/api';
import { PinList } from './PinList';
import { FilterChips } from './FilterChips';
import { getPlaceMeta } from '../../lib/placeTypes';
import type { DirectionsState } from '../../hooks/useDirections';
import { LocationForm } from '../location/LocationForm';
import { PeopleTable } from '../people/PeopleTable';

const PROXIMITY_OPTIONS = [1, 3, 5] as const;
type ProximityKm = (typeof PROXIMITY_OPTIONS)[number];

interface SidebarProps {
  pins: Location[];
  selectedPin: Location | null;
  onSelectPin: (pin: Location) => void;
  onAddPin: () => void;
  activeFilter: string;
  onFilterChange: (f: string) => void;
  loading: boolean;
  error: string | null;
  // Location + proximity
  hasUserLocation: boolean;
  locationLoading: boolean;
  proximityKm: ProximityKm | null;
  onRequestLocation: () => void;
  onProximityChange: (km: ProximityKm | null) => void;
  userLocation: { lat: number; lng: number } | null;

  // Detail View Props (inline replacements)
  onClosePinDetails: () => void;
  onUpdatePin: (id: number, data: Partial<Omit<Location, 'id' | 'created_at' | 'updated_at'>>) => Promise<void>;
  onDeletePin: (id: number) => Promise<void>;
  onGetDirections: () => void;
  directionsState: DirectionsState;
  onClearDirections: () => void;
  people: Person[];
  peopleLoading: boolean;
  onTriggerAddPerson: () => void;
  onTriggerEditPerson: (person: Person) => void;
  onTriggerDeletePerson: (person: Person) => void;

  // Settings
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  mapStyle: 'warm' | 'classic';
  setMapStyle: (s: 'warm' | 'classic') => void;
  unitSystem: 'metric' | 'imperial';
  setUnitSystem: (u: 'metric' | 'imperial') => void;
  savedPinIds: number[];
  onToggleSavePin: (id: number) => void;
  onClearSavedPins: () => void;
  onAddPinAtCoords?: (lat: number, lng: number, name?: string, address?: string) => void;
}

function fmtDuration(s: number): string {
  if (s < 60) return `${Math.round(s)} sec`;
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

export function Sidebar({
  pins, selectedPin, onSelectPin, onAddPin,
  activeFilter, onFilterChange,
  loading, error,
  hasUserLocation, locationLoading, proximityKm,
  onRequestLocation, onProximityChange,
  userLocation,
  // Detail views
  onClosePinDetails, onUpdatePin, onDeletePin,
  onGetDirections, directionsState, onClearDirections,
  people, peopleLoading, onTriggerAddPerson, onTriggerEditPerson, onTriggerDeletePerson,
  // Settings
  theme, setTheme, mapStyle, setMapStyle, unitSystem, setUnitSystem,
  savedPinIds, onToggleSavePin, onClearSavedPins, onAddPinAtCoords
}: SidebarProps) {
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Edit states for selected pin
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const isSaved = selectedPin ? savedPinIds.includes(selectedPin.id) : false;

  // Dynamic time
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCurrentTimeStr(formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Reset states when pin changes
  useEffect(() => {
    setEditing(false);
    setConfirmDelete(false);
  }, [selectedPin?.id]);

  const handleSearchChange = useCallback((q: string) => {
    setSearchQ(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setSearchResults(null); return; }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try { setSearchResults(await searchApi.search(q.trim())); }
      finally { setSearchLoading(false); }
    }, 300);
  }, []);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults(null);
      }
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const pinCounts: Record<string, number> = { ALL: pins.length };
  pins.forEach(p => { pinCounts[p.place_type] = (pinCounts[p.place_type] ?? 0) + 1; });

  const filteredPins = activeFilter === 'ALL' ? pins : pins.filter(p => p.place_type === activeFilter);
  const hasSearchResults = searchResults &&
    (searchResults.locations.length > 0 || searchResults.people.length > 0);

  const selectedMeta = selectedPin ? getPlaceMeta(selectedPin.place_type) : null;
  const SelectedIcon = selectedMeta ? selectedMeta.icon : null;

  // Today's Pick: select the first pin or a featured one
  const todaysPick = pins.length > 0 ? pins[0] : null;
  const todaysPickMeta = todaysPick ? getPlaceMeta(todaysPick.place_type) : null;

  function copyCoords() {
    if (!selectedPin) return;
    navigator.clipboard.writeText(`${selectedPin.lat.toFixed(6)}, ${selectedPin.lng.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleDelete() {
    if (!selectedPin) return;
    setDeleting(true);
    try {
      await onDeletePin(selectedPin.id);
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  // Helper to calculate distance in meters
  const getDistanceMeters = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Helper to format distance dynamically
  const formatDistance = useCallback((meters: number) => {
    if (unitSystem === 'imperial') {
      if (meters < 804.672) {
        const feet = Math.round(meters * 3.28084);
        return `${feet} ft`;
      } else {
        const miles = (meters / 1609.344).toFixed(1);
        return `${miles} mi`;
      }
    } else {
      if (meters < 1000) {
        return `${Math.round(meters)} m`;
      } else {
        return `${(meters / 1000).toFixed(1)} km`;
      }
    }
  }, [unitSystem]);

  // Calculate selected pin distance and walk time
  let distanceText = '';
  let walkTimeText = '';
  if (selectedPin && userLocation) {
    const distM = getDistanceMeters(userLocation.lat, userLocation.lng, selectedPin.lat, selectedPin.lng);
    const walkMin = Math.round(distM / 80); // 80m/min
    walkTimeText = walkMin > 0 ? `${walkMin} min walk` : '1 min walk';
    distanceText = formatDistance(distM);
  }

  // Calculate today's pick distance
  const todaysPickDistance = (todaysPick && userLocation)
    ? ((): string => {
        const distM = getDistanceMeters(userLocation.lat, userLocation.lng, todaysPick.lat, todaysPick.lng);
        return `${formatDistance(distM)} away`;
      })()
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-background)', borderRight: '1px solid var(--color-border)', overflow: 'hidden' }}>
      
      {/* ── ALWAYS VISIBLE: TOP SEARCH & CONTROLS SECTION ── */}
      
      {/* Search bar inside white rounded container */}
      <div id="sidebar-search-container" style={{ padding: '1.25rem 1.25rem 0.75rem' }}>
        <div ref={searchRef} style={{ position: 'relative' }}>
          <div style={{
            position: 'relative',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '0.25rem 0.25rem 0.25rem 0.75rem',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 4px 18px rgba(78, 54, 41, 0.08)',
            border: '1px solid var(--color-border)',
          }}>
            <Search size={18} color="var(--color-text-muted)" style={{ marginRight: '0.5rem', flexShrink: 0 }} />
            <input
              id="global-search"
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '0.9375rem',
                flex: 1,
                color: 'var(--color-text)',
                background: 'transparent',
                padding: '0.5rem 0',
              }}
              placeholder="Search location or category..."
              value={searchQ}
              onChange={e => handleSearchChange(e.target.value)}
            />
            {searchQ && (
              <button onClick={() => { setSearchQ(''); setSearchResults(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.5rem' }}>
                <X size={16} />
              </button>
            )}
          </div>

          {/* Search dropdown */}
          {searchQ && (
            <div className="search-dropdown" style={{ borderRadius: '16px', marginTop: '0.5rem', boxShadow: '0 8px 32px rgba(78,54,41,0.15)' }}>
              {searchLoading && (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                  Searching…
                </div>
              )}
              {!searchLoading && !hasSearchResults && (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                  No results for "{searchQ}"
                </div>
              )}
              {!searchLoading && searchResults?.locations && searchResults.locations.length > 0 && (
                <>
                  <div className="search-result-group-title">Locations</div>
                  {searchResults.locations.map(loc => {
                    const meta = getPlaceMeta(loc.place_type);
                    const Icon = meta.icon;
                    const pin = pins.find(p => p.id === loc.id);
                    return (
                      <div key={loc.id} className="search-result-item" onClick={() => {
                        if (pin) {
                          onSelectPin(pin);
                          (window as unknown as { _seetyFlyTo?: (lat: number, lng: number) => void })._seetyFlyTo?.(loc.lat, loc.lng);
                        } else if (loc.id < 0) {
                          (window as unknown as { _seetyFlyTo?: (lat: number, lng: number) => void })._seetyFlyTo?.(loc.lat, loc.lng);
                          onAddPinAtCoords?.(loc.lat, loc.lng, loc.name, loc.address ?? undefined);
                        }
                        setSearchResults(null); setSearchQ('');
                      }}>
                        <Icon size={15} color="var(--color-primary)" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--color-text)' }}>{loc.name}</p>
                          {loc.address && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{loc.address}</p>}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Proximity Pill Choices */}
      <div style={{
        padding: '0 1.25rem 0.875rem',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: '0.625rem',
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginRight: '0.25rem' }}>
          Proximity:
        </span>
        {PROXIMITY_OPTIONS.map(km => (
          <button
            key={km}
            id={`proximity-${km}km`}
            style={{
              background: proximityKm === km ? 'var(--color-primary)' : '#ffffff',
              border: '1px solid var(--color-border)',
              color: proximityKm === km ? '#ffffff' : 'var(--color-text)',
              borderRadius: '9999px',
              padding: '0.4rem 0.875rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onClick={() => onProximityChange(proximityKm === km ? null : km)}
          >
            {km} km
          </button>
        ))}
      </div>

      {/* Icon subbar / action tab bar */}
      <div style={{
        padding: '0 1.25rem 0.875rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <button style={{
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            padding: '0.4rem 0.875rem',
            borderRadius: '16px',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}>
            <LocateFixed size={13} />
            Nearby
          </button>
          <button className="btn btn-ghost btn-icon" style={{ borderRadius: '12px', width: 34, height: 34, color: 'var(--color-text-muted)' }}>
            <Clock size={16} />
          </button>
          <button className="btn btn-ghost btn-icon" style={{ borderRadius: '12px', width: 34, height: 34, color: 'var(--color-text-muted)' }}>
            <Heart size={16} />
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          <button
            id="info-btn"
            className="btn btn-ghost btn-icon"
            onClick={() => setShowInfo(true)}
            style={{ borderRadius: '12px', width: 34, height: 34, color: 'var(--color-text-muted)' }}
            title="About Seety"
          >
            <Info size={16} />
          </button>
          
          <button
            id="settings-btn"
            className="btn btn-ghost btn-icon"
            onClick={() => setShowSettings(true)}
            style={{ borderRadius: '12px', width: 34, height: 34, color: 'var(--color-text-muted)' }}
            title="Settings"
          >
            <Settings size={16} />
          </button>

          {/* Locate Me Crosshair button next to Settings */}
          <button
            id="locate-btn"
            className="btn btn-ghost btn-icon"
            onClick={onRequestLocation}
            disabled={locationLoading}
            style={{
              borderRadius: '12px',
              width: 34,
              height: 34,
              color: hasUserLocation ? 'var(--color-primary)' : 'var(--color-text-muted)',
            }}
            title="Locate Me"
          >
            {locationLoading ? (
              <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <LocateFixed size={16} />
            )}
          </button>

          {/* Add Pin Button with animated pulsing border and matching 12px style */}
          <button
            id="add-pin-btn"
            className="btn btn-ghost pulse-button-border"
            onClick={onAddPin}
            style={{
              borderRadius: '12px',
              width: 34,
              height: 34,
              backgroundColor: 'var(--color-primary-muted)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
            title="Add location"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── DYNAMIC SECTION: CONTENT OR DETAILS ── */}
      <div id="sidebar-dynamic-container" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selectedPin ? (
          /* ── View 2: Redesigned Opened Pin Location Details ── */
          <div key={`details-${selectedPin.id}`} className="animate-sidebar-change" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: '#FAF6F0' }}>
            {/* Header / Back Link */}
            <div style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', backgroundColor: '#fff' }}>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={onClosePinDetails} style={{ color: 'var(--color-primary)' }}>
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--color-primary)' }}>Back to locations list</span>
            </div>

            {/* Opened Pin Details Card */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
              
              {/* Sloth / Bear image decoration layout */}
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2 style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--color-text)', fontFamily: 'Georgia, serif', lineHeight: 1.2 }}>
                    {selectedPin.name}
                  </h2>
                  
                  {/* Walk & distance estimation */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.375rem' }}>
                    <Navigation size={13} style={{ transform: 'rotate(45deg)', fill: 'currentColor' }} />
                    <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                      {walkTimeText ? `${walkTimeText} · ` : ''}{distanceText || 'Local coordinate'}
                    </span>
                  </div>
                </div>

                {/* Character Illustration placeholder on right */}
                <div style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.18, flexShrink: 0 }}>
                  <Sparkles size={64} color="var(--color-primary)" />
                </div>
              </div>

              {/* Data source chip */}
              <div style={{ display: 'flex', marginBottom: '1.25rem' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  backgroundColor: '#ebe3d9',
                  color: 'var(--color-primary)',
                  borderRadius: '9999px',
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}>
                  <Copy size={11} />
                  Data source: Local
                </div>
              </div>

              {/* Replace directions button with directions stats card if loaded */}
              {directionsState.result ? (
                <div
                  className="animate-sidebar-change"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: '#ffffff',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    marginBottom: '1.25rem',
                    position: 'relative',
                    boxShadow: '0 4px 12px rgba(78, 54, 41, 0.15)',
                  }}
                >
                  {/* Close button inside card */}
                  <button
                    onClick={onClearDirections}
                    style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      borderRadius: '50%',
                      width: 28,
                      height: 28,
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={14} color="#fff" />
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Navigation size={15} style={{ transform: 'rotate(45deg)', fill: 'currentColor' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Directions</span>
                  </div>

                  <div style={{ fontSize: '0.8125rem', opacity: 0.85, marginBottom: '1.25rem' }}>
                    {directionsState.fromLabel || 'Your Location'} → {selectedPin.name}
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
                        {(directionsState.result.distance_m / 1000).toFixed(1)}
                        <span style={{ fontSize: '0.875rem', fontWeight: 400 }}> km</span>
                      </p>
                      <p style={{ fontSize: '0.75rem', opacity: 0.8, margin: 0 }}>Distance</p>
                    </div>
                    
                    <div style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.25)' }} />
                    
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
                        {fmtDuration(directionsState.result.duration_s)}
                      </p>
                      <p style={{ fontSize: '0.75rem', opacity: 0.8, margin: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={11} />
                        Estimated
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Main Brown Button: Get Directions */
                <button
                  onClick={onGetDirections}
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '24px',
                    padding: '0.875rem',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    boxShadow: '0 4px 12px rgba(78, 54, 41, 0.2)',
                    marginBottom: '1.25rem',
                    transition: 'opacity 0.2s',
                  }}
                >
                  <Navigation size={18} style={{ transform: 'rotate(45deg)', fill: 'currentColor' }} />
                  Get directions
                </button>
              )}

              {/* Quick Actions Grid (Save, Edit, Copy link, Delete) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.625rem', marginBottom: '1.25rem' }}>
                {/* Save */}
                <button
                  onClick={() => selectedPin && onToggleSavePin(selectedPin.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '0.75rem 0.25rem', backgroundColor: '#fff', border: '1px solid var(--color-border)',
                    borderRadius: '16px', cursor: 'pointer', gap: '0.375rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                >
                  <Heart size={18} fill={isSaved ? 'var(--color-primary)' : 'none'} color={isSaved ? 'var(--color-primary)' : 'var(--color-text)'} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text)' }}>Save</span>
                </button>

                {/* Edit */}
                <button
                  onClick={() => setEditing(true)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '0.75rem 0.25rem', backgroundColor: '#fff', border: '1px solid var(--color-border)',
                    borderRadius: '16px', cursor: 'pointer', gap: '0.375rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                >
                  <Pencil size={18} color="var(--color-text)" />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text)' }}>Edit</span>
                </button>

                {/* Copy Link */}
                <button
                  onClick={copyCoords}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '0.75rem 0.25rem', backgroundColor: '#fff', border: '1px solid var(--color-border)',
                    borderRadius: '16px', cursor: 'pointer', gap: '0.375rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                >
                  <Copy size={18} color="var(--color-text)" />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text)' }}>
                    {copied ? 'Copied!' : 'Copy link'}
                  </span>
                </button>

                {/* Delete */}
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '0.75rem 0.25rem', backgroundColor: '#fff', border: '1px solid var(--color-border)',
                    borderRadius: '16px', cursor: 'pointer', gap: '0.375rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    color: 'var(--color-danger)',
                  }}
                >
                  <Trash2 size={18} color="var(--color-danger)" />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-danger)' }}>Delete</span>
                </button>
              </div>

              {/* External Maps Link */}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${selectedPin.lat},${selectedPin.lng}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  color: 'var(--color-text)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  marginBottom: '1.25rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ExternalLink size={16} />
                  Maps
                </div>
                <ChevronRight size={16} />
              </a>

              {/* Associated People table */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem', paddingBottom: '1.25rem' }}>
                <PeopleTable
                  people={people}
                  locationId={selectedPin.id}
                  loading={peopleLoading}
                  onAddClick={onTriggerAddPerson}
                  onEditClick={onTriggerEditPerson}
                  onDeleteClick={onTriggerDeletePerson}
                />
              </div>

              {/* Hours, Location details, Features at the bottom */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#FAF6F0' }}>
                
                {/* Hours */}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <Clock size={16} color="var(--color-text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <h4 style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Hours
                    </h4>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', marginTop: 2 }}>
                      Not available
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <MapPin size={16} color="var(--color-text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <h4 style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Location
                    </h4>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', marginTop: 2 }}>
                      {selectedPin.address || `${selectedPin.lat.toFixed(5)}, ${selectedPin.lng.toFixed(5)}`}
                    </p>
                  </div>
                </div>

                {/* Features */}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <Tag size={16} color="var(--color-text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <h4 style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                      Features
                    </h4>
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', backgroundColor: '#ebe3d9', color: 'var(--color-primary)', padding: '0.2rem 0.625rem', borderRadius: '12px', fontWeight: 600 }}>
                        {selectedPin.place_type.toLowerCase()}
                      </span>
                      <span style={{ fontSize: '0.75rem', backgroundColor: '#ebe3d9', color: 'var(--color-primary)', padding: '0.2rem 0.625rem', borderRadius: '12px', fontWeight: 600 }}>
                        establishment
                      </span>
                      <span style={{ fontSize: '0.75rem', backgroundColor: '#ebe3d9', color: 'var(--color-primary)', padding: '0.2rem 0.625rem', borderRadius: '12px', fontWeight: 600 }}>
                        local
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        ) : (
          /* ── View 1: List & Announcements view ── */
          <div key="list-view" className="animate-sidebar-change" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            
            {/* Announcement card / Promotion banner */}
            <div style={{ padding: '1rem 1.25rem 0.75rem' }}>
              <div style={{
                background: 'linear-gradient(135deg, #4e3629 0%, #2d1e16 100%)',
                color: '#ffffff',
                borderRadius: '20px',
                padding: '1.25rem',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 18px rgba(78, 54, 41, 0.15)',
              }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', color: '#ebe3d9', textTransform: 'uppercase' }}>
                  {currentTimeStr} ----- Late night
                </span>
                
                <p style={{ fontSize: '0.8125rem', color: '#ebe3d9', opacity: 0.9, lineHeight: 1.4, margin: '0.375rem 0 0.875rem' }}>
                  Track municipal LGU offices, AFP camps, BFP stations, disaster response centers, and emergency hubs across the region.
                </p>
                
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}>
                  <Sparkles size={12} />
                  {pins.length} locations tracked
                </div>
              </div>
            </div>

            {/* Today's Pick Card */}
            {todaysPick && (
              <div style={{ padding: '0 1.25rem 0.75rem' }}>
                <div
                  onClick={() => onSelectPin(todaysPick)}
                  style={{
                    backgroundColor: '#FAF6F0',
                    border: '1.5px solid #ebe3d9',
                    borderRadius: '20px',
                    padding: '1.125rem 1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.625rem',
                    boxShadow: '0 4px 18px rgba(78, 54, 41, 0.04)',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, color: '#8e7c72', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <Sparkles size={11} style={{ fill: 'currentColor' }} /> TODAY'S PICK
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      backgroundColor: '#f3ece3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {todaysPickMeta && <todaysPickMeta.icon size={18} color="var(--color-primary)" />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0, fontFamily: 'Georgia, serif' }}>
                        {todaysPick.name}
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.125rem 0 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {todaysPick.address || 'Calabarzon region'}
                      </p>
                      {todaysPickDistance && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                          <span style={{ fontSize: '0.5rem' }}>•</span>
                          <span>{todaysPickDistance}</span>
                        </div>
                      )}
                    </div>

                    <ChevronRight size={16} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                  </div>
                </div>
              </div>
            )}

            {/* Filter chips */}
            <div id="filter-chips-container" style={{ padding: '0 1.25rem 0.5rem' }}>
              <FilterChips active={activeFilter} onChange={onFilterChange} pinCounts={pinCounts} />
            </div>

            {/* Count Header */}
            <div style={{ padding: '0.5rem 1.25rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)' }}>
                {filteredPins.length} location{filteredPins.length !== 1 ? 's' : ''} nearby
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {proximityKm ? `${proximityKm} km - by distance` : 'all locations'}
              </span>
            </div>

            {/* Pins List scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.25rem 1.25rem' }}>
              {error && (
                <div className="toast toast-error" style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>{error}</div>
              )}
              {loading ? (
                <div className="empty-state" style={{ padding: '3rem 0' }}>
                  <div style={{ width: 24, height: 24, border: '3px solid var(--color-primary-muted)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                </div>
              ) : (
                <PinList pins={filteredPins} selectedPin={selectedPin} onSelect={onSelectPin} userLocation={userLocation} unitSystem={unitSystem} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals for Edit and Delete ── */}
      {editing && selectedPin && (
        <div className="modal-overlay" style={{ zIndex: 600 }} onClick={e => { if (e.target === e.currentTarget) setEditing(false); }}>
          <div className="modal-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-primary)' }}>
                Edit Location
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditing(false)}>
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>×</span>
              </button>
            </div>
            <LocationForm
              editData={selectedPin}
              onSubmit={async data => {
                await onUpdatePin(selectedPin.id, data);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          </div>
        </div>
      )}

      {confirmDelete && selectedPin && (
        <div className="modal-overlay" style={{ zIndex: 600 }} onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(false); }}>
          <div className="modal-box" style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-danger)' }}>
                Delete Location
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setConfirmDelete(false)}>
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>×</span>
              </button>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', marginBottom: '1.25rem' }}>
              Are you sure you want to delete <strong>{selectedPin.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Modal ── */}
      {showSettings && (
        <div className="modal-overlay" style={{ zIndex: 600 }} onClick={e => { if (e.target === e.currentTarget) setShowSettings(false); }}>
          <div className="modal-box" style={{ maxWidth: '480px', borderRadius: '24px', padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#f3ece3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Settings size={20} color="var(--color-primary)" />
                </div>
                <div>
                  <h2 style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--color-primary)', margin: 0, fontFamily: 'Georgia, serif' }}>
                    Settings
                  </h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                    Tune it just the way you like
                  </p>
                </div>
              </div>
              <button 
                className="btn btn-ghost btn-icon" 
                onClick={() => setShowSettings(false)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(4px)',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content settings options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', zIndex: 2 }}>
              
              {/* APPEARANCE */}
              <div>
                <h3 style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Appearance
                </h3>
                
                {/* Theme */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Sun size={16} color="var(--color-primary)" />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Theme</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>App background</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', backgroundColor: '#f3ece3', padding: '2px', borderRadius: '20px', border: '1px solid var(--color-border)' }}>
                    <button
                      onClick={() => setTheme('light')}
                      style={{
                        padding: '0.4rem 0.875rem', borderRadius: '18px', border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                        backgroundColor: theme === 'light' ? '#ffffff' : 'transparent',
                        color: theme === 'light' ? 'var(--color-text)' : 'var(--color-text-muted)',
                        boxShadow: theme === 'light' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      Light
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      style={{
                        padding: '0.4rem 0.875rem', borderRadius: '18px', border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                        backgroundColor: theme === 'dark' ? '#ffffff' : 'transparent',
                        color: theme === 'dark' ? 'var(--color-text)' : 'var(--color-text-muted)',
                        boxShadow: theme === 'dark' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      Dark
                    </button>
                  </div>
                </div>

                {/* Map style */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Map size={16} color="var(--color-primary)" />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Map style</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>Warm or Classic</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', backgroundColor: '#f3ece3', padding: '2px', borderRadius: '20px', border: '1px solid var(--color-border)' }}>
                    <button
                      onClick={() => setMapStyle('warm')}
                      style={{
                        padding: '0.4rem 0.875rem', borderRadius: '18px', border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                        backgroundColor: mapStyle === 'warm' ? '#ffffff' : 'transparent',
                        color: mapStyle === 'warm' ? 'var(--color-text)' : 'var(--color-text-muted)',
                        boxShadow: mapStyle === 'warm' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      Warm
                    </button>
                    <button
                      onClick={() => setMapStyle('classic')}
                      style={{
                        padding: '0.4rem 0.875rem', borderRadius: '18px', border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                        backgroundColor: mapStyle === 'classic' ? '#ffffff' : 'transparent',
                        color: mapStyle === 'classic' ? 'var(--color-text)' : 'var(--color-text-muted)',
                        boxShadow: mapStyle === 'classic' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      Classic
                    </button>
                  </div>
                </div>

              </div>

              {/* UNITS */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
                <h3 style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Units
                </h3>
                
                {/* Distance */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Ruler size={16} color="var(--color-primary)" />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Distance</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>For walking and commute</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', backgroundColor: '#f3ece3', padding: '2px', borderRadius: '20px', border: '1px solid var(--color-border)' }}>
                    <button
                      onClick={() => setUnitSystem('metric')}
                      style={{
                        padding: '0.4rem 0.875rem', borderRadius: '18px', border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                        backgroundColor: unitSystem === 'metric' ? '#ffffff' : 'transparent',
                        color: unitSystem === 'metric' ? 'var(--color-text)' : 'var(--color-text-muted)',
                        boxShadow: unitSystem === 'metric' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      km / m
                    </button>
                    <button
                      onClick={() => setUnitSystem('imperial')}
                      style={{
                        padding: '0.4rem 0.875rem', borderRadius: '18px', border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                        backgroundColor: unitSystem === 'imperial' ? '#ffffff' : 'transparent',
                        color: unitSystem === 'imperial' ? 'var(--color-text)' : 'var(--color-text-muted)',
                        boxShadow: unitSystem === 'imperial' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      mi / ft
                    </button>
                  </div>
                </div>
              </div>

              {/* YOUR DATA */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
                <h3 style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Your data
                </h3>
                
                {/* Clear saved */}
                <div 
                  onClick={onClearSavedPins}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'opacity 0.15s' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Trash size={16} color="var(--color-primary)" />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                        Clear saved ({savedPinIds.length})
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>Removes all your saved locations</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ABOUT */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
                <h3 style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  About
                </h3>
                
                {/* About Seety */}
                <div 
                  onClick={() => { setShowSettings(false); setShowInfo(true); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'opacity 0.15s' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Info size={16} color="var(--color-primary)" />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>About Seety</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>Data sources and attribution</p>
                    </div>
                  </div>
                  <ChevronRight size={16} color="var(--color-text-muted)" />
                </div>
              </div>

            </div>

            {/* Footer shield banner */}
            <div style={{
              backgroundColor: '#FAF6F0',
              border: '1.5px solid #ebe3d9',
              borderRadius: '20px',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginTop: '1.5rem',
              position: 'relative',
              zIndex: 2,
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '1px solid #ebe3d9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <ShieldAlert size={18} color="var(--color-primary)" />
              </div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.4 }}>
                No account, no tracking. All your preferences stay only on this device.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* ── App Info Modal ── */}
      {showInfo && (
        <div className="modal-overlay" style={{ zIndex: 600 }} onClick={e => { if (e.target === e.currentTarget) setShowInfo(false); }}>
          <div className="modal-box" style={{ maxWidth: '480px', borderRadius: '24px', padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(78, 54, 41, 0.2)',
                }}>
                  {/* Small logo placeholder */}
                  <span style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 800 }}>S</span>
                </div>
                <div>
                  <h2 style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--color-primary)', margin: 0, fontFamily: 'Georgia, serif' }}>
                    Seety
                  </h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                    Honest discovery, PH
                  </p>
                </div>
              </div>
              <button 
                className="btn btn-ghost btn-icon" 
                onClick={() => setShowInfo(false)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(4px)',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', lineHeight: 1.5, margin: 0 }}>
                Seety helps you find your next destination in the Philippines — with an honest, map-first experience built for explorers.
              </p>

              {/* Real data */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#f3ece3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}>
                  <MapPin size={14} color="var(--color-primary)" />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                    Real data, nothing fabricated
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
                    Every location detail comes from OpenStreetMap. We never invent ratings, hours, or amenities — if it's not there, we won't fake it.
                  </p>
                </div>
              </div>

              {/* Built with care */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#f3ece3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}>
                  <Heart size={14} color="var(--color-primary)" />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                    Built with care
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
                    Filipino design, premium polish, mobile-first haptics. For us, by us.
                  </p>
                </div>
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '0.5rem 0' }} />

              {/* Data attribution */}
              <div>
                <h3 style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Data Attribution
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.4, margin: 0 }}>
                  Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>OpenStreetMap contributors</a>, licensed under ODbL. Tiles by <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>CARTO</span>. Routing by OSRM. Photos by Wikimedia Commons & Wikipedia.
                </p>
              </div>

              {/* Footer centered credits */}
              <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Made with ☕ in the Philippines
              </div>
            </div>

          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

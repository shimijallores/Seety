import { useState, useCallback, useEffect, useRef } from 'react';
import { Menu, Navigation, Heart, MapPin, ShieldAlert, Compass, Plus, Search, HelpCircle, Sparkles } from 'lucide-react';
import { MapView } from './components/map/MapView';
import { Sidebar } from './components/sidebar/Sidebar';
import { LocationPanel } from './components/location/LocationPanel';
import { LocationForm } from './components/location/LocationForm';
import { PersonForm } from './components/people/PersonForm';
import { NavigationOverlay } from './components/navigation/NavigationOverlay';
import { usePins } from './hooks/usePins';
import { usePeople } from './hooks/usePeople';
import { useDirections } from './hooks/useDirections';
import { useUserLocation } from './hooks/useUserLocation';
import type { Location, Person, OsrmStep } from './lib/api';

// ── Tour Guide Interface & Steps ───────────────────────────────────────────
interface TourStep {
  targetId: string;
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'add-pin-btn',
    title: 'Adding New Pins',
    description: 'Click this button to add a new location pin, or simply click anywhere on the map!',
    placement: 'bottom',
  },
  {
    targetId: 'global-search',
    title: 'Search Locations & People',
    description: 'Search for specific regions, cities, barangays, or team members instantly.',
    placement: 'bottom',
  },
  {
    targetId: 'filter-chips-container',
    title: 'Filter Locations',
    description: 'Filter visible pins on the map by their place type (LGUs, AFP Camps, BFP Stations, etc.).',
    placement: 'bottom',
  },
  {
    targetId: 'settings-btn',
    title: 'Settings & Customization',
    description: 'Change the map style (classic vs. warm), select dark mode, or clear saved pins here.',
    placement: 'bottom',
  },
  {
    targetId: 'info-btn',
    title: 'About Seety',
    description: 'Click here to read more about the app version, creators, and features.',
    placement: 'bottom',
  }
];

function TourOverlay({
  step, onNext, onPrev, onSkip, isLast, currentIndex, totalSteps
}: {
  step: TourStep;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isLast: boolean;
  currentIndex: number;
  totalSteps: number;
}) {
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const updatePosition = useCallback(() => {
    const el = document.getElementById(step.targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setCoords(null);
    }
  }, [step.targetId]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    const interval = setInterval(updatePosition, 100);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      clearInterval(interval);
    };
  }, [updatePosition]);

  if (!coords) return null;

  let tooltipStyle: React.CSSProperties = {};
  const spacing = 12;

  if (step.placement === 'bottom') {
    tooltipStyle = {
      position: 'absolute',
      top: coords.top + coords.height + spacing,
      left: Math.max(12, Math.min(window.innerWidth - 300, coords.left + coords.width / 2 - 140)),
      width: 280,
      zIndex: 2100,
    };
  }

  return (
    <>
      {/* Target spotlight overlay */}
      <div style={{
        position: 'fixed',
        top: coords.top - 4,
        left: coords.left - 4,
        width: coords.width + 8,
        height: coords.height + 8,
        borderRadius: 8,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
        zIndex: 2050,
        pointerEvents: 'none',
        border: '2px solid var(--color-primary-light)',
        transition: 'all 0.15s ease-out',
      }} />

      {/* Floating Tooltip Card */}
      <div
        className="card animate-fade-in"
        style={{
          ...tooltipStyle,
          backgroundColor: '#fff',
          padding: '1rem',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(78, 54, 41, 0.25)',
          border: '1.5px solid var(--color-primary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.625rem',
        }}
      >
        <div>
          <h4 style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-primary)', margin: 0 }}>
            {step.title}
          </h4>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text)', marginTop: '0.375rem', lineHeight: 1.4 }}>
            {step.description}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            {currentIndex + 1} of {totalSteps}
          </span>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {currentIndex > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={onPrev}>
                Back
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={onNext}>
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Invisible backdrop to prevent interaction during tour */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2040,
        background: 'transparent',
      }} onClick={onSkip} />
    </>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────
interface Toast { id: number; message: string; type: 'error' | 'success' | 'info'; }

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
      ))}
    </div>
  );
}

type ProximityKm = 1 | 3 | 5;

export default function App() {
  const { pins, loading: pinsLoading, error: pinsError, createPin, updatePin, deletePin } = usePins();
  const { people, loading: peopleLoading, fetchPeople, createPerson, updatePerson, deletePerson, clearPeople } = usePeople();
  const directions = useDirections();
  const userLoc = useUserLocation();

  const [selectedPin, setSelectedPin]       = useState<Location | null>(null);
  const [activeFilter, setActiveFilter]     = useState('ALL');
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [showAddForm, setShowAddForm]       = useState(false);
  const [addCoords, setAddCoords]           = useState<{ lat: number; lng: number } | null>(null);
  const [addName, setAddName]               = useState<string | undefined>(undefined);
  const [addAddress, setAddAddress]         = useState<string | undefined>(undefined);
  const [toasts, setToasts]                 = useState<Toast[]>([]);
  const [directionsFrom, setDirectionsFrom] = useState<{ lat: number; lng: number } | null>(null);
  const [proximityKm, setProximityKm]       = useState<ProximityKm | null>(1);

  // Global Settings States
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('seety_theme') as 'light' | 'dark') || 'light';
  });
  const [mapStyle, setMapStyle] = useState<'warm' | 'classic'>(() => {
    return (localStorage.getItem('seety_map_style') as 'warm' | 'classic') || 'classic';
  });
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>(() => {
    return (localStorage.getItem('seety_unit_system') as 'metric' | 'imperial') || 'metric';
  });
  const [savedPinIds, setSavedPinIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('seety_saved_pins');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Apply theme to document element
  useEffect(() => {
    localStorage.setItem('seety_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Sync settings with localStorage
  useEffect(() => {
    localStorage.setItem('seety_map_style', mapStyle);
  }, [mapStyle]);

  useEffect(() => {
    localStorage.setItem('seety_unit_system', unitSystem);
  }, [unitSystem]);

  useEffect(() => {
    localStorage.setItem('seety_saved_pins', JSON.stringify(savedPinIds));
  }, [savedPinIds]);

  const [rotationAngle, setRotationAngle] = useState(0);

  const getBearing = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    const brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
  }, []);

  useEffect(() => {
    if (directions.result && directionsFrom && selectedPin) {
      if (userLoc.location?.heading !== undefined && userLoc.location?.heading !== null) {
        setRotationAngle(userLoc.location.heading);
      } else {
        const bearing = getBearing(
          directionsFrom.lat,
          directionsFrom.lng,
          selectedPin.lat,
          selectedPin.lng
        );
        setRotationAngle(bearing);
      }
    } else {
      setRotationAngle(0);
    }
  }, [directions.result, directionsFrom, selectedPin, userLoc.location, getBearing]);

  const handleToggleSavePin = useCallback((id: number) => {
    setSavedPinIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const handleClearSavedPins = useCallback(() => {
    setSavedPinIds([]);
    addToast('Cleared all saved locations.', 'success');
  }, []);

  const [showOnboarding, setShowOnboarding] = useState(() => {
    const onboarded = localStorage.getItem('seety_onboarded');
    if (!onboarded) {
      sessionStorage.removeItem('seety_session_tour_completed');
    }
    return !onboarded;
  });
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [tourStepIndex, setTourStepIndex] = useState<number | null>(null);

  // Start session tour if onboarding is done but session tour is not
  useEffect(() => {
    if (localStorage.getItem('seety_onboarded') === 'true' && !sessionStorage.getItem('seety_session_tour_completed')) {
      const timer = setTimeout(() => {
        setTourStepIndex(0);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNextTourStep = useCallback(() => {
    if (tourStepIndex === null) return;
    if (tourStepIndex < TOUR_STEPS.length - 1) {
      setTourStepIndex(tourStepIndex + 1);
    } else {
      setTourStepIndex(null);
      sessionStorage.setItem('seety_session_tour_completed', 'true');
      addToast('Tour completed! Enjoy exploring Seety.', 'success');
    }
  }, [tourStepIndex]);

  const handlePrevTourStep = useCallback(() => {
    if (tourStepIndex === null) return;
    if (tourStepIndex > 0) {
      setTourStepIndex(tourStepIndex - 1);
    }
  }, [tourStepIndex]);

  const handleSkipTour = useCallback(() => {
    setTourStepIndex(null);
    sessionStorage.setItem('seety_session_tour_completed', 'true');
    addToast('Tour skipped.', 'info');
  }, []);

  const handleOnboardingLocation = useCallback(() => {
    if (!navigator.geolocation) {
      addToast('Geolocation not supported by your browser.', 'error');
      setOnboardingStep(4);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        userLoc.requestLocation();
        userLoc.startWatching();
        setTimeout(() => {
          const flyTo = (window as unknown as { _seetyFlyTo?: (lat: number, lng: number) => void })._seetyFlyTo;
          flyTo?.(loc.lat, loc.lng);
        }, 300);
        addToast('Found your location!', 'success');
        setOnboardingStep(4);
      },
      () => {
        addToast('Location access denied.', 'error');
        setOnboardingStep(4);
      },
      { enableHighAccuracy: true }
    );
  }, [userLoc]);

  const shouldFlyRef = useRef(false);

  // Auto-zoom/center to user location once when explicitly requested
  useEffect(() => {
    if (userLoc.location && shouldFlyRef.current) {
      const flyTo = (window as unknown as { _seetyFlyTo?: (lat: number, lng: number) => void })._seetyFlyTo;
      flyTo?.(userLoc.location.lat, userLoc.location.lng);
      shouldFlyRef.current = false;
    }
  }, [userLoc.location]);

  // Derived navigation steps
  const navSteps: OsrmStep[] = directions.result?.legs.flatMap(l => l.steps) ?? [];

  function addToast(message: string, type: Toast['type'] = 'info') {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }

  // Load people when a pin is selected
  useEffect(() => {
    if (selectedPin) fetchPeople(selectedPin.id);
    else clearPeople();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPin?.id]);

  const handleSelectPin = useCallback((pin: Location) => {
    setSelectedPin(pin);
    setShowAddForm(false);
    setPeopleModal(null);
    setDeletePersonTarget(null);
    directions.clearDirections();
    setDirectionsFrom(null);
  }, [directions]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setAddCoords({ lat, lng });
    setAddName(undefined);
    setAddAddress(undefined);
    setShowAddForm(true);
    setSelectedPin(null);
  }, []);

  const handleAddPinAtCoords = useCallback((lat: number, lng: number, name?: string, address?: string) => {
    setAddCoords({ lat, lng });
    setAddName(name);
    setAddAddress(address);
    setShowAddForm(true);
    setSelectedPin(null);
  }, []);

  const handleAddPin = useCallback(async (data: Omit<Location, 'id' | 'created_at' | 'updated_at'>) => {
    const pin = await createPin(data);
    setShowAddForm(false);
    setAddCoords(null);
    setSelectedPin(pin);
    addToast(`"${pin.name}" added.`, 'success');
  }, [createPin]);

  const handleUpdatePin = useCallback(async (id: number, data: Partial<Omit<Location, 'id' | 'created_at' | 'updated_at'>>) => {
    const pin = await updatePin(id, data);
    setSelectedPin(pin);
    addToast('Location updated.', 'success');
  }, [updatePin]);

  const handleDeletePin = useCallback(async (id: number) => {
    await deletePin(id);
    setSelectedPin(null);
    directions.clearDirections();
    setDirectionsFrom(null);
    addToast('Location deleted.', 'success');
  }, [deletePin, directions]);

  const handleGetDirections = useCallback(async () => {
    if (!selectedPin) return;

    const doRoute = async (from: { lat: number; lng: number; label: string }) => {
      setDirectionsFrom(from);
      try {
        await directions.fetchDirections(from, {
          lat: selectedPin.lat, lng: selectedPin.lng, label: selectedPin.name,
        });
        const flyTo = (window as unknown as { _seetyFlyTo?: (lat: number, lng: number) => void })._seetyFlyTo;
        flyTo?.(from.lat, from.lng);
      } catch {
        addToast('Could not load directions. Please try again.', 'error');
      }
    };

    // Use already-known location if available, otherwise request it
    if (userLoc.location) {
      await doRoute({ ...userLoc.location, label: 'Your Location' });
    } else if (!navigator.geolocation) {
      addToast('Geolocation not supported by your browser.', 'error');
    } else {
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const from = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Your Location' };
          userLoc.requestLocation(); // also update the dot
          await doRoute(from);
        },
        () => addToast('Location access denied.', 'error'),
        { enableHighAccuracy: true }
      );
    }
  }, [selectedPin, directions, userLoc]);

  const handleRequestLocation = useCallback(() => {
    shouldFlyRef.current = true;
    userLoc.requestLocation();
    userLoc.startWatching();
    if (userLoc.location) {
      const flyTo = (window as unknown as { _seetyFlyTo?: (lat: number, lng: number) => void })._seetyFlyTo;
      flyTo?.(userLoc.location.lat, userLoc.location.lng);
      shouldFlyRef.current = false;
    }
  }, [userLoc]);

  const [peopleModal, setPeopleModal] = useState<{ type: 'add' | 'edit'; person?: Person } | null>(null);
  const [deletePersonTarget, setDeletePersonTarget] = useState<Person | null>(null);

  const handleAddPersonSubmit = async (data: Omit<Person, 'id' | 'location_id' | 'created_at' | 'updated_at'>) => {
    if (!selectedPin) return;
    await createPerson(selectedPin.id, data);
    setPeopleModal(null);
    addToast('Person added.', 'success');
  };

  const handleUpdatePersonSubmit = async (data: Omit<Person, 'id' | 'location_id' | 'created_at' | 'updated_at'>) => {
    if (!selectedPin || !peopleModal?.person) return;
    await updatePerson(selectedPin.id, peopleModal.person.id, data);
    setPeopleModal(null);
    addToast('Person updated.', 'success');
  };

  const handleDeletePersonConfirm = async () => {
    if (!selectedPin || !deletePersonTarget) return;
    await deletePerson(selectedPin.id, deletePersonTarget.id);
    setDeletePersonTarget(null);
    addToast('Person removed.', 'success');
  };

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#e8e4df' }}>

      {/* ── Mobile topbar ── */}
      <div id="mobile-topbar" style={{
        display: 'none', alignItems: 'center', gap: '0.75rem',
        padding: '0.75rem 1rem', background: '#fff',
        borderBottom: '1px solid var(--color-border)', zIndex: 300,
      }}>
        <button className="btn btn-ghost btn-icon" id="open-sidebar-btn" onClick={() => setSidebarOpen(true)}>
          <Menu size={20} />
        </button>
        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary)' }}>Seety</span>
      </div>

      {/* ── Main: map fills everything, panels float on top ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Map — fills the entire container */}
        <div style={{
          position: 'absolute',
          inset: 0,
          transform: `rotate(${-rotationAngle}deg)`,
          transformOrigin: 'center',
          transition: 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
        }}>
          <MapView
            pins={pins}
            selectedPin={selectedPin}
            onSelectPin={handleSelectPin}
            onMapClick={handleMapClick}
            directions={directions.result}
            directionsFrom={directionsFrom}
            activeFilter={activeFilter}
            userLocation={userLoc.location}
            proximityKm={proximityKm}
            mapStyle={mapStyle}
          />
        </div>

        {/* Floating Logo Badge (sm +) */}
        <div className="floating-logo-badge">
          <img
            src="/seety_logo.png"
            alt="Seety Logo"
            style={{ width: 36, height: 36, borderRadius: '10px', objectFit: 'cover' }}
          />
          <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-text)', fontFamily: 'system-ui, sans-serif' }}>
            Seety
          </span>
        </div>

        {/* ── Floating Sidebar ── */}
        <>
          {/* Mobile backdrop */}
          {sidebarOpen && (
            <div
              className="animate-fade-in"
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 399 }}
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <div
            id="floating-sidebar"
            style={{
              position: 'absolute',
              top: 12, left: 12, bottom: 12,
              width: 420,
              maxWidth: 'calc(100vw - 24px)',
              zIndex: 400,
              borderRadius: 18,
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Sidebar
              pins={pins}
              selectedPin={selectedPin}
              onSelectPin={handleSelectPin}
              onAddPin={() => { 
                setShowAddForm(true); 
                setAddCoords(null); 
                setAddName(undefined);
                setAddAddress(undefined);
                setSelectedPin(null); 
              }}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              loading={pinsLoading}
              error={pinsError}
              hasUserLocation={!!userLoc.location}
              locationLoading={userLoc.loading}
              proximityKm={proximityKm}
              onRequestLocation={handleRequestLocation}
              onProximityChange={km => setProximityKm(km)}
              userLocation={userLoc.location}
              // Detail views
              onClosePinDetails={() => { setSelectedPin(null); directions.clearDirections(); setDirectionsFrom(null); }}
              onUpdatePin={handleUpdatePin}
              onDeletePin={handleDeletePin}
              onGetDirections={handleGetDirections}
              directionsState={{
                result: directions.result,
                fromLabel: directions.fromLabel,
                toLabel: directions.toLabel,
                loading: directions.loading,
                error: directions.error,
              }}
              onClearDirections={() => { directions.clearDirections(); setDirectionsFrom(null); }}
              people={people}
              peopleLoading={peopleLoading}
              onTriggerAddPerson={() => setPeopleModal({ type: 'add' })}
              onTriggerEditPerson={(person) => setPeopleModal({ type: 'edit', person })}
              onTriggerDeletePerson={(person) => setDeletePersonTarget(person)}
              // Settings
              theme={theme}
              setTheme={setTheme}
              mapStyle={mapStyle}
              setMapStyle={setMapStyle}
              unitSystem={unitSystem}
              setUnitSystem={setUnitSystem}
              savedPinIds={savedPinIds}
              onToggleSavePin={handleToggleSavePin}
              onClearSavedPins={handleClearSavedPins}
              onAddPinAtCoords={handleAddPinAtCoords}
            />
          </div>
        </>

        {/* ── Add Pin modal ── */}
        {showAddForm && (
          <div className="modal-overlay" style={{ zIndex: 600 }}
            onClick={e => { if (e.target === e.currentTarget) setShowAddForm(false); }}>
            <div className="modal-box">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h2 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-primary)' }}>
                  {addCoords ? 'Add Pin at Location' : 'Add New Pin'}
                </h2>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowAddForm(false)}>
                  <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>×</span>
                </button>
              </div>
              {addCoords && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                  📍 {addCoords.lat.toFixed(5)}, {addCoords.lng.toFixed(5)}
                </p>
              )}
              <LocationForm
                initialLat={addCoords?.lat}
                initialLng={addCoords?.lng}
                initialName={addName}
                initialAddress={addAddress}
                onSubmit={handleAddPin}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          </div>
        )}

        {/* ── Add / Edit Person Modal ── */}
        {peopleModal && (
          <div className="modal-overlay" style={{ zIndex: 600 }}
            onClick={e => { if (e.target === e.currentTarget) setPeopleModal(null); }}>
            <div className="modal-box">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h2 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-primary)' }}>
                  {peopleModal.type === 'add' ? 'Add Person' : 'Edit Person'}
                </h2>
                <button className="btn btn-ghost btn-icon" onClick={() => setPeopleModal(null)}>
                  <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>×</span>
                </button>
              </div>
              <PersonForm
                editData={peopleModal.type === 'edit' ? peopleModal.person : undefined}
                onSubmit={peopleModal.type === 'add' ? handleAddPersonSubmit : handleUpdatePersonSubmit}
                onCancel={() => setPeopleModal(null)}
              />
            </div>
          </div>
        )}

        {/* ── Delete Person Confirmation Modal ── */}
        {deletePersonTarget && (
          <div className="modal-overlay" style={{ zIndex: 600 }}
            onClick={e => { if (e.target === e.currentTarget) setDeletePersonTarget(null); }}>
            <div className="modal-box" style={{ maxWidth: '400px' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-danger)', marginBottom: '0.75rem' }}>
                Remove Person
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Are you sure you want to remove <strong>{deletePersonTarget.first_name} {deletePersonTarget.last_name}</strong> from this location? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button className="btn btn-ghost" onClick={() => setDeletePersonTarget(null)}>
                  Cancel
                </button>
                <button className="btn btn-primary" style={{ backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={handleDeletePersonConfirm}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Navigation overlay (Waze-style) ── */}
        {directions.result && navSteps.length > 0 && (
          <NavigationOverlay
            steps={navSteps}
            totalDistanceM={directions.result.distance_m}
            totalDurationS={directions.result.duration_s}
            destinationName={selectedPin?.name ?? directions.toLabel}
            userLocation={userLoc.location}
            onClose={() => { directions.clearDirections(); setDirectionsFrom(null); }}
          />
        )}
      </div>

      {/* ── Onboarding / Welcome & Guide Modal ── */}
      {showOnboarding && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-box" style={{ maxWidth: '500px', padding: '2rem', textAlign: 'center' }}>
            {onboardingStep === 1 && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 20,
                  background: 'var(--color-primary-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-primary)', marginBottom: '0.5rem'
                }}>
                  <Sparkles size={32} />
                </div>
                <h2 style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--color-primary)', margin: 0 }}>
                  Welcome to Seety
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 500, margin: 0 }}>
                  CALABARZON Interactive Map & Yield Explorer
                </p>
                <p style={{ fontSize: '0.9375rem', color: 'var(--color-text)', lineHeight: 1.6, margin: '0.5rem 0 1rem' }}>
                  An interactive platform built for tracking municipal locations, emergency centers, universities, and military camps across Cavite, Laguna, Batangas, Rizal, and Quezon.
                </p>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
                  onClick={() => setOnboardingStep(2)}
                >
                  Get Started
                </button>
              </div>
            )}

            {onboardingStep === 2 && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <h3 style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--color-primary)', margin: 0 }}>
                  Quick Start Guide
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', textAlign: 'left', margin: '1rem 0' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', background: 'var(--color-primary-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0, marginTop: 2
                    }}>1</div>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text)', margin: 0 }}>Add Pins / Locations</h4>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>Click anywhere on the map or click <strong>+ Add Pin</strong> in the sidebar to drop a marker with place details.</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', background: 'var(--color-primary-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0, marginTop: 2
                    }}>2</div>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text)', margin: 0 }}>Explore & Zoom</h4>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>Hover over pins to preview titles. Zoom out to view marker clusters, and zoom in to separate clustered pins.</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', background: 'var(--color-primary-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0, marginTop: 2
                    }}>3</div>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text)', margin: 0 }}>View Details & Contacts</h4>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>Click any pin to view details, request driving directions, and manage associated team contacts.</p>
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
                  onClick={() => setOnboardingStep(3)}
                >
                  Next: Enable Location
                </button>
              </div>
            )}

            {onboardingStep === 3 && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 20,
                  background: 'var(--color-primary-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-primary)', marginBottom: '0.5rem'
                }}>
                  <MapPin size={32} />
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--color-primary)', margin: 0 }}>
                  Enable Geolocation
                </h3>
                <p style={{ fontSize: '0.9375rem', color: 'var(--color-text)', lineHeight: 1.6, margin: '0.5rem 0 1rem' }}>
                  To calculate distances, display directions on the map, and focus zoom around your area, Seety needs to access your device's location.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
                    onClick={() => {
                      handleOnboardingLocation();
                      localStorage.setItem('seety_onboarded', 'true');
                      setShowOnboarding(false);
                      if (!sessionStorage.getItem('seety_session_tour_completed')) {
                        setTimeout(() => setTourStepIndex(0), 1000);
                      }
                    }}
                  >
                    Share My Location
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
                    onClick={() => {
                      localStorage.setItem('seety_onboarded', 'true');
                      setShowOnboarding(false);
                      addToast('Using default CALABARZON center.', 'info');
                      if (!sessionStorage.getItem('seety_session_tour_completed')) {
                        setTimeout(() => setTourStepIndex(0), 1000);
                      }
                    }}
                  >
                    Skip for Now
                  </button>
                </div>
              </div>
            )}

            {/* Indicator Dots */}
            <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              {[1, 2, 3].map(step => (
                <div
                  key={step}
                  style={{
                    width: step === onboardingStep ? 16 : 8,
                    height: 8,
                    borderRadius: 4,
                    background: step === onboardingStep ? 'var(--color-primary)' : 'var(--color-border)',
                    transition: 'all 0.25s ease'
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Interactive Tour Overlay ── */}
      {tourStepIndex !== null && (
        <TourOverlay
          step={TOUR_STEPS[tourStepIndex]}
          currentIndex={tourStepIndex}
          totalSteps={TOUR_STEPS.length}
          isLast={tourStepIndex === TOUR_STEPS.length - 1}
          onNext={handleNextTourStep}
          onPrev={handlePrevTourStep}
          onSkip={handleSkipTour}
        />
      )}

      <ToastContainer toasts={toasts} />

      <style>{`
        @media (max-width: 1280px) {
          #floating-sidebar { width: 380px; }
        }
      `}</style>
    </div>
  );
}

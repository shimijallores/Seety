import { useEffect, useState } from 'react';
import {
  X, Pencil, Trash2, Navigation, MapPin, Copy
} from 'lucide-react';
import type { Location } from '../../lib/api';
import type { DirectionsState } from '../../hooks/useDirections';
import { getPlaceMeta } from '../../lib/placeTypes';
import { LocationForm } from './LocationForm';
import { DirectionsPanel } from './DirectionsPanel';
import { PeopleTable } from '../people/PeopleTable';
import type { Person } from '../../lib/api';

interface LocationPanelProps {
  location: Location;
  onClose: () => void;
  onUpdate: (id: number, data: Partial<Omit<Location, 'id' | 'created_at' | 'updated_at'>>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onGetDirections: () => void;
  directionsState: DirectionsState;
  onClearDirections: () => void;
  // People
  people: Person[];
  peopleLoading: boolean;
  onTriggerAddPerson: () => void;
  onTriggerEditPerson: (person: Person) => void;
  onTriggerDeletePerson: (person: Person) => void;
}

export function LocationPanel({
  location, onClose, onUpdate, onDelete,
  onGetDirections, directionsState, onClearDirections,
  people, peopleLoading, onTriggerAddPerson, onTriggerEditPerson, onTriggerDeletePerson,
}: LocationPanelProps) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset edit mode when location changes
  useEffect(() => { setEditing(false); setConfirmDelete(false); }, [location.id]);

  const meta = getPlaceMeta(location.place_type);
  const Icon = meta.icon;

  function copyCoords() {
    navigator.clipboard.writeText(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleDelete() {
    setDeleting(true);
    try { await onDelete(location.id); }
    finally { setDeleting(false); }
  }

  return (
    <aside
      id="location-panel"
      className="panel animate-slide-in-right"
      style={{ width: 'var(--panel-w)', flexShrink: 0, position: 'relative' }}
    >
      {/* ── Close button ── */}
      <button
        id="close-location-panel"
        className="btn btn-ghost btn-icon"
        style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10 }}
        onClick={onClose}
      >
        <X size={18} />
      </button>

      {editing ? (
        /* ── Edit mode ── */
        <div style={{ padding: '1.25rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--color-primary)', marginBottom: '1rem' }}>
            Edit Location
          </h2>
          <LocationForm
            editData={location}
            onSubmit={async data => {
              await onUpdate(location.id, data);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          {/* ── Header ── */}
          <div style={{
            padding: '1.25rem 3.5rem 1.25rem 1.25rem',
            borderBottom: '1px solid var(--color-border)',
            background: 'linear-gradient(160deg, var(--color-primary-muted) 0%, #fff 100%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.625rem' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'var(--color-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={22} color="#fff" strokeWidth={1.8} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-primary)', lineHeight: 1.2, wordBreak: 'break-word' }}>
                  {location.name}
                </h2>
                <span className="badge badge-primary" style={{ marginTop: '0.3rem', display: 'inline-flex' }}>
                  <Icon size={11} strokeWidth={2.5} />
                  {meta.label}
                </span>
              </div>
            </div>

            {location.description && (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', lineHeight: 1.55, marginBottom: '0.5rem' }}>
                {location.description}
              </p>
            )}

            {location.address && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.375rem', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                <MapPin size={13} style={{ marginTop: 2, flexShrink: 0 }} />
                {location.address}
              </div>
            )}

            {/* Coordinates */}
            <button
              onClick={copyCoords}
              style={{
                marginTop: '0.5rem',
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-muted)', fontSize: '0.75rem',
                padding: '0.25rem 0',
              }}
              title="Copy coordinates"
            >
              <Copy size={12} />
              {copied ? 'Copied!' : `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}
            </button>
          </div>

          {/* ── Action buttons ── */}
          <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '0.5rem' }}>
            <button
              id="get-directions-btn"
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={onGetDirections}
            >
              <Navigation size={15} strokeWidth={2.5} />
              Get Directions
            </button>
            <button
              id="edit-location-btn"
              className="btn btn-outline"
              onClick={() => setEditing(true)}
            >
              <Pencil size={14} />
              Edit
            </button>
            {confirmDelete ? (
              <>
                <button
                  id="confirm-delete-location-btn"
                  className="btn btn-danger"
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  {deleting ? '…' : 'Delete'}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                id="delete-location-btn"
                className="btn btn-ghost"
                style={{ color: 'var(--color-danger)' }}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {/* ── Directions panel ── */}
          <DirectionsPanel
            state={directionsState}
            destinationName={location.name}
            onClear={onClearDirections}
          />

          {/* ── People section ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
            <div className="sep" style={{ marginBottom: '1rem' }} />
            <PeopleTable
              people={people}
              locationId={location.id}
              loading={peopleLoading}
              onAddClick={onTriggerAddPerson}
              onEditClick={onTriggerEditPerson}
              onDeleteClick={onTriggerDeletePerson}
            />
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 767px) {
          #location-panel {
            position: fixed !important;
            bottom: 0; left: 0; right: 0;
            width: 100% !important;
            height: 70dvh;
            border-radius: 1.25rem 1.25rem 0 0;
            border-top: 1px solid var(--color-border);
            box-shadow: 0 -4px 24px rgba(0,0,0,0.12);
            animation: slide-in-up 0.3s cubic-bezier(0.4,0,0.2,1) !important;
            z-index: 500;
          }
        }
      `}</style>
    </aside>
  );
}

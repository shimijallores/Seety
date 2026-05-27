import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, ArrowLeft, X, MapPin, Users } from 'lucide-react';
import type { Location, Person } from '../../lib/api';
import { pinsApi, peopleApi } from '../../lib/api';
import { LocationForm } from './LocationForm';
import { PersonForm } from '../people/PersonForm';
import { PLACE_TYPES, PLACE_TYPE_MAP, getPlaceLabel } from '../../lib/placeTypes';

type ViewState =
  | { type: 'list' }
  | { type: 'locationDetail'; locationId: number }
  | { type: 'addLocation' }
  | { type: 'editLocation'; location: Location }
  | { type: 'addPerson'; locationId: number }
  | { type: 'editPerson'; locationId: number; person: Person }
  | { type: 'deleteLocation'; location: Location }
  | { type: 'deletePerson'; locationId: number; person: Person };

interface LocationsModalProps {
  onClose: () => void;
  addToast: (message: string, type: 'error' | 'success' | 'info') => void;
  pins: Location[];
  createPin: (data: Omit<Location, 'id' | 'created_at' | 'updated_at'>) => Promise<Location>;
  updatePin: (id: number, data: Partial<Omit<Location, 'id' | 'created_at' | 'updated_at'>>) => Promise<Location>;
  deletePin: (id: number) => Promise<void>;
}

export function LocationsModal({ onClose, addToast, pins, createPin, updatePin, deletePin }: LocationsModalProps) {
  const [view, setView] = useState<ViewState>({ type: 'list' });
  const viewRef = useRef(view);
  viewRef.current = view;

  const [locSearch, setLocSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [people, setPeople] = useState<Person[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [personSearch, setPersonSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const formKeyRef = useRef(0);

  useEffect(() => {
    if (view.type === 'locationDetail') {
      setPeopleLoading(true);
      peopleApi.getAll(view.locationId)
        .then(setPeople)
        .finally(() => setPeopleLoading(false));
      setPersonSearch('');
    }
  }, [view]);

  const filteredLocations = useMemo(() => {
    let result = pins;
    if (typeFilter !== 'ALL') {
      result = result.filter(l => l.place_type === typeFilter);
    }
    if (locSearch.trim()) {
      const q = locSearch.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(q) ||
        (l.address ?? '').toLowerCase().includes(q) ||
        (l.description ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [pins, typeFilter, locSearch]);

  const filteredPeople = useMemo(() => {
    if (!personSearch.trim()) return people;
    const q = personSearch.toLowerCase();
    return people.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.role ?? '').toLowerCase().includes(q) ||
      (p.contact ?? '').toLowerCase().includes(q)
    );
  }, [people, personSearch]);

  const selectedLoc = useMemo(() => {
    if (view.type === 'locationDetail') {
      return pins.find(l => l.id === view.locationId) ?? null;
    }
    return null;
  }, [pins, view]);

  const navigate = useCallback((newView: ViewState) => {
    setView(newView);
  }, []);

  async function handleAddLocation(data: Omit<Location, 'id' | 'created_at' | 'updated_at'>) {
    setSaving(true);
    try {
      await createPin(data);
      navigate({ type: 'list' });
      addToast('Location added.', 'success');
    } finally { setSaving(false); }
  }

  async function handleEditLocation(id: number, data: Partial<Omit<Location, 'id' | 'created_at' | 'updated_at'>>) {
    setSaving(true);
    try {
      await updatePin(id, data);
      navigate({ type: 'list' });
      addToast('Location updated.', 'success');
    } finally { setSaving(false); }
  }

  async function handleDeleteLocation() {
    if (view.type !== 'deleteLocation') return;
    setSaving(true);
    try {
      await deletePin(view.location.id);
      navigate({ type: 'list' });
      addToast('Location deleted.', 'success');
    } finally { setSaving(false); }
  }

  async function handleAddPerson(data: Omit<Person, 'id' | 'location_id' | 'created_at' | 'updated_at'>) {
    if (view.type !== 'addPerson') return;
    setSaving(true);
    try {
      const person = await peopleApi.create(view.locationId, data);
      setPeople(prev => [...prev, person]);
      navigate({ type: 'locationDetail', locationId: view.locationId });
      addToast('Person added.', 'success');
    } finally { setSaving(false); }
  }

  async function handleEditPerson(data: Omit<Person, 'id' | 'location_id' | 'created_at' | 'updated_at'>) {
    if (view.type !== 'editPerson') return;
    setSaving(true);
    try {
      const person = await peopleApi.update(view.locationId, view.person.id, data);
      setPeople(prev => prev.map(p => (p.id === person.id ? person : p)));
      navigate({ type: 'locationDetail', locationId: view.locationId });
      addToast('Person updated.', 'success');
    } finally { setSaving(false); }
  }

  async function handleDeletePerson() {
    if (view.type !== 'deletePerson') return;
    setSaving(true);
    try {
      await peopleApi.delete(view.locationId, view.person.id);
      setPeople(prev => prev.filter(p => p.id !== view.person.id));
      navigate({ type: 'locationDetail', locationId: view.locationId });
      addToast('Person removed.', 'success');
    } finally { setSaving(false); }
  }

  const locationTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of pins) {
      counts[l.place_type] = (counts[l.place_type] || 0) + 1;
    }
    return counts;
  }, [pins]);

  const locViewKey = `list-${typeFilter}-${locSearch}`;
  const detailViewKey = `detail-${view.type === 'locationDetail' ? view.locationId : ''}`;

  function renderLocationsList() {
    return (
      <div key={locViewKey} className="animate-fade-in">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} color="var(--color-text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                className="input"
                style={{ paddingLeft: '2rem', fontSize: '0.8125rem' }}
                placeholder="Search locations…"
                value={locSearch}
                onChange={e => setLocSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate({ type: 'addLocation' })}>
              <Plus size={14} /> Add
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            <button
              className={`chip ${typeFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setTypeFilter('ALL')}
            >
              All ({pins.length})
            </button>
            {PLACE_TYPES.map(t => (
              <button
                key={t}
                className={`chip ${typeFilter === t ? 'active' : ''}`}
                onClick={() => setTypeFilter(t)}
                style={{ display: (locationTypeCounts[t] ?? 0) > 0 || typeFilter === t ? undefined : 'none' }}
              >
                {PLACE_TYPE_MAP[t].label} ({locationTypeCounts[t] ?? 0})
              </button>
            ))}
          </div>
        </div>

        {filteredLocations.length === 0 ? (
          <div className="empty-state animate-fade-in" style={{ padding: '2rem 0' }}>
            <MapPin size={36} />
            <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>No locations found</p>
            <p style={{ fontSize: '0.8125rem' }}>{locSearch ? 'Try a different search.' : 'Click + Add to create one.'}</p>
          </div>
        ) : (
          <div className="animate-fade-in" style={{ overflowX: 'auto', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Name</th>
                  <th style={{ width: '20%' }}>Type</th>
                  <th style={{ width: '25%' }}>Address</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.map((loc, i) => (
                  <tr
                    key={loc.id}
                    className="fade-stagger"
                    style={{ cursor: 'pointer', animationDelay: `${i * 30}ms` }}
                    onClick={() => navigate({ type: 'locationDetail', locationId: loc.id })}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: 'var(--color-primary-muted)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, color: 'var(--color-primary)',
                        }}>
                          {React.createElement(PLACE_TYPE_MAP[loc.place_type]?.icon ?? MapPin, { size: 14 })}
                        </div>
                        <span style={{ fontWeight: 500 }}>{loc.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>
                        {getPlaceLabel(loc.place_type)}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                      {loc.address ?? '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Edit"
                          onClick={() => navigate({ type: 'editLocation', location: loc })}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Delete"
                          onClick={() => navigate({ type: 'deleteLocation', location: loc })}
                          style={{ color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderPeopleList() {
    if (!selectedLoc) {
      return <div className="empty-state animate-fade-in"><p>Location not found.</p></div>;
    }
    return (
      <div key={detailViewKey} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate({ type: 'list' })} title="Back">
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--color-primary-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-primary)',
              }}>
                {React.createElement(PLACE_TYPE_MAP[selectedLoc.place_type]?.icon ?? MapPin, { size: 16 })}
              </div>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-text)', margin: 0 }}>
                  {selectedLoc.name}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {getPlaceLabel(selectedLoc.place_type)}
                  {selectedLoc.address ? ` — ${selectedLoc.address}` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} color="var(--color-text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                className="input"
                style={{ paddingLeft: '2rem', fontSize: '0.8125rem' }}
                placeholder="Search people at this location…"
                value={personSearch}
                onChange={e => setPersonSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate({ type: 'addPerson', locationId: selectedLoc.id })}>
              <Plus size={14} /> Add
            </button>
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
            {people.length > 0
              ? `Showing ${filteredPeople.length} of ${people.length} people`
              : 'No people at this location'}
          </p>

          {peopleLoading ? (
            <p className="animate-fade-in" style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', padding: '1rem 0' }}>Loading…</p>
          ) : filteredPeople.length === 0 ? (
            <div className="empty-state animate-fade-in" style={{ padding: '1.5rem 0' }}>
              <Users size={32} />
              <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                {people.length === 0 ? 'No people added yet' : `No results for "${personSearch}"`}
              </p>
              {people.length === 0 && (
                <p style={{ fontSize: '0.8125rem' }}>Click + Add to get started.</p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredPeople.map((person, i) => (
                <div
                  key={person.id}
                  className="card-hover fade-stagger"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.625rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--color-border)',
                    transition: 'background 0.12s',
                    animationDelay: `${i * 30}ms`,
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'var(--color-primary-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)',
                    flexShrink: 0,
                  }}>
                    {person.first_name[0]}{person.last_name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--color-text)' }}>
                      {person.first_name} {person.last_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {person.role ? <span>{person.role}</span> : null}
                      {person.role && person.contact ? <span> · </span> : null}
                      {person.contact ? <span>{person.contact}</span> : null}
                      {!person.role && !person.contact ? <span style={{ fontStyle: 'italic' }}>No details</span> : null}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      title="Edit"
                      onClick={() => navigate({ type: 'editPerson', locationId: selectedLoc.id, person })}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      title="Delete"
                      onClick={() => navigate({ type: 'deletePerson', locationId: selectedLoc.id, person })}
                      style={{ color: 'var(--color-danger)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderForm() {
    const key = `form-${++formKeyRef.current}`;
    switch (view.type) {
      case 'addLocation':
        return (
          <div key={key} className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-primary)' }}>Add Location</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => navigate({ type: 'list' })}><X size={18} /></button>
            </div>
            <LocationForm
              onSubmit={handleAddLocation}
              onCancel={() => navigate({ type: 'list' })}
            />
          </div>
        );
      case 'editLocation':
        return (
          <div key={key} className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-primary)' }}>Edit Location</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => navigate({ type: 'list' })}><X size={18} /></button>
            </div>
            <LocationForm
              editData={view.location}
              onSubmit={(data) => handleEditLocation(view.location.id, data)}
              onCancel={() => navigate({ type: 'list' })}
            />
          </div>
        );
      case 'addPerson':
        return (
          <div key={key} className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-primary)' }}>Add Person</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => navigate({ type: 'locationDetail', locationId: view.locationId })}><X size={18} /></button>
            </div>
            <PersonForm
              onSubmit={handleAddPerson}
              onCancel={() => navigate({ type: 'locationDetail', locationId: view.locationId })}
            />
          </div>
        );
      case 'editPerson':
        return (
          <div key={key} className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-primary)' }}>Edit Person</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => navigate({ type: 'locationDetail', locationId: view.locationId })}><X size={18} /></button>
            </div>
            <PersonForm
              editData={view.person}
              onSubmit={handleEditPerson}
              onCancel={() => navigate({ type: 'locationDetail', locationId: view.locationId })}
            />
          </div>
        );
      default:
        return null;
    }
  }

  function renderDeleteConfirm() {
    if (view.type === 'deleteLocation') {
      return (
        <div key={`del-loc-${view.location.id}`} className="animate-fade-in" style={{ maxWidth: '440px', margin: '0 auto', width: '100%' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-danger)', marginBottom: '0.75rem' }}>
            Delete Location
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Are you sure you want to delete <strong>{view.location.name}</strong>? This will also remove all people associated with this location. This action cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-ghost" onClick={() => navigate({ type: 'list' })} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" style={{ backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={handleDeleteLocation} disabled={saving}>
              {saving ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      );
    }
    if (view.type === 'deletePerson') {
      return (
        <div key={`del-person-${view.person.id}`} className="animate-fade-in" style={{ maxWidth: '440px', margin: '0 auto', width: '100%' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-danger)', marginBottom: '0.75rem' }}>
            Remove Person
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Are you sure you want to remove <strong>{view.person.first_name} {view.person.last_name}</strong> from this location? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-ghost" onClick={() => navigate({ type: 'locationDetail', locationId: view.locationId })} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" style={{ backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={handleDeletePerson} disabled={saving}>
              {saving ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  const isFormView = ['addLocation', 'editLocation', 'addPerson', 'editPerson'].includes(view.type);
  const isDeleteView = ['deleteLocation', 'deletePerson'].includes(view.type);

  return (
    <div className="modal-overlay" style={{ zIndex: 600 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box animate-fade-in" style={{ width: 'min(780px, calc(100vw - 2rem))', maxHeight: 'calc(100dvh - 2rem)', display: 'flex', flexDirection: 'column' }}>
        {!isFormView && !isDeleteView && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-primary)' }}>
              {view.type === 'list' ? 'All Locations' : 'Location Details'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {pins.length} location{pins.length !== 1 ? 's' : ''}
              </span>
              <button className="btn btn-ghost btn-icon" onClick={onClose}>
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {isFormView && renderForm()}
        {isDeleteView && renderDeleteConfirm()}
        {view.type === 'list' && renderLocationsList()}
        {view.type === 'locationDetail' && renderPeopleList()}
      </div>
    </div>
  );
}

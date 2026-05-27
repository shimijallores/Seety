import { useState, useEffect } from 'react';
import type { Location } from '../../lib/api';
import { PLACE_TYPES, PLACE_TYPE_MAP, NAME_SUGGESTIONS } from '../../lib/placeTypes';

interface LocationFormProps {
  initialLat?: number;
  initialLng?: number;
  initialName?: string;
  initialAddress?: string;
  editData?: Location;
  onSubmit: (data: Omit<Location, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
}

export function LocationForm({ initialLat, initialLng, initialName, initialAddress, editData, onSubmit, onCancel }: LocationFormProps) {
  const [name, setName] = useState(editData?.name ?? initialName ?? '');
  const [placeType, setPlaceType] = useState(editData?.place_type ?? '');
  const [description, setDescription] = useState(editData?.description ?? '');
  const [address, setAddress] = useState(editData?.address ?? initialAddress ?? '');
  const [lat, setLat] = useState(String(editData?.lat ?? initialLat ?? ''));
  const [lng, setLng] = useState(String(editData?.lng ?? initialLng ?? ''));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!editData) {
      if (initialLat != null) setLat(String(initialLat.toFixed(6)));
      if (initialLng != null) setLng(String(initialLng.toFixed(6)));
      if (initialName != null) setName(initialName);
      if (initialAddress != null) setAddress(initialAddress);
    }
  }, [initialLat, initialLng, initialName, initialAddress, editData]);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Place name is required.';
    if (!placeType) e.placeType = 'Place type is required.';
    if (!lat || isNaN(Number(lat))) e.lat = 'Valid latitude is required.';
    if (!lng || isNaN(Number(lng))) e.lng = 'Valid longitude is required.';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        place_type: placeType as Location['place_type'],
        description: description.trim() || null,
        lat: Number(lat),
        lng: Number(lng),
        address: address.trim() || null,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid" style={{ gap: '1rem' }}>
      {/* Name */}
      <div className="form-group">
        <label className="form-label" htmlFor="lf-name">Place Name *</label>
        <input
          id="lf-name"
          className={`input ${errors.name ? 'error' : ''}`}
          list="place-suggestions"
          placeholder="e.g. LGU — Antipolo City Hall"
          value={name}
          onChange={e => setName(e.target.value)}
          autoComplete="off"
        />
        <datalist id="place-suggestions">
          {NAME_SUGGESTIONS.map(s => <option key={s} value={s} />)}
        </datalist>
        {errors.name && <span className="form-error">{errors.name}</span>}
      </div>

      {/* Place type */}
      <div className="form-group">
        <label className="form-label" htmlFor="lf-type">Place Type *</label>
        <select
          id="lf-type"
          className={`input select ${errors.placeType ? 'error' : ''}`}
          value={placeType}
          onChange={e => setPlaceType(e.target.value)}
        >
          <option value="">Select a type…</option>
          {PLACE_TYPES.map(t => (
            <option key={t} value={t}>{PLACE_TYPE_MAP[t].label}</option>
          ))}
        </select>
        {errors.placeType && <span className="form-error">{errors.placeType}</span>}
      </div>

      {/* Description */}
      <div className="form-group">
        <label className="form-label" htmlFor="lf-desc">Description</label>
        <textarea
          id="lf-desc"
          className="input"
          placeholder="Optional description…"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      {/* Address */}
      <div className="form-group">
        <label className="form-label" htmlFor="lf-address">Address</label>
        <input
          id="lf-address"
          className="input"
          placeholder="Street, Barangay, City"
          value={address}
          onChange={e => setAddress(e.target.value)}
        />
      </div>

      {/* Lat / Lng */}
      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label" htmlFor="lf-lat">Latitude *</label>
          <input
            id="lf-lat"
            className={`input ${errors.lat ? 'error' : ''}`}
            type="number"
            step="any"
            value={lat}
            onChange={e => setLat(e.target.value)}
          />
          {errors.lat && <span className="form-error">{errors.lat}</span>}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="lf-lng">Longitude *</label>
          <input
            id="lf-lng"
            className={`input ${errors.lng ? 'error' : ''}`}
            type="number"
            step="any"
            value={lng}
            onChange={e => setLng(e.target.value)}
          />
          {errors.lng && <span className="form-error">{errors.lng}</span>}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
        <button
          id="lf-submit"
          type="submit"
          className="btn btn-primary"
          style={{ flex: 1, justifyContent: 'center' }}
          disabled={loading}
        >
          {loading ? 'Saving…' : editData ? 'Save Changes' : 'Add Pin'}
        </button>
        <button
          id="lf-cancel"
          type="button"
          className="btn btn-outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

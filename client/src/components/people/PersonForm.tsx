import { useState } from 'react';
import type { Person } from '../../lib/api';

interface PersonFormProps {
  editData?: Person;
  onSubmit: (data: Omit<Person, 'id' | 'location_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
}

export function PersonForm({ editData, onSubmit, onCancel }: PersonFormProps) {
  const [firstName, setFirstName] = useState(editData?.first_name ?? '');
  const [lastName, setLastName] = useState(editData?.last_name ?? '');
  const [role, setRole] = useState(editData?.role ?? '');
  const [contact, setContact] = useState(editData?.contact ?? '');
  const [notes, setNotes] = useState(editData?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'First name is required.';
    if (!lastName.trim()) e.lastName = 'Last name is required.';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await onSubmit({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role: role.trim() || null,
        contact: contact.trim() || null,
        notes: notes.trim() || null,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label" htmlFor="pf-firstname">First Name *</label>
          <input
            id="pf-firstname"
            className={`input ${errors.firstName ? 'error' : ''}`}
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="Juan"
          />
          {errors.firstName && <span className="form-error">{errors.firstName}</span>}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="pf-lastname">Last Name *</label>
          <input
            id="pf-lastname"
            className={`input ${errors.lastName ? 'error' : ''}`}
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            placeholder="Dela Cruz"
          />
          {errors.lastName && <span className="form-error">{errors.lastName}</span>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="pf-role">Role / Position</label>
        <input
          id="pf-role"
          className="input"
          value={role}
          onChange={e => setRole(e.target.value)}
          placeholder="e.g. Mayor, Commander, Dean"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="pf-contact">Contact</label>
        <input
          id="pf-contact"
          className="input"
          value={contact}
          onChange={e => setContact(e.target.value)}
          placeholder="Phone or email"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="pf-notes">Notes</label>
        <textarea
          id="pf-notes"
          className="input"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any additional notes…"
          rows={2}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          id="pf-submit"
          type="submit"
          className="btn btn-primary"
          style={{ flex: 1, justifyContent: 'center' }}
          disabled={loading}
        >
          {loading ? 'Saving…' : editData ? 'Update Person' : 'Add Person'}
        </button>
        <button
          id="pf-cancel"
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

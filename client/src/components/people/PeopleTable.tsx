import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, UserRound } from 'lucide-react';
import type { Person } from '../../lib/api';

interface PeopleTableProps {
  people: Person[];
  locationId: number;
  loading: boolean;
  onAddClick: () => void;
  onEditClick: (person: Person) => void;
  onDeleteClick: (person: Person) => void;
}

export function PeopleTable({ people, loading, onAddClick, onEditClick, onDeleteClick }: PeopleTableProps) {
  const [searchQ, setSearchQ] = useState('');

  const filtered = people.filter(p => {
    const q = searchQ.toLowerCase();
    return (
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.role ?? '').toLowerCase().includes(q) ||
      (p.contact ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>
            People at this location
          </span>
          <span className="badge badge-count" style={{ fontSize: '0.6875rem' }}>{people.length}</span>
        </div>
        <button
          id="add-person-btn"
          className="btn btn-primary btn-sm"
          onClick={onAddClick}
        >
          <Plus size={14} strokeWidth={2.5} />
          Add Person
        </button>
      </div>

      {/* Search */}
      {people.length > 0 && (
        <div style={{ position: 'relative' }}>
          <Search size={13} color="var(--color-text-muted)" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            id="people-search"
            className="input"
            style={{ paddingLeft: '1.75rem', fontSize: '0.8125rem', padding: '0.375rem 0.75rem 0.375rem 1.75rem' }}
            placeholder="Search people…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
          />
        </div>
      )}

      {/* Counter */}
      {people.length > 0 && (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Showing {filtered.length} of {people.length} people
        </p>
      )}

      {/* Table or empty state */}
      {loading ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem 0' }}>Loading…</p>
      ) : people.length === 0 ? (
        <div className="empty-state" style={{ padding: '1.5rem 0' }}>
          <UserRound size={32} />
          <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>No people added yet</p>
          <p style={{ fontSize: '0.8125rem' }}>Click + Add Person to get started.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: '1rem 0' }}>
          <p style={{ fontSize: '0.875rem' }}>No results for "{searchQ}"</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Role</th>
                <th>Contact</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(person => (
                <tr key={person.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--color-primary-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-primary)',
                        flexShrink: 0,
                      }}>
                        {person.first_name[0]}{person.last_name[0]}
                      </div>
                      <span style={{ fontWeight: 500 }}>{person.first_name} {person.last_name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{person.role ?? '—'}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{person.contact ?? '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                      <button
                        id={`edit-person-${person.id}`}
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Edit"
                        onClick={() => onEditClick(person)}
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        id={`delete-person-${person.id}`}
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Delete"
                        onClick={() => onDeleteClick(person)}
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

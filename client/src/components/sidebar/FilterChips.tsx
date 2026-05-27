import { PLACE_TYPES, PLACE_TYPE_MAP } from '../../lib/placeTypes';

interface FilterChipsProps {
  active: string;
  onChange: (type: string) => void;
  pinCounts: Record<string, number>;
}

export function FilterChips({ active, onChange, pinCounts }: FilterChipsProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1"
      style={{ scrollbarWidth: 'none' }}
    >
      <button
        className={`chip ${active === 'ALL' ? 'active' : ''}`}
        onClick={() => onChange('ALL')}
        id="filter-all"
      >
        All
        {pinCounts.ALL != null && (
          <span className="badge badge-count" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
            {pinCounts.ALL}
          </span>
        )}
      </button>

      {PLACE_TYPES.map(type => {
        const meta = PLACE_TYPE_MAP[type];
        const Icon = meta.icon;
        const count = pinCounts[type] ?? 0;
        if (count === 0) return null;
        return (
          <button
            key={type}
            id={`filter-${type.toLowerCase()}`}
            className={`chip ${active === type ? 'active' : ''}`}
            onClick={() => onChange(type)}
          >
            <Icon size={12} strokeWidth={2.5} />
            {meta.label}
            <span className="badge badge-count" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

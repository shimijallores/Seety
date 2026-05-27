import {
  Shield, Flame, Building2, Anchor, GraduationCap,
  Cross, ShieldCheck, Home, ShoppingCart, BookOpen, MapPin,
  type LucideIcon,
} from 'lucide-react';

export const PLACE_TYPES = [
  'AFP_CAMP',
  'BFP_STATION',
  'LGU',
  'PCG_STATION',
  'STATE_UNIVERSITY',
  'HOSPITAL',
  'POLICE_STATION',
  'BARANGAY_HALL',
  'MARKET',
  'SCHOOL',
  'OTHER',
] as const;

export type PlaceType = (typeof PLACE_TYPES)[number];

export interface PlaceTypeMeta {
  value: PlaceType;
  label: string;
  icon: LucideIcon;
  suggestion: string; // autocomplete suggestion prefix
}

export const PLACE_TYPE_MAP: Record<PlaceType, PlaceTypeMeta> = {
  AFP_CAMP:         { value: 'AFP_CAMP',         label: 'AFP Camp',           icon: Shield,       suggestion: 'AFP Camp — ' },
  BFP_STATION:      { value: 'BFP_STATION',      label: 'BFP Station',        icon: Flame,        suggestion: 'BFP Station — ' },
  LGU:              { value: 'LGU',              label: 'LGU',                icon: Building2,    suggestion: 'LGU — ' },
  PCG_STATION:      { value: 'PCG_STATION',      label: 'PCG Station',        icon: Anchor,       suggestion: 'PCG Station — ' },
  STATE_UNIVERSITY: { value: 'STATE_UNIVERSITY', label: 'State University',   icon: GraduationCap,suggestion: 'State University — ' },
  HOSPITAL:         { value: 'HOSPITAL',         label: 'Hospital / Health',  icon: Cross,        suggestion: 'Hospital / Health Center — ' },
  POLICE_STATION:   { value: 'POLICE_STATION',   label: 'Police Station',     icon: ShieldCheck,  suggestion: 'Police Station (PNP) — ' },
  BARANGAY_HALL:    { value: 'BARANGAY_HALL',    label: 'Barangay Hall',      icon: Home,         suggestion: 'Barangay Hall — ' },
  MARKET:           { value: 'MARKET',           label: 'Market / Palengke', icon: ShoppingCart, suggestion: 'Market / Palengke — ' },
  SCHOOL:           { value: 'SCHOOL',           label: 'School / College',   icon: BookOpen,     suggestion: 'School — ' },
  OTHER:            { value: 'OTHER',            label: 'Other',              icon: MapPin,       suggestion: '' },
};

export const NAME_SUGGESTIONS = [
  'AFP Camp — Camp Capinpin',
  'AFP Camp — Fort Bonifacio',
  'BFP Station — Lipa City',
  'BFP Station — Calamba City',
  'LGU — Antipolo City Hall',
  'LGU — Batangas City Hall',
  'LGU — Cavite City Hall',
  'LGU — Lucena City Hall',
  'PCG Station — Lemery',
  'PCG Station — Batangas',
  'DLSU — Dasmariñas',
  'UPLB — Los Baños',
  'Hospital / Health Center — ',
  'Police Station (PNP) — ',
  'Barangay Hall — ',
  'Market / Palengke — ',
  'School — ',
];

export function getPlaceMeta(type: PlaceType): PlaceTypeMeta {
  return PLACE_TYPE_MAP[type] ?? PLACE_TYPE_MAP.OTHER;
}

export function getPlaceLabel(type: string): string {
  return PLACE_TYPE_MAP[type as PlaceType]?.label ?? type;
}

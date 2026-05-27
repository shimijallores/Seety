import axios from 'axios';
import type { PlaceType } from './placeTypes';

// Use Vite proxy in dev (/api → http://localhost:3000/api)
const api = axios.create({ baseURL: '/api' });

// ── Types ─────────────────────────────────────────────────────────────────
export interface Location {
  id: number;
  name: string;
  place_type: PlaceType;
  description: string | null;
  lat: number;
  lng: number;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Person {
  id: number;
  location_id: number;
  first_name: string;
  last_name: string;
  role: string | null;
  contact: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchResults {
  locations: Pick<Location, 'id' | 'name' | 'place_type' | 'lat' | 'lng' | 'address'>[];
  people: (Pick<Person, 'id' | 'first_name' | 'last_name' | 'role' | 'location_id'> & {
    location_name: string;
  })[];
}

export interface OsrmManeuver {
  type: string;       // depart | turn | arrive | merge | roundabout | rotary | on ramp | off ramp | continue | new name | fork | end of road
  modifier?: string;  // left | right | slight left | slight right | sharp left | sharp right | straight | uturn
  bearing_before: number;
  bearing_after: number;
  location: [number, number]; // [lng, lat]
  exit?: number;
}

export interface OsrmStep {
  distance: number;   // metres to next step
  duration: number;   // seconds to next step
  name: string;       // road name
  maneuver: OsrmManeuver;
  mode: string;
}

export interface OsrmLeg {
  distance: number;
  duration: number;
  steps: OsrmStep[];
}

export interface DirectionsResult {
  geometry: GeoJSON.LineString;
  distance_m: number;
  duration_s: number;
  legs: OsrmLeg[];
}

// ── Pins ──────────────────────────────────────────────────────────────────
export const pinsApi = {
  getAll: () => api.get<Location[]>('/pins').then(r => r.data),
  getById: (id: number) => api.get<Location>(`/pins/${id}`).then(r => r.data),
  create: (data: Omit<Location, 'id' | 'created_at' | 'updated_at'>) =>
    api.post<Location>('/pins', data).then(r => r.data),
  update: (id: number, data: Partial<Omit<Location, 'id' | 'created_at' | 'updated_at'>>) =>
    api.put<Location>(`/pins/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/pins/${id}`).then(r => r.data),
};

// ── People ────────────────────────────────────────────────────────────────
export const peopleApi = {
  getAll: (locationId: number) =>
    api.get<Person[]>(`/locations/${locationId}/people`).then(r => r.data),
  create: (locationId: number, data: Omit<Person, 'id' | 'location_id' | 'created_at' | 'updated_at'>) =>
    api.post<Person>(`/locations/${locationId}/people`, data).then(r => r.data),
  update: (locationId: number, personId: number, data: Partial<Omit<Person, 'id' | 'location_id' | 'created_at' | 'updated_at'>>) =>
    api.put<Person>(`/locations/${locationId}/people/${personId}`, data).then(r => r.data),
  delete: (locationId: number, personId: number) =>
    api.delete(`/locations/${locationId}/people/${personId}`).then(r => r.data),
};

// ── Search ────────────────────────────────────────────────────────────────
export const searchApi = {
  search: (q: string) => api.get<SearchResults>('/search', { params: { q } }).then(r => r.data),
};

// ── Directions ────────────────────────────────────────────────────────────
export const directionsApi = {
  getRoute: (from_lat: number, from_lng: number, to_lat: number, to_lng: number) =>
    api
      .get<DirectionsResult>('/directions', { params: { from_lat, from_lng, to_lat, to_lng } })
      .then(r => r.data),
};

export default api;

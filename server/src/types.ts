// Shared types between routes
export interface Location {
  id: number;
  name: string;
  place_type: string;
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

export interface SearchResult {
  locations: Pick<Location, 'id' | 'name' | 'place_type' | 'lat' | 'lng' | 'address'>[];
  people: (Pick<Person, 'id' | 'first_name' | 'last_name' | 'role' | 'location_id'> & {
    location_name: string;
  })[];
}

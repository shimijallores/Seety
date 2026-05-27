# Product Requirements Document

# Calabarzon Interactive Map Web App

---

## 1. Overview

### 1.1 Product Name

**Seety** — Yield Explorer

### 1.2 Purpose

A full-stack interactive map web application focused on the **CALABARZON region of the Philippines** (Cavite, Laguna, Batangas, Rizal, Quezon). It lets users:

- Explore and search locations on an OpenStreetMap-powered map
- Drop and manage custom **pins** on the map with place metadata
- Track and manage **people** associated with each pinned location
- Get **turn-by-turn directions** to any pinned location

### 1.3 Target Users

Municipal/city government staff, field coordinators, community organizers, or any user who needs to track locations and the people associated with them across CALABARZON.

### 1.4 Tech Stack

| Layer              | Technology                                                                            |
| ------------------ | ------------------------------------------------------------------------------------- |
| Frontend           | React (Vite), Shadcn/UI, Tailwind CSS                                                 |
| Map Engine         | Leaflet.js + OpenStreetMap tiles                                                      |
| Routing/Directions | OSRM (Open Source Routing Machine) public API                                         |
| Backend            | Node.js + Express.js                                                                  |
| Database           | SQLite (via `better-sqlite3`) for local simplicity; swap to PostgreSQL for production |
| ORM                | Drizzle ORM or raw SQL                                                                |
| API Style          | RESTful JSON API                                                                      |

### 1.5 Color Scheme

| Token                   | Value     | Usage                                |
| ----------------------- | --------- | ------------------------------------ |
| `--color-primary`       | `#41176b` | Buttons, active states, pins, header |
| `--color-background`    | `#ffffff` | App background, cards                |
| `--color-primary-light` | `#6b34a8` | Hover states, secondary accents      |
| `--color-primary-muted` | `#f0eaf8` | Subtle backgrounds, chips, tags      |
| `--color-text`          | `#1a1a2e` | Body text                            |
| `--color-text-muted`    | `#6b7280` | Secondary text, labels               |
| `--color-border`        | `#e5e7eb` | Card borders, dividers               |
| `--color-danger`        | `#dc2626` | Delete actions                       |

---

## 2. Application Architecture

```
/client                   ← React frontend (Vite)
  /src
    /components
      /map                ← Map view, pin markers, radius circle
      /sidebar            ← Search panel, pin list, location detail
      /people             ← People CRUD table/cards
      /directions         ← Directions panel
      /ui                 ← Shadcn components
    /hooks                ← useMap, usePins, usePeople, useDirections
    /lib                  ← api.js (axios), utils
    /pages
      App.jsx             ← Root layout
  index.html

/server                   ← Express backend
  /routes
    pins.js               ← CRUD for pins/locations
    people.js             ← CRUD for people
    directions.js         ← Proxy to OSRM or return cached route
  /db
    schema.sql            ← DB schema
    seed.js               ← Optional seed data
  index.js                ← Express entry point

/shared
  types.js                ← Shared enums (place types, etc.)
```

---

## 3. Map View

### 3.1 Initial State

- On load, the map **automatically centers and zooms** to the CALABARZON region bounding box:
  - Southwest: `13.3°N, 120.8°E`
  - Northeast: `14.8°N, 122.2°E`
- Use `react-leaflet` as the Leaflet wrapper for React.
- Tile provider: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- Map controls: zoom in/out, scale bar (bottom left), attribution (bottom right).

### 3.2 Map Interaction

- **Click on empty map area** → opens "Add New Pin" modal/form pre-filled with clicked coordinates.
- **Click on existing pin marker** → opens the Location Detail Panel (right/bottom sidebar).
- **Drag map** → standard pan behavior.
- **Scroll** → standard zoom behavior.

### 3.3 Pin Markers

- Custom SVG pin icon using `--color-primary` (`#41176b`).
- Pin icon varies subtly by **place type** (see Section 4.3) using a small icon badge inside the pin.
- On hover: pin scales up slightly (CSS transform), tooltip shows place name.
- Selected/active pin: glows with a purple halo (CSS drop-shadow).

---

## 4. Location/Pin Management

### 4.1 Data Model — `locations` table

```sql
CREATE TABLE locations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  place_type  TEXT NOT NULL,        -- enum (see 4.3)
  description TEXT,
  lat         REAL NOT NULL,
  lng         REAL NOT NULL,
  address     TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 Place Name Suggestions

When the user is typing in the "Place Name" field of the Add/Edit Pin form, the app suggests the following **prefix autocomplete** options (stored client-side, no API needed):

- AFP Camp (e.g., "AFP Camp — Camp Capinpin")
- BFP Station (e.g., "BFP Station — Lipa City")
- LGU (e.g., "LGU — Antipolo City Hall")
- PCG Station (e.g., "PCG Station — Lemery")
- State University (e.g., "DLSU — Dasmariñas")
- Hospital / Health Center
- Police Station (PNP)
- Barangay Hall
- Market / Palengke
- School / College
- Custom (free text)

Implementation: `<datalist>` or a Shadcn `Combobox` component with these as preset options. User can type anything freely.

### 4.3 Place Types (enum)

```
AFP_CAMP | BFP_STATION | LGU | PCG_STATION | STATE_UNIVERSITY |
HOSPITAL | POLICE_STATION | BARANGAY_HALL | MARKET | SCHOOL | OTHER
```

Each type maps to a small icon (Lucide React icon) shown on the pin and in the detail panel.

| Type             | Lucide Icon     |
| ---------------- | --------------- |
| AFP_CAMP         | `Shield`        |
| BFP_STATION      | `Flame`         |
| LGU              | `Building2`     |
| PCG_STATION      | `Anchor`        |
| STATE_UNIVERSITY | `GraduationCap` |
| HOSPITAL         | `Cross`         |
| POLICE_STATION   | `ShieldCheck`   |
| BARANGAY_HALL    | `Home`          |
| MARKET           | `ShoppingCart`  |
| SCHOOL           | `BookOpen`      |
| OTHER            | `MapPin`        |

### 4.4 CRUD Operations — Locations

**Create**

- Triggered by clicking on the map or clicking "+ Add Pin" button in sidebar.
- Form fields: Name (with suggestions), Place Type (dropdown), Description (textarea), Address (text), Lat/Lng (auto-filled from click, editable).
- Validation: Name and Place Type are required.
- On submit → `POST /api/pins` → pin appears on map immediately.

**Read**

- All pins loaded on app start via `GET /api/pins`.
- Clicking a pin → `GET /api/pins/:id` → loads detail panel.

**Update**

- Edit button inside Location Detail Panel → opens same form pre-filled.
- On submit → `PUT /api/pins/:id`.

**Delete**

- Delete button inside Location Detail Panel → shows Shadcn `AlertDialog` for confirmation.
- On confirm → `DELETE /api/pins/:id` → pin removed from map.

---

## 5. Location Detail Panel

When a pin is clicked, a **slide-in panel** appears on the right side (desktop) or bottom sheet (mobile) showing:

### 5.1 Panel Sections

**Header**

- Place name (large, bold, `--color-primary`)
- Place type badge/chip
- Description
- Address
- Coordinates (small, muted text)

**Action Buttons Row**

- `Get Directions` (primary button, filled `#41176b`) — see Section 7
- `Edit` (outline button)
- `Delete` (ghost button, red text)

**People Section**

- Subheading: "People at this location"
- People count badge
- Search bar (search by name, role, contact)
- "+ Add Person" button
- People list/table (see Section 6)

---

## 6. People Management

### 6.1 Data Model — `people` table

```sql
CREATE TABLE people (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  role        TEXT,              -- e.g., "Commander", "Mayor", "Dean"
  contact     TEXT,             -- phone or email
  notes       TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 6.2 CRUD Operations — People

All people operations are **scoped to a location** (`location_id`).

**Create**

- Click "+ Add Person" button in Location Detail Panel.
- Form fields: First Name, Last Name, Role, Contact, Notes.
- On submit → `POST /api/locations/:locationId/people`.

**Read**

- Loaded when Location Detail Panel opens → `GET /api/locations/:locationId/people`.
- Search: client-side filter on name, role, contact as user types in the search bar.

**Update**

- Edit icon button per row → inline edit form or modal.
- On submit → `PUT /api/locations/:locationId/people/:personId`.

**Delete**

- Delete icon button per row → Shadcn `AlertDialog` confirmation.
- On confirm → `DELETE /api/locations/:locationId/people/:personId`.

### 6.3 People List UI

- Displayed as a **data table** using Shadcn `Table` component inside the Location Detail Panel.
- Columns: Full Name | Role | Contact | Actions (Edit, Delete)
- Empty state: "No people added yet. Click + Add Person to get started."
- Search filters in real time (client-side).
- Show total count: "Showing X of Y people"

---

## 7. Search Functionality

### 7.1 Global Search Bar (top of sidebar)

- Searches across **location names**, **addresses**, and **people names**.
- Debounced (300ms) → calls `GET /api/search?q=<query>`.
- Results grouped: "Locations" section and "People" section.
- Clicking a location result → flies map to that pin and opens detail panel.
- Clicking a person result → opens their parent location's detail panel, highlighting that person in the list.

### 7.2 Backend Search Endpoint

```
GET /api/search?q=<query>
Response:
{
  "locations": [ { id, name, place_type, lat, lng } ],
  "people": [ { id, first_name, last_name, role, location_id, location_name } ]
}
```

Uses SQL `LIKE '%query%'` across relevant columns.

### 7.3 Location Name Autocomplete

- When adding/editing a pin, the name field uses the preset suggestions list (Section 4.2) for autocomplete.

---

## 8. Directions Feature

### 8.1 Behavior

- Triggered by clicking "Get Directions" in the Location Detail Panel.
- The app **requests the user's current geolocation** via browser `navigator.geolocation.getCurrentPosition()`.
- If granted: calculates route from user's current position to pin's coordinates.
- If denied: shows a text input to let user type a starting location (geocoded via Nominatim API).

### 8.2 Routing Engine

- Use the **OSRM Demo Server** (or self-hosted): `https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson`
- Parse the GeoJSON polyline from the response and draw it on the Leaflet map as a colored line (`#41176b`, weight 5, opacity 0.8).

### 8.3 Directions Panel

Shown below or beside the map when directions are active:

- Origin label (e.g., "Your Location" or typed address)
- Destination label (pin name)
- **Distance** in kilometers
- **Estimated time** in minutes (from OSRM `duration`)
- "Clear Directions" button to remove the route polyline
- Optional: Step-by-step turn instructions (from OSRM `steps` if available)

### 8.4 Visual Style

- Route line: solid `#41176b`, 5px width, with a slight animated dash offset to indicate direction of travel (CSS animation).
- Start marker: green circle.
- End marker: existing pin (purple).

---

## 9. Sidebar / Left Panel Layout

The left sidebar (320–380px wide on desktop) contains:

1. **App Logo + Name** (top) — "Seety" or chosen name,
2. **Search Bar** — global search (Section 7.1)
3. **"+ Add Pin" Button** — opens Add Pin form
4. **Filter Chips** — filter visible pins by place type (All, AFP Camp, BFP, LGU, etc.)
5. **Pins List** — scrollable list of all pins, sorted by distance or name
   - Each item: type icon + place name + address snippet + arrow
   - Clicking → flies to pin on map, opens detail panel
6. **Pin Count** — "X locations in CALABARZON"

---

## 10. REST API Reference

### Base URL: `http://localhost:3000/api`

#### Locations

| Method | Endpoint    | Description    |
| ------ | ----------- | -------------- |
| GET    | `/pins`     | Get all pins   |
| POST   | `/pins`     | Create new pin |
| GET    | `/pins/:id` | Get single pin |
| PUT    | `/pins/:id` | Update pin     |
| DELETE | `/pins/:id` | Delete pin     |

#### People

| Method | Endpoint                            | Description                |
| ------ | ----------------------------------- | -------------------------- |
| GET    | `/locations/:locationId/people`     | Get all people at location |
| POST   | `/locations/:locationId/people`     | Add person to location     |
| PUT    | `/locations/:locationId/people/:id` | Update person              |
| DELETE | `/locations/:locationId/people/:id` | Delete person              |

#### Search

| Method | Endpoint     | Description                 |
| ------ | ------------ | --------------------------- |
| GET    | `/search?q=` | Search locations and people |

#### Directions (optional backend proxy)

| Method | Endpoint                                          | Description              |
| ------ | ------------------------------------------------- | ------------------------ |
| GET    | `/directions?from_lat=&from_lng=&to_lat=&to_lng=` | Proxy OSRM route request |

---

## 11. UI Component Breakdown (Shadcn)

| Component             | Usage                                                   |
| --------------------- | ------------------------------------------------------- |
| `Button`              | All action buttons (Get Directions, Save, Delete, etc.) |
| `Input`               | Search bar, form text fields                            |
| `Textarea`            | Description and Notes fields                            |
| `Select` / `Combobox` | Place type dropdown, name suggestions                   |
| `Dialog`              | Add/Edit Pin modal, Add/Edit Person modal               |
| `AlertDialog`         | Delete confirmation                                     |
| `Table`               | People list inside Location Detail Panel                |
| `Badge`               | Place type chip, people count                           |
| `Sheet`               | Slide-in Location Detail Panel (mobile: bottom sheet)   |
| `Tooltip`             | Pin hover label on map                                  |
| `Separator`           | Section dividers inside panels                          |
| `ScrollArea`          | Scrollable sidebar pin list and people table            |

---

## 12. Non-Functional Requirements

### 12.1 Performance

- Pins loaded once on app start, stored in React state; no re-fetch on every interaction.
- Map tiles cached by Leaflet automatically.
- Search debounced to 300ms to avoid excessive API calls.

### 12.2 Responsive Design

- **Desktop (≥1024px)**: Split layout — map takes 65% width, sidebar takes 35%.
- **Tablet (768–1023px)**: Sidebar overlays map, toggled via hamburger button.
- **Mobile (<768px)**: Map is full screen; sidebar and detail panel appear as bottom sheets.

### 12.3 Map Boundaries

- Soft constraint: Default view is CALABARZON, but users can pan freely.
- Pin creation is allowed anywhere (no hard bounds enforcement).

### 12.4 Error Handling

- If OSRM fails → show toast: "Could not load directions. Please try again."
- If geolocation denied → gracefully show manual input instead.
- If backend is unreachable → show banner: "Unable to connect to server."
- All forms validate on submit with inline error messages.

---

## 13. File & Folder Structure (Recommended)

```
project-root/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── map/
│   │   │   │   ├── MapView.jsx           ← Main Leaflet map container
│   │   │   │   ├── PinMarker.jsx         ← Custom marker component
│   │   │   │   └── RoutePolyline.jsx     ← Directions route layer
│   │   │   ├── sidebar/
│   │   │   │   ├── Sidebar.jsx           ← Left panel wrapper
│   │   │   │   ├── PinList.jsx           ← Scrollable pin list
│   │   │   │   └── FilterChips.jsx       ← Place type filter pills
│   │   │   ├── location/
│   │   │   │   ├── LocationPanel.jsx     ← Detail panel (Sheet)
│   │   │   │   ├── LocationForm.jsx      ← Add/Edit pin form
│   │   │   │   └── DirectionsPanel.jsx   ← Route info display
│   │   │   ├── people/
│   │   │   │   ├── PeopleTable.jsx       ← People CRUD table
│   │   │   │   └── PersonForm.jsx        ← Add/Edit person form
│   │   │   └── ui/                       ← Shadcn auto-generated components
│   │   ├── hooks/
│   │   │   ├── usePins.js
│   │   │   ├── usePeople.js
│   │   │   └── useDirections.js
│   │   ├── lib/
│   │   │   ├── api.js                    ← Axios instance + all API calls
│   │   │   └── placeTypes.js             ← Enum + icon mapping
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/
│   ├── routes/
│   │   ├── pins.js
│   │   ├── people.js
│   │   └── search.js
│   ├── db/
│   │   ├── database.js                   ← DB connection setup
│   │   └── schema.sql                    ← Table definitions
│   ├── middleware/
│   │   └── errorHandler.js
│   └── index.js                          ← Express app entry point
│
├── package.json (root, with workspaces or two separate package.json)
└── README.md
```

---

## 14. Development Setup Instructions (for the agent)

### Step 1 — Bootstrap

```bash
# Create project
mkdir seety && cd seety

# Initialize client
npm create vite@latest client -- --template react
cd client && npm install

# Install Leaflet + React-Leaflet
npm install leaflet react-leaflet

# Install Shadcn (follow shadcn-ui init)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input textarea select dialog alert-dialog table badge sheet tooltip separator scroll-area

# Install Axios
npm install axios

# Initialize server
cd ../
mkdir server && cd server
npm init -y
npm install express better-sqlite3 cors dotenv
```

### Step 2 — Environment

```env
# server/.env
PORT=3000
CLIENT_URL=http://localhost:5173
```

### Step 3 — Database Init

- On server start, run `schema.sql` to create tables if they don't exist.
- Use `better-sqlite3` synchronous API for simplicity.

### Step 4 — Run Dev

```bash
# Terminal 1 - server
cd server && node index.js

# Terminal 2 - client
cd client && npm run dev
```

---

## 15. Acceptance Criteria

| #   | Feature          | Acceptance Criteria                                 |
| --- | ---------------- | --------------------------------------------------- |
| 1   | Map loads        | Map renders CALABARZON region on app open           |
| 2   | Add pin          | Clicking map + filling form creates visible marker  |
| 3   | Edit pin         | Changes to pin save and reflect on map              |
| 4   | Delete pin       | Pin removed from map and DB; people cascade-deleted |
| 5   | Place type       | Dropdown shows all types; icon shown on marker      |
| 6   | Name suggestions | Typing in name field shows preset suggestions       |
| 7   | People CRUD      | Can add, edit, delete people scoped to a location   |
| 8   | People search    | Search bar filters people list in real time         |
| 9   | Global search    | Searches return matching locations and people       |
| 10  | Directions       | Route drawn on map from current position to pin     |
| 11  | Directions info  | Distance and ETA shown after route loads            |
| 12  | Responsive       | Works on mobile, tablet, and desktop                |
| 13  | Color scheme     | All primary actions use `#41176b`; bg is `#ffffff`  |

---

_End of PRD — KALYE Calabarzon Interactive Map App_

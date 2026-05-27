# Seety — Yield Explorer 🗺️

**Seety** is a full-stack interactive map web application for the **CALABARZON region of the Philippines**. Track locations, manage people at those locations, and get turn-by-turn directions — all powered by OpenStreetMap and OSRM.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript (Vite), Tailwind CSS |
| Map | Leaflet.js + react-leaflet + OpenStreetMap |
| Routing | OSRM public API |
| Backend | Node.js 22 + Express + TypeScript (tsx) |
| Database | Node.js built-in `node:sqlite` (no native compilation required) |

---

## Getting Started

### Prerequisites
- Node.js **v22+** (required for built-in `node:sqlite`)

### 1. Install Dependencies

```bash
# Server
cd server && npm install

# Client
cd client && npm install
```

### 2. Start the Server

```bash
cd server
npm run dev
# → API running on http://localhost:3000
```

### 3. Start the Client

```bash
cd client
npm run dev
# → App running on http://localhost:5173
```

---

## Features

- 📍 **Interactive Map** — Centered on CALABARZON; click anywhere to drop a pin
- 🏛️ **11 Place Types** — AFP Camp, BFP Station, LGU, PCG Station, State University, Hospital, Police Station, Barangay Hall, Market, School, Other
- 👥 **People Management** — Add, edit, delete people scoped to each location
- 🔍 **Global Search** — Search across locations and people (debounced, grouped results)
- 🧭 **Turn-by-Turn Directions** — Uses your browser's geolocation + OSRM routing
- 📱 **Responsive** — Desktop split-pane, mobile bottom sheet

---

## Project Structure

```
seety/
├── client/                  # React + TypeScript frontend
│   └── src/
│       ├── components/
│       │   ├── map/         # MapView, PinMarker, RoutePolyline
│       │   ├── sidebar/     # Sidebar, PinList, FilterChips
│       │   ├── location/    # LocationPanel, LocationForm, DirectionsPanel
│       │   └── people/      # PeopleTable, PersonForm
│       ├── hooks/           # usePins, usePeople, useDirections
│       └── lib/             # api.ts, placeTypes.ts
│
└── server/                  # Express + TypeScript backend
    └── src/
        ├── routes/          # pins.ts, people.ts, search.ts, directions.ts
        ├── db/              # database.ts (node:sqlite), schema.sql
        └── middleware/      # errorHandler.ts
```

---

## Color Palette

| Token | Value | Usage |
|---|---|---|
| Primary | `#41176b` | Buttons, pins, header |
| Primary Light | `#6b34a8` | Hover states |
| Primary Muted | `#f0eaf8` | Backgrounds, chips |

---

## API Reference

Base URL: `http://localhost:3000/api`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/pins` | All locations |
| POST | `/pins` | Create location |
| PUT | `/pins/:id` | Update location |
| DELETE | `/pins/:id` | Delete location (cascades) |
| GET | `/locations/:id/people` | People at location |
| POST | `/locations/:id/people` | Add person |
| PUT | `/locations/:id/people/:pid` | Update person |
| DELETE | `/locations/:id/people/:pid` | Delete person |
| GET | `/search?q=` | Search all |
| GET | `/directions?from_lat&from_lng&to_lat&to_lng` | OSRM route |

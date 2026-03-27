<p align="center">
  <img src="public/img/leucaena-earth-logo.png" alt="leucaena.earth" width="120">
</p>

<h1 align="center">leucaena.earth</h1>

<p align="center">
  <strong>Plataforma colaborativa de mapeamento da Leucena (<em>Leucaena leucocephala</em>)</strong><br>
  Crowdsourced WebGIS for invasive species mapping
</p>

<p align="center">
  <a href="https://map.leucaena.earth">map.leucaena.earth</a>
</p>

---

## About

**leucaena.earth** is a collaborative web-based GIS platform designed for mapping the occurrence of *Leucaena leucocephala*, an invasive species, across the state of Sao Paulo, Brazil. Researchers, students, and volunteers work together to draw validation masks (polygons) over satellite imagery, validate occurrence points from multiple data sources, and contribute new sightings — all in real time.

The platform divides the territory into a grid of cells. Each cell can be locked by a user for exclusive editing, ensuring no conflicts. Users draw polygons marking areas where Leucaena is present, punch holes in masks for excluded zones, and validate individual occurrence points sourced from biodiversity databases.

---

## Features

### Interactive Map

- **Google Maps** satellite imagery with optional label overlay
- **Real-time collaboration** — see who is online and which cells are being edited via Socket.IO
- **Coordinate display** with long-press copy to clipboard
- **Street View** integration (Shift+S) for ground-level verification
- **Custom zoom controls** with dynamic restrictions during editing
- **Performance optimized** — viewport culling, marker clustering, gzip compression

### Grid & Workflow

- Territory divided into **lockable grid cells** with visual status indicators:
  - `Not Yet Finished` · `Mapping` · `In Use` · `No Points` · `Finished`
- **Cell locking** with heartbeat — prevents conflicts between simultaneous editors
- **Automatic unlock** on disconnect or logout
- **Finish validation** — ensures all valid points are covered by masks before marking complete

### Drawing Tools

| Tool | Shortcut | Description |
|------|----------|-------------|
| **Select** | — | Click polygons to inspect or select |
| **Create Polygon** | Shift+C | Draw mask polygons with V key vertices, right-click to finish |
| **Edit Polygon** | Shift+E | Drag vertices to reshape existing masks |
| **Hole Tool** | Shift+H | Cut holes in masks (inner rings) with full vertex validation |
| **Delete Polygon** | Shift+D | Two-step delete with confirmation (Enter/Delete key) |
| **Street View** | Shift+S | Toggle Street View at click position |

- **V key** for precision vertex placement at cursor position (both draw and hole modes)
- **Ctrl+Z** undo for vertex removal and polygon deletion
- **Area labels** (ha/m²) visible at zoom 16+ during editing
- **Hole validation** — prevents holes outside the parent polygon or inside existing holes
- **Tool switching safety modal** when unsaved work is in progress

### Occurrence Points

- **5 data layers** with distinct visual styling:
  - Crowdmapping · iNaturalist · GBIF · Instituto Horus · SpeciesLink
- **Marker clustering** with custom styled cluster icons that decluster on click
- **Point insertion mode** (L key) for adding new sightings at cursor position
- **Validity cycling** — mark points as valid, invalid, or uncertain
- **Layer filters** in sidebar to show/hide individual data sources
- **Status filters** to view cells by workflow state

### Admin Panel

- **User management** — create, edit profiles, change passwords, assign roles, delete users
- **Role hierarchy** — Super Admin > Admin > Team > Contributor > Tester
- **Dashboard metrics** — total users (with collaborator count), masks, mapped area
- **"View as Admin" toggle** — Super Admins can preview the admin-level view
- **GeoJSON import** for batch point ingestion with deduplication
- **Duplicate point removal** with undo capability
- **Activity logs** — 48h CSV export or 5-minute clipboard copy
- **Database backup** download
- **Registration passcode** system with Roman numeral encoding

### Data Export

- **Leucaena Masks** — all polygons as GeoJSON (QGIS-compatible, including holes)
- **Grid Status** — cell geometries with workflow states
- **Occurrence Points** — all points with layer and validity metadata
- **User Stats CSV** — usernames, mask counts, time online, login history

### Internationalization

Full i18n support with automatic browser language detection:

- **Portugues** (default)
- **English**
- **Espanol**

### UX & Accessibility

- **Keyboard shortcuts** for all major tools with tooltips showing hotkeys
- **Escape key** closes any open modal
- **Crosshair cursor** in drawing modes
- **Toast notifications** for all user actions
- **Responsive design** — works on desktop and mobile
- **Splash screen** with branding on load
- **Welcome onboarding** for new users
- **Documentation guide** with mapping tutorial video

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js |
| **Server** | Express + Socket.IO |
| **Database** | SQLite via sql.js (WebAssembly) |
| **Frontend** | Vanilla JS (modular IIFEs), CSS3, HTML5 |
| **Maps** | Google Maps JavaScript API |
| **Real-time** | Socket.IO (WebSocket) |
| **Compression** | gzip via `compression` middleware |
| **IDs** | UUID v4 |
| **Hosting** | Render (with persistent disk) |

---

## Project Structure

```
leucena-mapping/
├── server.js              # Express server, API routes, Socket.IO, auth
├── db.js                  # SQLite schema, migrations, query helpers
├── package.json
├── data/
│   └── leucaena-earth.db   # SQLite database (auto-created)
├── seed-data/
│   ├── seed.js            # Database seeder script
│   ├── grid-aoi.geojson   # Grid cells (area of interest)
│   └── leucaena-points.geojson  # Initial occurrence points
└── public/
    ├── index.html          # Main map application
    ├── landing.html        # Landing page (leucaena.earth)
    ├── css/
    │   └── style.css       # Full application styles
    ├── js/
    │   ├── app.js          # App shell: auth, sidebar, admin, modals
    │   ├── map.js          # Map init, grid rendering, clustering, culling
    │   ├── drawing.js      # Polygon tools, hole drawing, undo system
    │   ├── i18n.js         # Internationalization (pt/en/es)
    │   ├── collab.js       # Real-time collaboration (Socket.IO client)
    │   ├── export.js       # Data export handlers
    │   ├── onboarding.js   # Welcome flow and guided tour
    │   └── docs.js         # Documentation modal content
    └── img/                # Logos, splash, partner/sponsor images
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Google Maps API Key** with Maps JavaScript API and Geometry library enabled

### Installation

```bash
git clone https://github.com/matheussiba/leucena-mapping.git
cd leucena-mapping
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_MAPS_KEY` | Yes | Google Maps JavaScript API key |
| `PASSWORD_SALT` | Yes | Salt string for password hashing |
| `GOOGLE_ANALYTICS_ID` | No | Google Analytics tracking ID (omit to disable) |
| `PORT` | No | Server port (default: 3000) |
| `DATA_PATH` | No | Directory for SQLite DB and backups (default: `./data`) |
| `NODE_ENV` | No | Set to `production` for HTTPS redirect and domain enforcement |
| `MAINTENANCE_MODE` | No | Set to `true` to show maintenance page |

### Seed the Grid

```bash
npm run seed
```

### Create the First Admin

On a fresh install, create a superadmin account:

```bash
node create-admin.js <username> <password> [email]
```

Example:

```bash
node create-admin.js admin mySecurePass admin@example.com
```

After this, log in at `http://localhost:3000` and manage all other users from the admin panel.

### Run

```bash
npm start
```

The application will be available at `http://localhost:3000`.

---

## Deployment (Render)

1. Create a **Web Service** on [Render](https://render.com) connected to the GitHub repository
2. Set build command: `npm install`
3. Set start command: `node server.js`
4. Add environment variables:
   - `GOOGLE_MAPS_KEY` — your Google Maps API key
   - `PASSWORD_SALT` — your password hashing salt
   - `GOOGLE_ANALYTICS_ID` — your Google Analytics ID (optional)
   - `NODE_ENV` = `production`
   - `DATA_PATH` = `/data`
5. Attach a **Persistent Disk** mounted at `/data`
6. Configure custom domain: `map.leucaena.earth`

---

## Database

The platform uses **SQLite** (via sql.js compiled to WebAssembly) with automatic schema migrations on startup. Core tables:

| Table | Purpose |
|-------|---------|
| `grid_cells` | Territory grid with status, lock info, geometry |
| `polygons` | Mask polygons (GeoJSON) drawn by users |
| `occurrence_points` | Species occurrence data from multiple sources |
| `users` | Accounts, roles, profiles, activity stats |
| `activity_logs` | Timestamped audit trail of all actions |
| `site_stats` | View counter and global metrics |

---

## API Overview

The server exposes RESTful endpoints organized by domain:

- **Auth** — registration, login, logout, password reset
- **Grid** — cell listing, status updates, locking/unlocking
- **Polygons** — CRUD for mask geometries
- **Points** — occurrence point management and validity
- **Export** — GeoJSON and CSV downloads
- **Admin** — user management, logs, backups, imports, deduplication

Real-time events are broadcast via Socket.IO for live map updates across all connected clients.

---

## License

This project is developed for academic and conservation research purposes.

---

<p align="center">
  <sub>Built with dedication for biodiversity conservation</sub><br>
  <a href="https://leucaena.earth">leucaena.earth</a>
</p>

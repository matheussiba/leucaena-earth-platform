> **Part of the [PhD Leucaena Mapping Project](https://github.com/matheussiba/phd-leucaena-mapping)** — Mapping and Biomass Estimation of *Leucaena leucocephala* with Deep Learning (ESALQ/USP).
> See also: [leucaena-earth-segmentation](https://github.com/matheussiba/leucaena-earth-segmentation) (deep learning pipeline)

<p align="center">
  <img src="public/img/leucaena-earth-logo.png" alt="leucaena.earth" width="120">
</p>

<h1 align="center">leucaena.earth</h1>

<p align="center">
  <strong>Plataforma colaborativa de mapeamento da Leucena (<em>Leucaena leucocephala</em>) em todo o Brasil</strong><br>
  Crowdsourced WebGIS for invasive species mapping — now nationwide
</p>

<p align="center">
  <a href="https://map.leucaena.earth">map.leucaena.earth</a>
</p>

---

## About

**leucaena.earth** is a collaborative web-based GIS platform designed for mapping the occurrence of *Leucaena leucocephala*, an invasive species, across **all 27 Brazilian states**. Developed as part of a PhD research project at ESALQ/USP and funded by **FAPESP**, the platform enables researchers, students, and volunteers to draw validation masks (polygons) over satellite imagery, validate occurrence points from multiple data sources, and contribute new sightings — all in real time.

The in-depth research analysis focuses on **São Paulo** as the primary study area, but **data collection is active and encouraged in every state**. The platform divides the territory into a grid of cells organized by **state (UF)**. Each cell can be locked by a user for exclusive editing, ensuring no conflicts. Users draw polygons marking areas where Leucaena is present, punch holes in masks for excluded zones, and validate individual occurrence points sourced from biodiversity databases.

### Geographic expansion model

The architecture supports expansion to any Brazilian state — and potentially to other countries in the future:

- **State coverage** is managed through a `grid_cell_states` junction table (many-to-many between cells and states), supporting border cells that belong to multiple states.
- **State metadata** (names, regions) is defined client-side in `UF_META`, making it easy to add new geographic units without database changes.
- **Grid cells are generated externally** (QGIS/Python) and imported via `scripts/seed_brazil_grid.js`, so the platform is decoupled from any specific geographic boundary generator.
- **State outlines** are loaded from a static GeoJSON file (`public/data/brazil-states.geojson`), which can be replaced or extended for other countries.

To add a new country, one would: (1) generate a grid GeoJSON for the territory, (2) add state/region metadata to the client, (3) provide boundary outlines as GeoJSON, (4) import the grid cells with the seed script.

---

## Features

### Interactive Map

- **Google Maps** satellite imagery with optional label overlay
- **Real-time collaboration** — see who is online and which cells are being edited via Socket.IO
- **Coordinate display** with long-press copy to clipboard
- **Street View** integration (Shift+S) for ground-level verification
- **Custom zoom controls** with dynamic restrictions during editing
- **Performance optimized** — `google.maps.Data` Layer (canvas rendering), viewport culling, marker clustering, gzip compression, in-memory grid cache per state

### Region Selector & Brazil Overview

- **Interactive Brazil overview** — first-load experience shows all 27 states as interactive, colored outlines with hover tooltips displaying per-state mapping progress (% finished, mapping, to map)
- **Region picker modal** — search by name, geolocation-based suggestion, "Brasil inteiro" option with 🇧🇷 flag
- **State cards** showing cell count per UF, organized by region
- **Topbar chip** displaying the selected region with one-click switch
- **State outlines** layer (`brazil-states.geojson`) — clickable in Brazil view, reference-only outline when a state is selected
- **Per-state grid loading** — `GET /api/grid?state=UF` loads only cells for the selected state
- **In-memory cache** (`gridCache`) — switching back to a previously loaded state is instant
- **Pan restriction** adjusted to the selected state's bounds
- **Masks and points filtered** by state — only data belonging to cells of the selected state is visible
- **Sidebar hides progress/filters** in Brazil overview (no state selected), shows them when a state is active
- **`localStorage` persistence** — the selected region is remembered across sessions
- **URL parameter** `?region=UF` (with `?state=` fallback for backward compatibility)

### Grid & Workflow

- Territory divided into **lockable grid cells** with visual status indicators:
  - `Not Yet Finished` · `Mapping` · `In Use` · `No Points` · `Finished`
- **Cell locking** with heartbeat — prevents conflicts between simultaneous editors
- **Automatic unlock** on disconnect or logout
- **Finish validation** — ensures all valid points are covered by masks before marking complete
- **Multi-state cells** — border cells belong to multiple UFs via the `grid_cell_states` junction table

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
- **Provenance tracking** — `added_by` and `added_by_role` recorded for every new point

### Messaging & Inbox

- **Bell icon** in the topbar with unread badge
- **Inbox modal** with threaded messages (accordion), read/unread status
- **Compose** — users can message superadmins; admins can message all users or individuals
- **Reply system** — replies go to the original sender + all superadmins
- **WYSIWYG editor** — bold, alignment, lists, up to 2 inline images
- **Email notifications** via Resend for every message
- **Anti-spam** — rate limiting, cooldown, daily limit, character limits
- **Welcome messages** — automatic welcome message for new users
- **Admin controls** — superadmins can delete messages; historical date filter

### Admin Panel

- **User management** — create, edit profiles, change passwords, assign roles, delete users
- **Role hierarchy** — Super Admin > Admin > Team > Contributor > Tester
- **Dashboard metrics** — total users (with collaborator count), masks, mapped area
- **"View as Admin" toggle** — Super Admins can preview the admin-level view
- **GeoJSON import** for batch point ingestion with deduplication
- **Duplicate point removal** with undo capability
- **Activity logs** — 48h CSV export or 5-minute clipboard copy
- **Database backup** download
- **Batch operations** — bulk role changes, verification, deactivation

### Role Permissions (Admin Panel)

| Capability | Super Admin | Admin | Team/Member |
|------------|:-----------:|:-----:|:-----------:|
| View metrics & user list | ✓ | ✓ | — |
| Export CSV / Logs | ✓ | ✓ | Logs only |
| Create user | ✓ | ✓ | — |
| Edit profile | ✓ | ✓ (collab/tester) | — |
| Change password | ✓ | ✓ (collab/tester) | — |
| Rename user | ✓ | ✓ (collab/tester) | — |
| Verify user | ✓ | ✓ (collab/tester) | — |
| Deactivate/reactivate | ✓ | ✓ (collab/tester) | — |
| Change roles | ✓ | — | — |
| Permanent delete | ✓ | — | — |
| Import points / Backup DB | ✓ | — | — |
| Dedup / Maintenance tools | ✓ | — | — |
| Founder star toggle | ✓ | — | — |
| "View as Admin" toggle | ✓ | — | — |
| Batch operations | ✓ (all) | ✓ (no delete) | — |

> When an **Admin** changes a password, renames, deactivates, or reactivates a user, all **Super Admins** receive an email notification via Resend. Super Admins performing the same actions do **not** trigger notifications.

> The `IMMUTABLE_USER` environment variable protects a specific user from role changes, deactivation, or deletion by anyone.

### Data Export

- **Leucaena Masks** — all polygons as GeoJSON (QGIS-compatible, including holes)
- **Grid Status** — cell geometries with workflow states and UF assignments
- **Occurrence Points** — all points with layer, validity, and provenance metadata
- **User Stats CSV** — usernames, mask counts, time online, login history

### Authentication

- **Google OAuth** — login with Google account (auto-link by email for existing users)
- **Email/password** — registration with email verification via Resend
- **Legacy login** — username/password continues working during migration period
- **Profile linking** — users can link their Google account from the profile page
- **Password reset** via email

### Internationalization

Full i18n support with automatic browser language detection:

- **Portugues** (default)
- **English**
- **Espanol**

### Announcements & Banners

- **Expansion banner** — announces the nationwide Brazil launch; auto-expires after a configurable date
- **Dismiss via `localStorage`** — once closed, the banner does not reappear for the same user (even without login)
- **Versioned banner key** — changing the key forces the banner to re-show for all users (useful for major announcements)
- **Landing page** and **map app** share consistent messaging about the platform's national scope

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
| **Email** | Resend (transactional emails) |
| **Auth** | Google OAuth 2.0 + local email/password |
| **Compression** | gzip via `compression` middleware |
| **IDs** | UUID v4 |
| **Hosting** | Render (with persistent disk) |

---

## Architecture

### Geographic model

```
Country (Brazil)
  └── State (UF) ─── grid_cell_states (junction, M:N)
        └── Grid Cell ─── polygons (masks)
              └── Occurrence Points
```

**Key design decisions:**

1. **No `states` table** — state metadata (names, regions, centers) lives in `UF_META` on the client. The server only knows about states through `grid_cell_states` rows. This keeps the backend lightweight and avoids duplicating geographic reference data.

2. **Junction table `grid_cell_states`** — each row links a `grid_cell_id` to a state code (e.g., `SP`, `MG`). Border cells have multiple rows, so they appear when filtering by either state.

3. **State outlines as static GeoJSON** — `public/data/brazil-states.geojson` is loaded once and rendered as a `google.maps.Data` layer. The selected state is highlighted; others are dimmed.

4. **Per-state grid loading** — the client requests `GET /api/grid?state=UF` and caches the result in memory. Switching states clears the map and loads from cache or server.

5. **Point and mask filtering** — when a state is selected, points outside loaded grid cell bounds are hidden, and masks not belonging to loaded cells are hidden.

### Frontend modules

| Module | Namespace | Responsibility |
|--------|-----------|----------------|
| `app.js` | `LeucenaApp` | Auth, sidebar, admin panel, state picker, modals, onboarding |
| `map.js` | `LeucenaMap` | Map init, grid rendering (Data Layer), points, clustering, state loading |
| `drawing.js` | `LeucenaDrawing` | Polygon creation/editing/holes/deletion, area labels, undo |
| `streetview.js` | `LeucenaStreetView` | Street View overlay and coverage layer |
| `collaboration.js` | `LeucenaCollab` | Socket.IO client, real-time cell/polygon/point sync |
| `export.js` | `LeucenaExport` | GeoJSON and CSV export handlers |
| `i18n.js` | `LeucenaI18n` | Internationalization (pt/en/es) |

### Real-time sync (Socket.IO)

Events broadcast to all connected clients:

| Event | Payload | Trigger |
|-------|---------|---------|
| `cell:locked` / `cell:unlocked` | cell ID, username | Lock/unlock a grid cell |
| `cell:statusChanged` | cell ID, new status | Status update (mapping → finished, etc.) |
| `polygon:created` / `polygon:updated` / `polygon:deleted` | polygon data | Mask CRUD |
| `point:created` / `point:deleted` / `point:validityChanged` | point data | Point CRUD |
| `inbox:new` | message preview | New inbox message |

---

## Project Structure

```
leucaena-earth-platform/
├── server.js              # Express server, API routes, Socket.IO, auth, email
├── db.js                  # SQLite schema, migrations, query helpers
├── create-admin.js        # CLI tool to create the first superadmin
├── package.json
├── .env.example           # Template for environment variables
├── data/
│   └── leucaena-earth.db  # SQLite database (auto-created)
├── seed-data/
│   ├── seed.js            # Initial database seeder (grid + points)
│   ├── grid-aoi.geojson   # Grid cells for São Paulo (area of interest)
│   └── leucaena-points.geojson  # Initial occurrence points
├── scripts/
│   ├── seed_brazil_grid.js          # Import grid cells from national GeoJSON
│   ├── delete_grid_cells_from_geojson.js  # Remove cells matching a GeoJSON
│   └── data/
│       ├── grid_id_mapping.json     # Hierarchical grid_id mapping
│       └── sp_multi_state_map.json  # SP border cells → neighboring states
├── plans/
│   └── brazil_expansion_platform.plan.md  # Implementation plan & session log
└── public/
    ├── index.html          # Main map application (map.leucaena.earth)
    ├── landing.html        # Landing page (leucaena.earth) — nationwide messaging
    ├── css/
    │   └── style.css       # Full application styles
    ├── data/
    │   └── brazil-states.geojson  # State outlines (IBGE simplified)
    ├── js/
    │   ├── app.js           # App shell: auth, sidebar, admin, state picker, modals
    │   ├── map.js           # Map init, grid (Data Layer), points, clustering
    │   ├── drawing.js       # Polygon tools, hole drawing, undo, area labels
    │   ├── collaboration.js # Real-time collaboration (Socket.IO client)
    │   ├── streetview.js    # Street View overlay and coverage layer
    │   ├── export.js        # Data export handlers
    │   └── i18n.js          # Internationalization (pt/en/es)
    └── img/                 # Logos, splash, partner/sponsor images
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
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `RESEND_API_KEY` | Yes | Resend API key for transactional emails |
| `RESEND_FROM` | No | Sender address for emails (default: `leucaena.earth <noreply@leucaena.earth>`) |
| `IMMUTABLE_USER` | No | Username protected from role changes, deactivation, and deletion |
| `GOOGLE_ANALYTICS_ID` | No | Google Analytics tracking ID (omit to disable) |
| `PORT` | No | Server port (default: 3000) |
| `DATA_PATH` | No | Directory for SQLite DB and backups (default: `./data`) |
| `NODE_ENV` | No | Set to `production` for HTTPS redirect and domain enforcement |
| `MAINTENANCE_MODE` | No | Set to `true` to show maintenance page |

### Seed the Grid

```bash
npm run seed
```

### Import Additional Grid Cells (other states)

```bash
node scripts/seed_brazil_grid.js path/to/grid.geojson
node scripts/seed_brazil_grid.js --dry-run path/to/grid.geojson  # preview only
```

The GeoJSON should contain features with properties `sub_4dd`, `sub_2dd`, `sub_1dd`, `sub_05dd` (for hierarchical grid ID construction) and `states` (semicolon-separated UF codes, e.g., `sp;mg`).

### Create the First Admin

```bash
node create-admin.js <username> <password> [email]
```

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
4. Add environment variables (see table above)
5. Set `NODE_ENV` = `production` and `DATA_PATH` = `/data`
6. Attach a **Persistent Disk** mounted at `/data`
7. Configure custom domain: `map.leucaena.earth`

---

## Database

The platform uses **SQLite** (via sql.js compiled to WebAssembly) with automatic schema migrations on startup.

### Tables

| Table | Purpose |
|-------|---------|
| `grid_cells` | Territory grid with status, lock info, geometry, hierarchical `grid_id` |
| `grid_cell_states` | Junction table: links each cell to one or more states (UF). PK: `(grid_cell_id, state)` |
| `polygons` | Mask polygons (GeoJSON) drawn by users, with `area_ha` and creator info |
| `occurrence_points` | Species occurrence data with layer, status, `added_by`, `added_by_role` |
| `users` | Accounts, roles, profiles, Google OAuth, activity stats |
| `messages` | Inbox messages with threading (`reply_to`), images, reply permissions |
| `message_reads` | Per-user read tracking for messages |
| `activity_logs` | Timestamped audit trail of all actions |
| `site_stats` | View counter and global metrics |

### State model (geographic expansion)

The platform does **not** use a `states` table. Instead:

- **`grid_cell_states`** — server-side junction table mapping `grid_cell_id` → `state` (two-letter UF code). Supports multi-state cells (border regions). Used by `GET /api/grid?state=UF` to filter cells and `GET /api/states` to list states with cell counts.
- **`UF_META`** — client-side JavaScript object in `app.js` with all 27 Brazilian states + DF: full name and region. Used to render the state picker UI. Not stored in the database.

This design is intentional: adding states from another country would only require updating `UF_META` on the client and importing grid cells with the appropriate state codes via `seed_brazil_grid.js`.

### Occurrence point provenance

Every point created through the platform records:

| Column | Description |
|--------|-------------|
| `added_by` | Username of the person who added the point |
| `added_by_role` | Effective role at the time of creation (`superadmin`, `admin`, `team`, `contributor`) |

Points imported from external datasets (iNaturalist, GBIF, etc.) or legacy data may have `NULL` values for these fields.

---

## API Overview

The server exposes RESTful endpoints organized by domain:

### Authentication
- `GET /auth/google` — initiate Google OAuth flow
- `GET /auth/google/callback` — OAuth callback
- `POST /api/auth/register` — email/password registration with Resend verification
- `POST /api/auth/login` — login (username or email + password)
- `POST /api/auth/forgot-password` / `POST /api/auth/reset-password` — password reset

### States & Grid
- `GET /api/states` — `{ states: [...], totals: {...} }` — per-state cell counts, finished/mapping/tomap breakdown, polygon count + area, plus de-duplicated Brazil-wide totals (border cells/polygons aren't double-counted)
- `GET /api/grid` — all cells (or `?state=UF` for a single state)

### Polygons (Masks)
- `GET /api/polygons` — all masks (or `?grid_cell_id=` for a single cell)
- `POST /api/polygons` — create mask
- `PUT /api/polygons/:id` — update geometry
- `DELETE /api/polygons/:id` — delete mask

### Occurrence Points
- `GET /api/points` — all points with layer, status, `added_by`, `added_by_role`
- `POST /api/points` — add point (all verified users; records `added_by`/`added_by_role`)
- `PUT /api/points/:id/validity` — cycle validity status
- `DELETE /api/points/:id` — remove point (collaborators can only delete their own)

### Messaging
- `GET /api/messages` — user's messages
- `POST /api/messages` — send message (user → superadmins)
- `POST /api/admin/messages` — admin broadcast or direct message
- `PUT /api/messages/:id/read` — mark as read
- `GET /api/messages/unread-count` — badge count

### Export
- `GET /api/export/geojson` — masks as GeoJSON
- `GET /api/export/grid-status` — grid cells with status and states
- `GET /api/export/points` — points as GeoJSON

### Admin
- `GET /api/admin/users` — user list with stats
- `POST /api/admin/points/import` — batch GeoJSON import
- `POST /api/admin/points/duplicates/remove` — deduplicate points
- `GET /api/admin/db-info` — database diagnostics
- `GET /api/admin/backup` — download SQLite backup

### Stats
- `GET /api/landing-stats` — public stats for the landing page
- `GET /api/ranking` — user ranking by contribution
- `POST /api/stats/view` — register page view

Real-time events are broadcast via Socket.IO for live map updates across all connected clients (see Architecture section).

---

## Scripts

| Script | Usage | Description |
|--------|-------|-------------|
| `seed-data/seed.js` | `npm run seed` | Initial seed: imports grid cells and points from GeoJSON files |
| `scripts/seed_brazil_grid.js` | `node scripts/seed_brazil_grid.js <geojson>` | Import new grid cells from a national GeoJSON, filling `grid_cell_states` |
| `scripts/delete_grid_cells_from_geojson.js` | `node scripts/delete_grid_cells_from_geojson.js <geojson>` | Remove grid cells matching features in a GeoJSON |
| `create-admin.js` | `node create-admin.js <user> <pass> [email]` | Create the first superadmin account |

---

## License

This project is developed for academic and conservation research purposes.

---

<p align="center">
  <sub>Built with dedication for biodiversity conservation — now mapping all of Brazil 🇧🇷</sub><br>
  <a href="https://leucaena.earth">leucaena.earth</a> · Funded by FAPESP · ESALQ/USP
</p>

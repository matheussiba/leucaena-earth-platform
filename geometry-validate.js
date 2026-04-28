/**
 * Server-side geometry validation for GeoJSON Polygon objects.
 *
 * Keeps zero extra dependencies — uses the same Shoelace / geodesic helpers
 * that `polygonAreaHa` in server.js already relies on.
 *
 * Configurable limits via env vars:
 *   POLYGON_MIN_AREA_M2  (default: 20 m² — filters accidental single-click slivers)
 *   POLYGON_MAX_AREA_HA  (default: 80 ha — upper bound for a single mask; 1 ha = 10 000 m²)
 *   POLYGON_MAX_AREA_M2  (deprecated — used only if POLYGON_MAX_AREA_HA is unset, for old deploys)
 */

const MIN_AREA_M2 = parseFloat(process.env.POLYGON_MIN_AREA_M2 || '20');

const HA_TO_M2 = 10000;

/** Resolve max polygon net area in m²; prefer HA env, fall back to legacy M². */
function _resolveMaxAreaM2AndHa() {
  const haRaw = process.env.POLYGON_MAX_AREA_HA;
  if (haRaw != null && String(haRaw).trim() !== '') {
    const ha = parseFloat(haRaw);
    if (Number.isFinite(ha) && ha > 0) {
      return { maxAreaM2: ha * HA_TO_M2, maxAreaHa: ha };
    }
  }
  const m2Legacy = process.env.POLYGON_MAX_AREA_M2;
  if (m2Legacy != null && String(m2Legacy).trim() !== '') {
    const m2 = parseFloat(m2Legacy);
    if (Number.isFinite(m2) && m2 > 0) {
      return { maxAreaM2: m2, maxAreaHa: m2 / HA_TO_M2 };
    }
  }
  const defaultHa = 80;
  return { maxAreaM2: defaultHa * HA_TO_M2, maxAreaHa: defaultHa };
}

const { maxAreaM2: MAX_AREA_M2, maxAreaHa: MAX_AREA_HA } = _resolveMaxAreaM2AndHa();

// ── Shoelace area (spherical approximation, matches polygonAreaHa in server.js) ──

const RAD = Math.PI / 180;
function ringAreaM2(ring) {
  const n = ring.length;
  if (n < 4) return 0;
  const R = 6371008.8;
  let area = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [x1, y1] = ring[j];
    const [x2, y2] = ring[i];
    area += (x2 - x1) * RAD * (2 + Math.sin(y1 * RAD) + Math.sin(y2 * RAD));
  }
  return Math.abs(area * R * R / 2);
}

function polygonAreaHa(geometry) {
  if (!geometry || !geometry.coordinates) return 0;
  const coords = geometry.coordinates;
  let area = ringAreaM2(coords[0]);
  for (let i = 1; i < coords.length; i++) area -= ringAreaM2(coords[i]);
  return Math.max(0, area) / 10000;
}

// ── Segment intersection (2D, ignoring shared endpoints) ──

function _cross(o, a, b) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function _segmentsIntersect(p1, p2, p3, p4) {
  const d1 = _cross(p3, p4, p1);
  const d2 = _cross(p3, p4, p2);
  const d3 = _cross(p1, p2, p3);
  const d4 = _cross(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return false;
}

function _ringHasSelfIntersection(ring) {
  const n = ring.length - 1; // last coord == first coord for closed rings
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 2; j < n; j++) {
      // Skip adjacent segments and the wrap-around pair (0, n-1) which share a vertex
      if (i === 0 && j === n - 1) continue;
      if (_segmentsIntersect(ring[i], ring[i + 1], ring[j], ring[j + 1])) {
        return true;
      }
    }
  }
  return false;
}

// ── Duplicate consecutive vertex removal (returns cleaned ring) ──

function _removeDuplicateCoords(ring) {
  if (!Array.isArray(ring) || ring.length < 2) return ring;
  const out = [ring[0]];
  for (let i = 1; i < ring.length; i++) {
    const prev = out[out.length - 1];
    const cur  = ring[i];
    if (cur[0] !== prev[0] || cur[1] !== prev[1]) out.push(cur);
  }
  return out;
}

// ── Public API ──

/**
 * Validate and (optionally) auto-clean a GeoJSON Polygon geometry.
 *
 * Returns: { ok: true, geometry: <cleanedGeometry> }
 *       or { ok: false, error: '<human-readable message>' }
 *
 * The returned `geometry` always has duplicate consecutive coords removed;
 * if the caller passes `autoFix: false` the raw geometry is returned unchanged.
 */
function validatePolygonGeometry(geometry, { autoFix = true } = {}) {
  if (!geometry || typeof geometry !== 'object') {
    return { ok: false, error: 'Geometria ausente ou inválida.' };
  }
  if (geometry.type !== 'Polygon') {
    return { ok: false, error: `Tipo de geometria inválido: "${geometry.type}". Esperado "Polygon".` };
  }
  if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
    return { ok: false, error: 'Polígono sem coordenadas.' };
  }

  let coords = geometry.coordinates.map(ring => Array.isArray(ring) ? [...ring] : ring);

  if (!Array.isArray(coords[0]) || coords[0].length < 3) {
    return { ok: false, error: 'O anel externo do polígono precisa ter pelo menos 3 vértices distintos.' };
  }

  // Auto-remove duplicate consecutive coords and auto-close rings (last == first).
  // This MUST run before vertex-count checks so a 3-coord open ring can be auto-fixed.
  if (autoFix) {
    coords = coords.map(ring => {
      let r = _removeDuplicateCoords(ring);
      if (r.length >= 2 && (r[r.length - 1][0] !== r[0][0] || r[r.length - 1][1] !== r[0][1])) {
        r = [...r, r[0]];
      }
      return r;
    });
  }

  const outer = coords[0];
  const last  = outer[outer.length - 1];
  const first = outer[0];
  if (last[0] !== first[0] || last[1] !== first[1]) {
    return { ok: false, error: 'O anel externo do polígono não está fechado (primeiro e último vértice devem ser iguais).' };
  }

  // Check minimum unique vertices (ring has first==last so subtract 1)
  const uniqueVertices = outer.length - 1;
  if (uniqueVertices < 3) {
    return { ok: false, error: `Polígono deve ter pelo menos 3 vértices distintos (encontrado: ${uniqueVertices}).` };
  }

  // ── Self-intersection check (BEFORE area, otherwise bow-ties are reported as "too small") ──
  // Skip for rings with many vertices (>200) — the O(n²) check would be slow.
  // At that resolution a self-intersection is also unlikely to be accidental.
  for (let ri = 0; ri < coords.length; ri++) {
    const ring = coords[ri];
    if (ring.length <= 200 && _ringHasSelfIntersection(ring)) {
      const label = ri === 0 ? 'anel externo' : `anel interno ${ri}`;
      return { ok: false, error: `Polígono auto-intersectante no ${label}. Redesenhe a forma evitando cruzamentos.` };
    }
  }

  // ── Area check (outer ring only, then net area) ──
  const areaM2 = ringAreaM2(outer);
  if (areaM2 < MIN_AREA_M2) {
    return { ok: false, error: `Polígono muito pequeno (área ≈ ${Math.round(areaM2)} m²; mínimo: ${MIN_AREA_M2} m²). Verifique se o desenho está correto.` };
  }

  let netAreaM2 = areaM2;
  for (let i = 1; i < coords.length; i++) netAreaM2 -= ringAreaM2(coords[i]);
  netAreaM2 = Math.max(0, netAreaM2);

  if (netAreaM2 > MAX_AREA_M2) {
    const maxM2Rounded = Math.round(MAX_AREA_M2);
    const maxHaStr = Number.isInteger(MAX_AREA_HA) ? String(MAX_AREA_HA) : MAX_AREA_HA.toFixed(2).replace(/\.?0+$/, '');
    return {
      ok: false,
      error: `Polígono muito grande (área ≈ ${Math.round(netAreaM2).toLocaleString()} m² ≈ ${(netAreaM2 / HA_TO_M2).toFixed(2)} ha; máximo permitido: ${maxHaStr} ha ≈ ${maxM2Rounded.toLocaleString()} m²). Verifique se o desenho está correto.`
    };
  }

  const cleanedGeometry = { ...geometry, coordinates: coords };
  return { ok: true, geometry: cleanedGeometry, area_ha: netAreaM2 / 10000 };
}

module.exports = { validatePolygonGeometry };

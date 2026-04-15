// IIFE module: polygon draw/edit/delete tools and a central mode state machine.
window.LeucenaDrawing = (function () {
  // Ray-casting point-in-ring test (matches server-side pointInPolygon)
  function pointInRing(lng, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  let drawingManager = null;
  let activeMode = 'select';
  const drawnPolygons = {}; // keyed by polygon UUID
  const polyBounds = {}; // LatLngBounds per id for viewport culling
  let holeTargetId = null;

  const deleteUndoStack = [];
  const editUndoStack = [];
  let manualDrawState = null;
  let manualHoleState = null;
  let _areaLabelsVisible = false;
  // Tool flags: _pendingToolSwitch = target mode while safety modal open; _suppressDrawRestart skips draw auto-restart after completeManualDraw when switching tools.
  let _editModified = false;
  let _pendingToolSwitch = null;
  let _suppressDrawRestart = false;
  let _pendingDeleteId = null;
  let _lastMouseLatLng = null;

  const POLY_STYLE_MEMBER = {
    strokeColor: '#84cc16',
    strokeOpacity: 0.9,
    strokeWeight: 2.5,
    fillColor: '#84cc16',
    fillOpacity: 0.10
  };

  const POLY_STYLE_CONTRIBUTOR = {
    strokeColor: '#f97316',
    strokeOpacity: 0.9,
    strokeWeight: 2.5,
    fillColor: '#f97316',
    fillOpacity: 0.10
  };

  // Client-side geodesic area (mirrors server) for labels and consistency checks.
  function ringAreaM2(ring) {
    const toRad = Math.PI / 180, R = 6371000;
    let area = 0;
    for (let i = 0, len = ring.length; i < len; i++) {
      const [lng1, lat1] = ring[i];
      const [lng2, lat2] = ring[(i + 1) % len];
      area += (lng2 - lng1) * toRad * (2 + Math.sin(lat1 * toRad) + Math.sin(lat2 * toRad));
    }
    return Math.abs(area * R * R / 2);
  }

  function calcAreaHa(geometry) {
    if (!geometry || !geometry.coordinates) return 0;
    const coords = geometry.coordinates;
    let area = ringAreaM2(coords[0]);
    for (let i = 1; i < coords.length; i++) area -= ringAreaM2(coords[i]);
    return Math.max(0, area) / 10000;
  }

  function formatAreaLabel(ha) {
    if (ha < 0.1) {
      const m2 = Math.round(ha * 10000);
      return m2.toLocaleString() + ' m²';
    }
    return ha.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' ha';
  }

  // Custom OverlayView for area text at centroid; lazy class factory until google.maps exists.
  let _AreaLabelOverlay = null;

  function getAreaLabelOverlayClass() {
    if (_AreaLabelOverlay) return _AreaLabelOverlay;
    _AreaLabelOverlay = class extends google.maps.OverlayView {
      constructor(position, text, map) {
        super();
        this._position = position;
        this._text = text;
        this._div = null;
        this.setMap(map);
      }

      onAdd() {
        const div = document.createElement('div');
        div.className = 'poly-area-label';
        div.textContent = this._text;
        this._div = div;
        this.getPanes().overlayLayer.appendChild(div);
      }

      draw() {
        if (!this._div) return;
        const proj = this.getProjection();
        if (!proj) return;
        const pos = proj.fromLatLngToDivPixel(this._position);
        if (!pos) return;
        this._div.style.left = pos.x + 'px';
        this._div.style.top = pos.y + 'px';
      }

      onRemove() {
        if (this._div && this._div.parentNode) {
          this._div.parentNode.removeChild(this._div);
        }
        this._div = null;
      }

      updatePosition(latLng) {
        this._position = latLng;
        this.draw();
      }

      updateText(text) {
        this._text = text;
        if (this._div) this._div.textContent = text;
      }

      setVisible(visible) {
        if (this._div) this._div.style.display = visible ? '' : 'none';
      }
    };
    return _AreaLabelOverlay;
  }

  function polygonCentroid(geometry) {
    const ring = geometry.coordinates[0];
    let sumLat = 0, sumLng = 0;
    const n = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring.length - 1 : ring.length;
    for (let i = 0; i < n; i++) {
      sumLng += ring[i][0];
      sumLat += ring[i][1];
    }
    return new google.maps.LatLng(sumLat / n, sumLng / n);
  }

  function createAreaLabel(geometry, areaHa, map) {
    const center = polygonCentroid(geometry);
    const text = formatAreaLabel(areaHa);
    const Cls = getAreaLabelOverlayClass();
    return new Cls(center, text, map);
  }

  const HOLE_HIGHLIGHT = {
    strokeColor: '#f59e0b',
    strokeWeight: 3.5,
    fillColor: '#f59e0b',
    fillOpacity: 0.15
  };

  let showMemberMasks = true;
  let showContributorMasks = true;

  function isMemberRole(role) {
    return role === 'admin' || role === 'team';
  }

  // Team/admin = green, contributor = orange; mask toggles + styles differ only for team+ viewers.
  function getPolyStyle(creatorRole) {
    const viewerRole = typeof LeucenaApp !== 'undefined' ? LeucenaApp.getUserRole() : null;
    if (!viewerRole || viewerRole === 'contributor') return POLY_STYLE_MEMBER;
    return isMemberRole(creatorRole) ? POLY_STYLE_MEMBER : POLY_STYLE_CONTRIBUTOR;
  }

  function shouldShowPoly(creatorRole) {
    const viewerRole = typeof LeucenaApp !== 'undefined' ? LeucenaApp.getUserRole() : null;
    if (!viewerRole || viewerRole === 'contributor') return true;
    return isMemberRole(creatorRole) ? showMemberMasks : showContributorMasks;
  }

  function init() {
    loadAllPolygons();
    setupToolbar();
    setupUndoHandler();
    const map = typeof LeucenaMap !== 'undefined' ? LeucenaMap.getMap() : null;
    if (map) {
      map.addListener('mousemove', (e) => { _lastMouseLatLng = e.latLng; });

      // DOM-level fallback: Google Maps mousemove can miss events when overlays
      // intercept them. An OverlayView projection converts pixel → lat/lng reliably.
      const projOverlay = new google.maps.OverlayView();
      projOverlay.onAdd = projOverlay.draw = projOverlay.onRemove = function () {};
      projOverlay.setMap(map);
      map.getDiv().addEventListener('mousemove', (e) => {
        try {
          const proj = projOverlay.getProjection();
          if (!proj) return;
          const rect = map.getDiv().getBoundingClientRect();
          _lastMouseLatLng = proj.fromContainerPixelToLatLng(
            new google.maps.Point(e.clientX - rect.left, e.clientY - rect.top)
          );
        } catch (_) { /* projection not ready yet */ }
      });
    }
  }

  function isInputFocused() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  function setupUndoHandler() {
    document.addEventListener('keydown', (e) => {
      if (isInputFocused()) return;

      const cellLocked = typeof LeucenaApp !== 'undefined' && LeucenaApp.isEditing && LeucenaApp.isEditing();

      if (cellLocked && typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
        LeucenaApp.logEvent('keypress', LeucenaApp.getSelectedCellId(), null, { key: e.key, shift: e.shiftKey, ctrl: e.ctrlKey, mode: activeMode });
      }

      if (e.shiftKey && (e.key === 'C' || e.key === 'c') && cellLocked) {
        e.preventDefault();
        if (activeMode === 'draw') {
          if (isPolygonInProgress()) {
            _pendingToolSwitch = 'select';
            document.getElementById('tool-switch-modal').classList.remove('hidden');
          } else {
            setMode('select');
          }
        } else {
          requestToolSwitch('draw');
        }
        return;
      }

      if (e.shiftKey && (e.key === 'E' || e.key === 'e') && cellLocked) {
        e.preventDefault();
        if (activeMode === 'edit') {
          setMode('select');
        } else {
          requestToolSwitch('edit');
        }
        return;
      }

      if (e.shiftKey && (e.key === 'D' || e.key === 'd') && cellLocked) {
        e.preventDefault();
        if (activeMode === 'delete') {
          setMode('select');
        } else {
          requestToolSwitch('delete');
        }
        return;
      }

      if (e.shiftKey && (e.key === 'H' || e.key === 'h') && cellLocked) {
        e.preventDefault();
        if (activeMode === 'hole') {
          setMode('select');
        } else {
          requestToolSwitch('hole');
        }
        return;
      }

      if (e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        const svBtn = document.getElementById('tool-streetview');
        if (svBtn && !svBtn.disabled) svBtn.click();
        return;
      }

      if ((e.key === 'v' || e.key === 'V') && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (activeMode === 'draw' && manualDrawState && _lastMouseLatLng) {
          e.preventDefault();
          manualDrawState.addVertex(_lastMouseLatLng);
          if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
            LeucenaApp.logEvent('hotkey_vertex', LeucenaApp.getSelectedCellId(), null, { lat: _lastMouseLatLng.lat(), lng: _lastMouseLatLng.lng(), count: manualDrawState.vertices.length });
          }
          _syncToolbarExtras();
          return;
        }
        if (activeMode === 'hole') {
          e.preventDefault();
          if (manualHoleState && _lastMouseLatLng) {
            manualHoleState.addVertex(_lastMouseLatLng);
            const _map = typeof LeucenaMap !== 'undefined' ? LeucenaMap.getMap() : null;
            if (_map) _forceCrosshair(_map);
            if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
              LeucenaApp.logEvent('hotkey_hole_vertex', LeucenaApp.getSelectedCellId(), manualHoleState.targetId, { lat: _lastMouseLatLng.lat(), lng: _lastMouseLatLng.lng(), count: manualHoleState.vertices.length });
            }
            _syncToolbarExtras();
          } else {
            LeucenaApp.showToast(LeucenaI18n.t('toast.holeSelectMask'), 'info');
            if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
              LeucenaApp.logEvent('hotkey_v_no_target', LeucenaApp.getSelectedCellId(), null, { mode: activeMode });
            }
          }
          return;
        }
        if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent && cellLocked) {
          LeucenaApp.logEvent('hotkey_v_ignored', LeucenaApp.getSelectedCellId(), null, { mode: activeMode, hasDrawState: !!manualDrawState, hasHoleState: !!manualHoleState, hasMousePos: !!_lastMouseLatLng });
        }
        return;
      }

      if (e.key === 'Enter') {
        const deleteModal = document.getElementById('delete-warn-modal');
        if (deleteModal && !deleteModal.classList.contains('hidden')) {
          e.preventDefault();
          document.getElementById('delete-warn-ok').click();
          return;
        }
        if (activeMode === 'draw' && manualDrawState) {
          e.preventDefault();
          if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
            LeucenaApp.logEvent('hotkey_finish_draw', LeucenaApp.getSelectedCellId(), null, { vertices: manualDrawState.vertices.length });
          }
          completeManualDraw();
          return;
        }
        if (activeMode === 'hole' && manualHoleState) {
          e.preventDefault();
          completeManualHole();
          return;
        }
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && activeMode === 'delete' && _pendingDeleteId) {
        e.preventDefault();
        if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
          LeucenaApp.logEvent('hotkey_confirm_delete', LeucenaApp.getSelectedCellId(), _pendingDeleteId, null);
        }
        const id = _pendingDeleteId;
        clearPendingDelete();
        deletePolygon(id);
        return;
      }

      if (e.key === 'Escape' && activeMode === 'hole' && manualHoleState) {
        e.preventDefault();
        cleanupManualHole();
        clearHoleTarget();
        setMode('select');
        return;
      }

      if (e.key === 'Escape' && activeMode === 'delete' && _pendingDeleteId) {
        e.preventDefault();
        if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
          LeucenaApp.logEvent('hotkey_cancel_delete', LeucenaApp.getSelectedCellId(), _pendingDeleteId, null);
        }
        clearPendingDelete();
        return;
      }

      if (!(e.key === 'z' && (e.ctrlKey || e.metaKey))) return;

      if (activeMode === 'draw' && manualDrawState) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
          LeucenaApp.logEvent('hotkey_undo_vertex', LeucenaApp.getSelectedCellId(), null, { remaining: manualDrawState.vertices.length - 1 });
        }
        undoDrawVertex();
      } else if (activeMode === 'hole' && manualHoleState) {
        e.preventDefault();
        e.stopPropagation();
        manualHoleState.removeLastVertex();
        _syncToolbarExtras();
      } else if (activeMode === 'delete' && deleteUndoStack.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        undoDeletePolygon();
      } else if (activeMode === 'edit' && editUndoStack.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        undoEditPolygon();
      }
    });
  }

  async function loadAllPolygons() {
    try {
      const res = await fetch('/api/polygons');
      const fc = await res.json();
      for (const feature of fc.features) {
        renderPolygon(feature.properties.id, feature.geometry, feature.properties, false);
      }
      if (typeof LeucenaMap !== 'undefined' && LeucenaMap.updateFilterCounts) LeucenaMap.updateFilterCounts();
    } catch (e) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.polyLoadFail'), 'error');
    }
  }

  function geojsonRingsToPaths(coordinates) {
    return coordinates.map(ring => {
      const len = ring.length;
      const isClosed = len > 1 && ring[0][0] === ring[len - 1][0] && ring[0][1] === ring[len - 1][1];
      const pts = isClosed ? ring.slice(0, -1) : ring;
      return pts.map(c => ({ lat: c[1], lng: c[0] }));
    });
  }

  function pathsToGeoJSONCoords(gmapsPoly) {
    const paths = gmapsPoly.getPaths();
    const coordinates = [];
    for (let i = 0; i < paths.getLength(); i++) {
      const ring = [];
      paths.getAt(i).forEach(p => ring.push([p.lng(), p.lat()]));
      if (ring.length > 0) {
        ring.push(ring[0]);
      }
      coordinates.push(ring);
    }
    return coordinates;
  }

  function renderPolygon(id, geometry, props, editable) { // Polygon + bounds for culling; click routes delete/edit/hole by activeMode
    if (drawnPolygons[id]) {
      drawnPolygons[id].gmapsPoly.setMap(null);
      if (drawnPolygons[id].areaLabel) drawnPolygons[id].areaLabel.setMap(null);
    }

    const map = LeucenaMap.getMap();
    const paths = geojsonRingsToPaths(geometry.coordinates);
    const creatorRole = props.created_by_role || 'contributor';
    const style = getPolyStyle(creatorRole);
    const currentState = typeof LeucenaMap.getCurrentState === 'function' ? LeucenaMap.getCurrentState() : null;
    const visible = currentState && LeucenaMap.getShowPolygons() && shouldShowPoly(creatorRole);

    const poly = new google.maps.Polygon({
      paths: paths,
      ...style,
      editable: editable,
      draggable: false,
      map: visible ? map : null,
      zIndex: 10
    });

    // Clickable polygons capture mousemove from the map; keep _lastMouseLatLng in sync
    poly.addListener('mousemove', (e) => { _lastMouseLatLng = e.latLng; });
    poly.addListener('click', () => {
      if (activeMode === 'delete') {
        selectForDeletion(id);
      } else if (activeMode === 'edit') {
        toggleEditPolygon(id);
      } else if (activeMode === 'hole') {
        selectHoleTarget(id);
      }
    });

    if (editable) {
      attachPathListeners(id, poly);
    }

    const bnds = new google.maps.LatLngBounds();
    for (const coord of geometry.coordinates[0]) {
      bnds.extend({ lat: coord[1], lng: coord[0] });
    }
    polyBounds[id] = bnds;

    const viewport = map ? map.getBounds() : null;
    const inView = !viewport || viewport.intersects(bnds);
    const show = visible && inView;

    if (!show) poly.setMap(null);

    const areaHa = props.area_ha != null ? props.area_ha : calcAreaHa(geometry);
    const showLabel = show && _areaLabelsVisible;
    const areaLabel = createAreaLabel(geometry, areaHa, showLabel ? map : null);
    drawnPolygons[id] = { gmapsPoly: poly, areaLabel, data: { id, ...props, geometry } };
  }

  const pathListenerMap = {};
  let editUndoGuard = false;

  function attachPathListeners(id, poly) { // Undo snapshot on first change per gesture; debounced PUT after 150ms idle
    detachPathListeners(id);
    let gestureTimer = null;
    const gmapListeners = [];

    const onPathChange = () => {
      if (editUndoGuard) return;
      _editModified = true;
      if (gestureTimer === null) {
        const entry = drawnPolygons[id];
        if (entry && entry._lastGeometry) {
          editUndoStack.push({ id, geometry: JSON.parse(JSON.stringify(entry._lastGeometry)) });
        }
      }
      const entry = drawnPolygons[id];
      if (entry && entry.areaLabel) {
        const geom = { type: 'Polygon', coordinates: pathsToGeoJSONCoords(poly) };
        entry.areaLabel.updateText(formatAreaLabel(calcAreaHa(geom)));
        entry.areaLabel.updatePosition(polygonCentroid(geom));
      }
      clearTimeout(gestureTimer);
      gestureTimer = setTimeout(() => {
        gestureTimer = null;
        if (editUndoGuard) return;
        savePolygonGeometry(id, poly);
        const e = drawnPolygons[id];
        if (e) {
          e._lastGeometry = { type: 'Polygon', coordinates: pathsToGeoJSONCoords(poly) };
        }
      }, 150);
    };

    const paths = poly.getPaths();
    for (let i = 0; i < paths.getLength(); i++) {
      gmapListeners.push(google.maps.event.addListener(paths.getAt(i), 'set_at', onPathChange));
      gmapListeners.push(google.maps.event.addListener(paths.getAt(i), 'insert_at', onPathChange));
    }
    pathListenerMap[id] = { gmapListeners, gestureTimerRef: () => gestureTimer, clearGesture: () => { clearTimeout(gestureTimer); gestureTimer = null; } };
  }

  function detachPathListeners(id) {
    const data = pathListenerMap[id];
    if (!data) return;
    data.gmapListeners.forEach(l => google.maps.event.removeListener(l));
    data.clearGesture();
    delete pathListenerMap[id];
  }

  function isPolygonInProgress() {
    return activeMode === 'draw' && manualDrawState && manualDrawState.vertices.length > 0;
  }

  function requestToolSwitch(targetMode) { // in-progress polygon opens safety modal instead of discarding work
    if (isPolygonInProgress()) {
      _pendingToolSwitch = targetMode;
      document.getElementById('tool-switch-modal').classList.remove('hidden');
      return;
    }
    if (targetMode === 'delete') {
      showDeleteWarningModal();
    } else {
      setMode(targetMode);
    }
  }

  function setupToolbar() {
    const selectBtn = document.getElementById('tool-select');
    if (selectBtn) {
      selectBtn.addEventListener('click', () => {
        if (activeMode === 'select') return;
        requestToolSwitch('select');
      });
    }
    document.getElementById('tool-draw').addEventListener('click', () => {
      if (activeMode === 'draw') { setMode('select'); return; }
      requestToolSwitch('draw');
    });
    document.getElementById('tool-edit').addEventListener('click', () => {
      if (activeMode === 'edit') { setMode('select'); return; }
      requestToolSwitch('edit');
    });
    document.getElementById('tool-delete').addEventListener('click', () => {
      if (activeMode === 'delete') { setMode('select'); return; }
      requestToolSwitch('delete');
    });
    document.getElementById('tool-hole').addEventListener('click', () => {
      if (activeMode === 'hole') { setMode('select'); return; }
      requestToolSwitch('hole');
    });

    document.getElementById('delete-warn-ok').addEventListener('click', () => {
      document.getElementById('delete-warn-modal').classList.add('hidden');
      setMode('delete');
    });
    document.getElementById('delete-warn-cancel').addEventListener('click', () => {
      document.getElementById('delete-warn-modal').classList.add('hidden');
    });

    document.getElementById('tool-switch-cancel-draw').addEventListener('click', () => {
      const target = _pendingToolSwitch;
      _pendingToolSwitch = null;
      document.getElementById('tool-switch-modal').classList.add('hidden');
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
        LeucenaApp.logEvent('tool_switch_cancel_draw', LeucenaApp.getSelectedCellId(), null, { target });
      }
      cleanupManualDraw();
      if (target === 'delete') {
        showDeleteWarningModal();
      } else {
        setMode(target || 'select');
      }
    });
    document.getElementById('tool-switch-finish-draw').addEventListener('click', () => {
      const target = _pendingToolSwitch;
      _pendingToolSwitch = null;
      document.getElementById('tool-switch-modal').classList.add('hidden');
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
        LeucenaApp.logEvent('tool_switch_finish_draw', LeucenaApp.getSelectedCellId(), null, { target });
      }
      _suppressDrawRestart = true;
      completeManualDraw().then(() => {
        _suppressDrawRestart = false;
        if (target === 'delete') {
          showDeleteWarningModal();
        } else {
          setMode(target || 'select');
        }
      });
    });
    document.getElementById('tool-switch-continue').addEventListener('click', () => {
      _pendingToolSwitch = null;
      document.getElementById('tool-switch-modal').classList.add('hidden');
    });

    document.getElementById('tool-undo').addEventListener('click', () => {
      if (activeMode === 'draw' && manualDrawState) {
        if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
          LeucenaApp.logEvent('touch_undo_vertex', LeucenaApp.getSelectedCellId(), null, { remaining: manualDrawState.vertices.length - 1 });
        }
        undoDrawVertex();
      } else if (activeMode === 'hole' && manualHoleState) {
        manualHoleState.removeLastVertex();
      } else if (activeMode === 'delete' && deleteUndoStack.length > 0) {
        undoDeletePolygon();
      } else if (activeMode === 'edit' && editUndoStack.length > 0) {
        undoEditPolygon();
      }
      _syncToolbarExtras();
    });

    document.getElementById('tool-finish-draw').addEventListener('click', () => {
      if (activeMode === 'draw' && manualDrawState) {
        if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
          LeucenaApp.logEvent('touch_finish_draw', LeucenaApp.getSelectedCellId(), null, { vertices: manualDrawState.vertices.length });
        }
        completeManualDraw();
      } else if (activeMode === 'hole' && manualHoleState) {
        completeManualHole();
      }
    });
  }

  function showDeleteWarningModal() {
    document.getElementById('delete-warn-modal').classList.remove('hidden');
  }

  function setMode(mode) { // mode transition: clear stacks/edit state, cursor, then draw|edit|hole setup
    const prevMode = activeMode;
    activeMode = mode;

    if (prevMode !== mode && typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
      LeucenaApp.logEvent('tool_switch', LeucenaApp.getSelectedCellId(), null, { from: prevMode, to: mode });
    }

    var activityMap = { draw: 'drawing', delete: 'deleting_poly', edit: 'editing_poly', hole: 'drawing_hole' };
    if (typeof LeucenaCollab !== 'undefined' && LeucenaCollab.notifyActivity) {
      LeucenaCollab.notifyActivity(activityMap[mode] || null);
    }

    if (typeof LeucenaMap !== 'undefined' && LeucenaMap.deselectPoint) {
      LeucenaMap.deselectPoint();
    }

    deleteUndoStack.length = 0;
    editUndoStack.length = 0;
    _editModified = false;
    clearPendingDelete();
    cleanupManualDraw();
    cleanupManualHole();
    updateToolBadge(mode);

    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.edit-tool-btn').forEach(b => b.classList.remove('active'));

    const btnMap = { select: 'tool-select', draw: 'tool-draw', edit: 'tool-edit', delete: 'tool-delete', hole: 'tool-hole' };
    const activeBtn = document.getElementById(btnMap[mode]);
    if (activeBtn) activeBtn.classList.add('active');

    if (LeucenaStreetView.isActive()) {
      document.getElementById('tool-streetview').classList.add('active');
    }

    if (drawingManager) {
      drawingManager.setMap(null);
      drawingManager = null;
    }

    clearHoleTarget();
    makeAllNonEditable();

    const map = typeof LeucenaMap !== 'undefined' ? LeucenaMap.getMap() : null;
    if (mode === 'draw') {
      startDrawing();
      if (map) _forceCrosshair(map);
    } else {
      if (map) _clearCrosshair(map);
      if (mode === 'edit') {
        makeAllEditableInCell();
      } else if (mode === 'hole') {
        LeucenaMap.setGridClickable(false);
        LeucenaApp.showToast(LeucenaI18n.t('toast.holeSelectMask'), 'info');
      }
    }
    _syncToolbarExtras();
  }

  function makeAllEditableInCell() {
    const cellId = LeucenaApp.getSelectedCellId();
    const cellData = LeucenaApp.getSelectedCellData();
    const username = LeucenaApp.getUsername();
    if (!cellId || !cellData || cellData.locked_by !== username) return;

    for (const [id, entry] of Object.entries(drawnPolygons)) {
      if (entry.data.grid_cell_id !== cellId) continue;
      if (!canEditPolygon(entry)) continue;
      entry.gmapsPoly.setEditable(true);
      const coords = pathsToGeoJSONCoords(entry.gmapsPoly);
      entry._lastGeometry = { type: 'Polygon', coordinates: JSON.parse(JSON.stringify(coords)) };
      attachPathListeners(id, entry.gmapsPoly);
    }
  }

  function selectHoleTarget(id) {
    const entry = drawnPolygons[id];
    if (!entry) return;

    if (!canEditPolygon(entry)) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.polyBelongs', entry.data.created_by), 'warning');
      return;
    }

    const cellId = entry.data.grid_cell_id;
    const selectedCell = LeucenaApp.getSelectedCellId();
    const cellData = LeucenaApp.getSelectedCellData();
    if (cellId !== selectedCell || !cellData || cellData.locked_by !== LeucenaApp.getUsername()) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.lockCellToEdit'), 'warning');
      return;
    }

    clearHoleTarget();
    holeTargetId = id;
    entry.gmapsPoly.setOptions(HOLE_HIGHLIGHT);
    if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
      LeucenaApp.logEvent('hole_target_selected', LeucenaApp.getSelectedCellId(), id, null);
    }
    LeucenaApp.showToast(LeucenaI18n.t('toast.holeDrawNow'), 'info');
    startHoleDrawing(id);
  }

  function clearHoleTarget() {
    if (holeTargetId && drawnPolygons[holeTargetId]) {
      const crole = drawnPolygons[holeTargetId].data.created_by_role || 'contributor';
      drawnPolygons[holeTargetId].gmapsPoly.setOptions(getPolyStyle(crole));
    }
    holeTargetId = null;
  }

  function cleanupManualHole() {
    LeucenaMap.setGridClickable(true);
    if (!manualHoleState) return;
    const s = manualHoleState;
    const mouseMoves = s.getMouseMoveCount ? s.getMouseMoveCount() : -1;
    if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
      LeucenaApp.logEvent('hole_cleanup', LeucenaApp.getSelectedCellId(), s.targetId, {
        vertices: s.vertices.length, mouseMoves
      });
    }
    s.vertexMarkers.forEach(m => m.setMap(null));
    s.previewPoly.setMap(null);
    s.guideLine.setMap(null);
    google.maps.event.removeListener(s.clickListener);
    google.maps.event.removeListener(s.moveListener);
    google.maps.event.removeListener(s.dblClickListener);
    google.maps.event.removeListener(s.rightClickListener);
    const map = LeucenaMap.getMap();
    if (map && s.contextMenuHandler) {
      map.getDiv().removeEventListener('contextmenu', s.contextMenuHandler);
    }
    setClickable(true);
    if (map) {
      _clearCrosshair(map);
      map.setOptions({ disableDoubleClickZoom: false });
    }
    manualHoleState = null;
  }

  function _forceCrosshair(map) {
    map.setOptions({ draggableCursor: 'crosshair' });
    const div = map.getDiv();
    if (div) div.classList.add('map-crosshair-mode');
    if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
      LeucenaApp.logEvent('cursor_set', LeucenaApp.getSelectedCellId(), null, { cursor: 'crosshair', mode: activeMode });
    }
  }

  function _clearCrosshair(map) {
    map.setOptions({ draggableCursor: null });
    const div = map.getDiv();
    if (div) div.classList.remove('map-crosshair-mode');
  }

  // Manual vertex-by-vertex hole drawing (mirrors startDrawing but saves as inner ring)
  function startHoleDrawing(targetId) {
    cleanupManualHole();
    setClickable(false);
    LeucenaMap.setGridClickable(false);
    const map = LeucenaMap.getMap();
    map.setOptions({ disableDoubleClickZoom: true });
    _forceCrosshair(map);

    if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
      LeucenaApp.logEvent('hole_draw_start', LeucenaApp.getSelectedCellId(), targetId, {
        gridClickable: false, polyClickable: false, hasMousePos: !!_lastMouseLatLng
      });
    }

    const vertices = [];
    const vertexMarkers = [];

    const previewPoly = new google.maps.Polygon({
      paths: [],
      strokeColor: '#ef4444', strokeOpacity: 0.9, strokeWeight: 2,
      fillColor: '#ef4444', fillOpacity: 0.20,
      editable: false, clickable: false, zIndex: 15, map: map
    });

    const guideLine = new google.maps.Polyline({
      path: [], strokeColor: '#ef4444', strokeOpacity: 0.5, strokeWeight: 1.5,
      map: map, clickable: false, zIndex: 16
    });

    function updatePreview() { previewPoly.setPath(vertices); }

    function addVertex(latLng) {
      vertices.push(latLng);
      updatePreview();
      vertexMarkers.push(new google.maps.Marker({
        position: latLng, map: map,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 5, fillColor: '#ef4444', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 1.5 },
        clickable: false, zIndex: 17
      }));
    }

    function removeLastVertex() {
      if (!vertices.length) return;
      vertices.pop();
      if (vertexMarkers.length) vertexMarkers.pop().setMap(null);
      updatePreview();
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
        LeucenaApp.logEvent('hole_vertex_undo', LeucenaApp.getSelectedCellId(), targetId, { remaining: vertices.length });
      }
    }

    const clickListener = map.addListener('click', (e) => {
      if (activeMode !== 'hole' || !manualHoleState) return;
      addVertex(e.latLng);
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
        LeucenaApp.logEvent('hole_vertex_click', LeucenaApp.getSelectedCellId(), targetId, { lat: e.latLng.lat(), lng: e.latLng.lng(), count: vertices.length });
      }
      _syncToolbarExtras();
    });

    let _holeMouseMoveCount = 0;
    const moveListener = map.addListener('mousemove', (e) => {
      _lastMouseLatLng = e.latLng;
      _holeMouseMoveCount++;
      guideLine.setPath(vertices.length ? [vertices[vertices.length - 1], e.latLng] : []);
    });

    const dblClickListener = map.addListener('dblclick', () => {
      if (activeMode !== 'hole' || !manualHoleState) return;
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
        LeucenaApp.logEvent('hole_finish_dblclick', LeucenaApp.getSelectedCellId(), targetId, { vertices: vertices.length, mouseMoves: _holeMouseMoveCount });
      }
      if (vertices.length > 0) removeLastVertex();
      completeManualHole();
    });

    const rightClickListener = map.addListener('rightclick', () => {
      if (activeMode !== 'hole' || !manualHoleState) return;
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
        LeucenaApp.logEvent('hole_finish_rightclick', LeucenaApp.getSelectedCellId(), targetId, { vertices: vertices.length, mouseMoves: _holeMouseMoveCount });
      }
      if (vertices.length >= 3) completeManualHole();
    });

    const mapDiv = map.getDiv();
    const contextMenuHandler = (e) => {
      if (activeMode !== 'hole' || !manualHoleState) return;
      e.preventDefault();
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
        LeucenaApp.logEvent('hole_finish_contextmenu', LeucenaApp.getSelectedCellId(), targetId, { vertices: vertices.length, mouseMoves: _holeMouseMoveCount });
      }
      if (vertices.length >= 3) completeManualHole();
    };
    mapDiv.addEventListener('contextmenu', contextMenuHandler);

    manualHoleState = {
      targetId, vertices, vertexMarkers, previewPoly, guideLine,
      clickListener, moveListener, dblClickListener, rightClickListener,
      contextMenuHandler,
      addVertex, removeLastVertex,
      getMouseMoveCount: () => _holeMouseMoveCount
    };
  }

  async function completeManualHole() {
    if (!manualHoleState) return;
    const { targetId, vertices } = manualHoleState;
    const mouseMoves = manualHoleState.getMouseMoveCount ? manualHoleState.getMouseMoveCount() : -1;

    if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
      LeucenaApp.logEvent('hole_complete_start', LeucenaApp.getSelectedCellId(), targetId, {
        vertices: vertices.length, mouseMoves
      });
    }

    const vertexCoords = vertices.map(p => [p.lng(), p.lat()]);
    cleanupManualHole();
    clearHoleTarget();

    if (vertexCoords.length < 3) {
      if (vertexCoords.length > 0) LeucenaApp.showToast(LeucenaI18n.t('toast.min3Vertices'), 'warning');
      setMode('select');
      return;
    }

    const entry = drawnPolygons[targetId];
    if (!entry) { setMode('select'); return; }

    const holeRing = [...vertexCoords, vertexCoords[0]];

    const currentCoords = pathsToGeoJSONCoords(entry.gmapsPoly);

    // Every hole vertex must be inside the outer ring AND outside all existing holes
    const outerRing = currentCoords[0];
    const existingHoles = currentCoords.slice(1);
    for (const [lng, lat] of vertexCoords) {
      if (!pointInRing(lng, lat, outerRing)) {
        LeucenaApp.showToast(LeucenaI18n.t('toast.holeOutsidePoly'), 'warning');
        setMode('select');
        return;
      }
      for (const hole of existingHoles) {
        if (pointInRing(lng, lat, hole)) {
          LeucenaApp.showToast(LeucenaI18n.t('toast.holeInsideHole'), 'warning');
          setMode('select');
          return;
        }
      }
    }

    currentCoords.push(holeRing);
    const newGeometry = { type: 'Polygon', coordinates: currentCoords };

    try {
      const res = await fetch(`/api/polygons/${targetId}`, {
        method: 'PUT',
        headers: LeucenaApp.authHeaders(),
        body: JSON.stringify({ geometry: newGeometry })
      });
      if (!res.ok) {
        const err = await res.json();
        LeucenaApp.showToast(err.error, 'error');
        setMode('select');
        return;
      }
      const holeResult = await res.json();
      entry.data.geometry = newGeometry;
      if (holeResult.area_ha != null) entry.data.area_ha = holeResult.area_ha;
      renderPolygon(targetId, newGeometry, entry.data, false);
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
        LeucenaApp.logEvent('hole_create', entry.data.grid_cell_id, targetId, { rings: currentCoords.length });
      }
      LeucenaApp.showToast(LeucenaI18n.t('toast.holeCreated'), 'success');
    } catch (e) {
      console.error('completeManualHole error:', e);
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
        LeucenaApp.logEvent('hole_complete_error', LeucenaApp.getSelectedCellId(), targetId, {
          error: e.message || String(e), vertices: vertexCoords.length
        });
      }
      LeucenaApp.showToast(LeucenaI18n.t('toast.polySaveFail'), 'error');
    }

    setMode('select');
  }

  function showDrawOverlay() {
    const overlay = document.getElementById('draw-instructions-overlay');
    if (!overlay) return;
    overlay.textContent = LeucenaI18n.t('badge.draw');
    overlay.classList.remove('hidden');
  }

  function hideDrawOverlay() {
    const overlay = document.getElementById('draw-instructions-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  function startDrawing() {
    cleanupManualDraw();
    showDrawOverlay();
    const map = LeucenaMap.getMap();
    _forceCrosshair(map);
    const vertices = [];
    const vertexMarkers = [];
    const prevDblClickZoom = map.get('disableDoubleClickZoom');
    map.setOptions({ disableDoubleClickZoom: true });

    LeucenaMap.setGridClickable(false);
    LeucenaDrawing.setClickable(false);

    // Track mousedown position to detect micro-pans that swallow the click event
    let _drawMouseDownPos = null;
    let _drawMouseDownTime = 0;
    const _drawMouseDownHandler = function (evt) {
      _drawMouseDownPos = { x: evt.clientX, y: evt.clientY };
      _drawMouseDownTime = Date.now();
    };
    const _drawMouseUpHandler = function (evt) {
      if (!_drawMouseDownPos || activeMode !== 'draw') return;
      const dx = evt.clientX - _drawMouseDownPos.x;
      const dy = evt.clientY - _drawMouseDownPos.y;
      const dt = Date.now() - _drawMouseDownTime;
      // If mouse barely moved (<6px) and was fast (<300ms), treat as a click
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6 && dt < 300) {
        // The Google Maps click event should fire normally; but if it was swallowed
        // by a micro-pan, we add the vertex from the last known mouse position.
        // We use a short timeout: if click fires, it adds the vertex first and we skip.
        const countBefore = vertices.length;
        setTimeout(function () {
          if (vertices.length === countBefore && _lastMouseLatLng && activeMode === 'draw') {
            addVertex(_lastMouseLatLng);
            if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
              LeucenaApp.logEvent('draw_vertex_click', LeucenaApp.getSelectedCellId(), null, { lat: _lastMouseLatLng.lat(), lng: _lastMouseLatLng.lng(), count: vertices.length, recovered: true });
            }
            _syncToolbarExtras();
          }
        }, 60);
      }
      _drawMouseDownPos = null;
    };
    map.getDiv().addEventListener('mousedown', _drawMouseDownHandler);
    map.getDiv().addEventListener('mouseup', _drawMouseUpHandler);

    const previewPoly = new google.maps.Polygon({
      paths: [],
      ...POLY_STYLE_MEMBER,
      editable: false,
      clickable: false,
      zIndex: 10,
      map: map
    });

    const guideLine = new google.maps.Polyline({
      path: [],
      strokeColor: POLY_STYLE_MEMBER.strokeColor,
      strokeOpacity: 0.5,
      strokeWeight: 1.5,
      map: map,
      clickable: false,
      zIndex: 11
    });

    function updatePreview() {
      previewPoly.setPath(vertices);
    }

    function addVertex(latLng) {
      vertices.push(latLng);
      updatePreview();
      const marker = new google.maps.Marker({
        position: latLng,
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 5,
          fillColor: '#84cc16',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1.5
        },
        clickable: false,
        zIndex: 15
      });
      vertexMarkers.push(marker);
    }

    function removeLastVertex() {
      if (vertices.length === 0) return false;
      vertices.pop();
      if (vertexMarkers.length > 0) vertexMarkers.pop().setMap(null);
      updatePreview();
      return true;
    }

    const clickListener = map.addListener('click', (e) => {
      if (activeMode !== 'draw') return;
      addVertex(e.latLng);
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
        LeucenaApp.logEvent('draw_vertex_click', LeucenaApp.getSelectedCellId(), null, { lat: e.latLng.lat(), lng: e.latLng.lng(), count: vertices.length });
      }
      _syncToolbarExtras();
    });

    const moveListener = map.addListener('mousemove', (e) => {
      _lastMouseLatLng = e.latLng;
      if (vertices.length > 0) {
        guideLine.setPath([vertices[vertices.length - 1], e.latLng]);
      } else {
        guideLine.setPath([]);
      }
    });

    const dblClickListener = map.addListener('dblclick', (e) => {
      if (activeMode !== 'draw') return;
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
        LeucenaApp.logEvent('draw_finish_dblclick', LeucenaApp.getSelectedCellId(), null, { vertices: vertices.length });
      }
      if (vertices.length > 0) removeLastVertex();
      completeManualDraw();
    });

    const rightClickListener = map.addListener('rightclick', (e) => {
      if (activeMode !== 'draw') return;
      if (vertices.length >= 3) {
        if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
          LeucenaApp.logEvent('draw_finish_rightclick', LeucenaApp.getSelectedCellId(), null, { vertices: vertices.length });
        }
        completeManualDraw();
      }
    });

    manualDrawState = {
      vertices, vertexMarkers, previewPoly, guideLine,
      clickListener, moveListener, dblClickListener, rightClickListener,
      removeLastVertex, addVertex, prevDblClickZoom,
      _drawMouseDownHandler, _drawMouseUpHandler
    };
    _syncToolbarExtras();
  }

  async function completeManualDraw() { // POST then render; restarts draw in draw mode unless _suppressDrawRestart
    if (!manualDrawState) return;
    const { vertices } = manualDrawState;

    if (vertices.length < 3) {
      cleanupManualDraw();
      if (vertices.length > 0) {
        LeucenaApp.showToast(LeucenaI18n.t('toast.min3Vertices'), 'warning');
      }
      if (activeMode === 'draw' && !_suppressDrawRestart) startDrawing();
      return;
    }

    const cellId = LeucenaApp.getSelectedCellId();
    if (!cellId) {
      cleanupManualDraw();
      LeucenaApp.showToast(LeucenaI18n.t('toast.selectCellFirst'), 'warning');
      if (activeMode === 'draw' && !_suppressDrawRestart) startDrawing();
      return;
    }

    const coordinates = vertices.map(p => [p.lng(), p.lat()]);
    coordinates.push(coordinates[0]);
    const geometry = { type: 'Polygon', coordinates: [coordinates] };

    cleanupManualDraw();

    try {
      const res = await fetch('/api/polygons', {
        method: 'POST',
        headers: LeucenaApp.authHeaders(),
        body: JSON.stringify({ grid_cell_id: cellId, geometry })
      });

      if (!res.ok) {
        const err = await res.json();
        LeucenaApp.showToast(err.error, 'error');
        if (activeMode === 'draw' && !_suppressDrawRestart) startDrawing();
        return;
      }

      const result = await res.json();
      renderPolygon(result.id, geometry, result, false);
      if (typeof LeucenaMap !== 'undefined' && LeucenaMap.updateFilterCounts) LeucenaMap.updateFilterCounts();
      LeucenaApp.showToast(LeucenaI18n.t('toast.polySaved'), 'success');
      if (typeof LeucenaApp.onPolygonSaved === 'function') LeucenaApp.onPolygonSaved(result.area_ha || 0, result.cell_summary);
    } catch (e) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.polySaveFail'), 'error');
    }

    if (activeMode === 'draw' && !_suppressDrawRestart) startDrawing();
  }

  function cleanupManualDraw() {
    if (!manualDrawState) return;
    const { vertexMarkers, previewPoly, guideLine,
            clickListener, moveListener, dblClickListener, rightClickListener,
            prevDblClickZoom, _drawMouseDownHandler, _drawMouseUpHandler } = manualDrawState;

    vertexMarkers.forEach(m => m.setMap(null));
    if (previewPoly) previewPoly.setMap(null);
    if (guideLine) guideLine.setMap(null);
    if (clickListener) google.maps.event.removeListener(clickListener);
    if (moveListener) google.maps.event.removeListener(moveListener);
    if (dblClickListener) google.maps.event.removeListener(dblClickListener);
    if (rightClickListener) google.maps.event.removeListener(rightClickListener);

    const map = LeucenaMap.getMap();
    if (map) {
      if (prevDblClickZoom !== undefined) map.setOptions({ disableDoubleClickZoom: prevDblClickZoom });
      if (_drawMouseDownHandler) map.getDiv().removeEventListener('mousedown', _drawMouseDownHandler);
      if (_drawMouseUpHandler) map.getDiv().removeEventListener('mouseup', _drawMouseUpHandler);
    }

    LeucenaMap.setGridClickable(true);
    setClickable(true);
    hideDrawOverlay();

    if (map) _clearCrosshair(map);

    manualDrawState = null;
  }

  function undoDrawVertex() {
    if (!manualDrawState) return;
    const { vertices, removeLastVertex } = manualDrawState;

    if (vertices.length <= 1) {
      cleanupManualDraw();
      LeucenaApp.showToast(LeucenaI18n.t('toast.drawCancelled'), 'info');
      if (activeMode === 'draw') startDrawing();
      _syncToolbarExtras();
      return;
    }

    removeLastVertex();
    _syncToolbarExtras();
  }

  async function undoDeletePolygon() {
    if (deleteUndoStack.length === 0) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.nothingToUndo'), 'info');
      return;
    }

    const backup = deleteUndoStack.pop();

    try {
      const res = await fetch('/api/polygons', {
        method: 'POST',
        headers: LeucenaApp.authHeaders(),
        body: JSON.stringify({
          grid_cell_id: backup.grid_cell_id,
          geometry: backup.geometry
        })
      });

      if (!res.ok) {
        const err = await res.json();
        LeucenaApp.showToast(err.error, 'error');
        deleteUndoStack.push(backup);
        return;
      }

      const result = await res.json();
      renderPolygon(result.id, backup.geometry, result, false);
      if (typeof LeucenaMap !== 'undefined' && LeucenaMap.updateFilterCounts) LeucenaMap.updateFilterCounts();
      if (typeof LeucenaApp.onPolygonSaved === 'function') LeucenaApp.onPolygonSaved(result.area_ha || 0, result.cell_summary);
      LeucenaApp.showToast(LeucenaI18n.t('toast.polyRestored'), 'success');
    } catch (e) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.polyRestoreFail'), 'error');
      deleteUndoStack.push(backup);
    }
    _syncToolbarExtras();
  }

  // ── Edit undo ──

  async function undoEditPolygon() {
    if (editUndoStack.length === 0) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.nothingToUndo'), 'info');
      return;
    }
    const snapshot = editUndoStack.pop();
    const entry = drawnPolygons[snapshot.id];
    if (!entry) return;

    editUndoGuard = true;
    detachPathListeners(snapshot.id);

    const paths = geojsonRingsToPaths(snapshot.geometry.coordinates);
    entry.gmapsPoly.setPaths(paths);
    entry.data.geometry = JSON.parse(JSON.stringify(snapshot.geometry));
    entry._lastGeometry = JSON.parse(JSON.stringify(snapshot.geometry));

    if (entry.areaLabel) {
      entry.areaLabel.updateText(formatAreaLabel(calcAreaHa(snapshot.geometry)));
      entry.areaLabel.updatePosition(polygonCentroid(snapshot.geometry));
    }

    editUndoGuard = false;
    attachPathListeners(snapshot.id, entry.gmapsPoly);

    try {
      await fetch(`/api/polygons/${snapshot.id}`, {
        method: 'PUT',
        headers: LeucenaApp.authHeaders(),
        body: JSON.stringify({ geometry: snapshot.geometry })
      });
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
        LeucenaApp.logEvent('polygon_edit_undo', entry.data.grid_cell_id, snapshot.id, null);
      }
      LeucenaApp.showToast(LeucenaI18n.t('toast.polyRestored'), 'success');
    } catch (e) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.polyEditSaveFail'), 'error');
    }
    _syncToolbarExtras();
  }

  // ── Tool badges ──

  function _isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  function updateToolBadge(mode) {
    const overlay = document.getElementById('draw-instructions-overlay');
    if (!overlay) return;
    const t = LeucenaI18n.t;
    const touch = _isTouchDevice();

    if (mode === 'draw' || mode === 'delete' || mode === 'edit') {
      if (mode === 'delete' && _pendingDeleteId) {
        overlay.innerHTML = t(touch ? 'badge.deleteConfirmTouch' : 'badge.deleteConfirm')
          + '<div class="draw-overlay-actions">'
          + '<button class="btn-overlay-action btn-overlay-delete" id="overlay-delete-confirm">' + t('badge.deleteBtn') + '</button>'
          + '<button class="btn-overlay-action btn-overlay-cancel" id="overlay-delete-cancel">' + t('badge.cancelBtn') + '</button>'
          + '</div>';
        document.getElementById('overlay-delete-confirm').addEventListener('click', () => {
          if (!_pendingDeleteId) return;
          if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
            LeucenaApp.logEvent('touch_confirm_delete', LeucenaApp.getSelectedCellId(), _pendingDeleteId, null);
          }
          const id = _pendingDeleteId;
          clearPendingDelete();
          deletePolygon(id);
        });
        document.getElementById('overlay-delete-cancel').addEventListener('click', () => {
          if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
            LeucenaApp.logEvent('touch_cancel_delete', LeucenaApp.getSelectedCellId(), _pendingDeleteId, null);
          }
          clearPendingDelete();
        });
      } else {
        const key = mode === 'draw' ? (touch ? 'badge.drawTouch' : 'badge.draw')
                  : mode === 'delete' ? 'badge.delete'
                  : (touch ? 'badge.editTouch' : 'badge.edit');
        overlay.textContent = t(key);
      }
      overlay.classList.remove('hidden');
    } else {
      overlay.innerHTML = '';
      overlay.classList.add('hidden');
    }

    _syncToolbarExtras();
  }

  function _syncToolbarExtras() {
    const undoBtn = document.getElementById('tool-undo');
    const finishBtn = document.getElementById('tool-finish-draw');
    if (undoBtn) {
      const hasUndo = (activeMode === 'delete' && deleteUndoStack.length > 0)
        || (activeMode === 'edit' && editUndoStack.length > 0)
        || (activeMode === 'draw' && manualDrawState && manualDrawState.vertices.length > 0)
        || (activeMode === 'hole' && manualHoleState && manualHoleState.vertices.length > 0);
      undoBtn.classList.toggle('hidden', !hasUndo);
    }
    if (finishBtn) {
      const canFinish = (activeMode === 'draw' && manualDrawState && manualDrawState.vertices.length >= 3)
        || (activeMode === 'hole' && manualHoleState && manualHoleState.vertices.length >= 3);
      finishBtn.classList.toggle('hidden', !canFinish);
    }
  }

  function canEditPolygon(entry) {
    const username = LeucenaApp.getUsername();
    if (!username) return false;
    if (LeucenaApp.isAdminUser()) return true;
    return entry.data.created_by === username;
  }

  function canDeletePolygon(entry) {
    const username = LeucenaApp.getUsername();
    if (!username) return false;
    if (LeucenaApp.isAdminUser()) return true;
    return entry.data.created_by === username;
  }

  function toggleEditPolygon(id) {
    const entry = drawnPolygons[id];
    if (!entry) return;

    if (!canEditPolygon(entry)) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.polyBelongs', entry.data.created_by), 'warning');
      return;
    }

    const cellId = entry.data.grid_cell_id;
    const selectedCell = LeucenaApp.getSelectedCellId();
    const cellData = LeucenaApp.getSelectedCellData();

    if (cellId !== selectedCell || !cellData || cellData.locked_by !== LeucenaApp.getUsername()) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.lockCellToEdit'), 'warning');
      return;
    }

    const isEditable = entry.gmapsPoly.getEditable();
    entry.gmapsPoly.setEditable(!isEditable);

    if (!isEditable) {
      const coords = pathsToGeoJSONCoords(entry.gmapsPoly);
      entry._lastGeometry = { type: 'Polygon', coordinates: JSON.parse(JSON.stringify(coords)) };
      attachPathListeners(id, entry.gmapsPoly);
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
        LeucenaApp.logEvent('polygon_edit_start', entry.data.grid_cell_id, id, null);
      }
    } else {
      detachPathListeners(id);
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
        LeucenaApp.logEvent('polygon_edit_end', entry.data.grid_cell_id, id, null);
      }
    }
  }

  async function savePolygonGeometry(id, gmapsPoly) {
    const coordinates = pathsToGeoJSONCoords(gmapsPoly);
    const geometry = { type: 'Polygon', coordinates: coordinates };

    try {
      await fetch(`/api/polygons/${id}`, {
        method: 'PUT',
        headers: LeucenaApp.authHeaders(),
        body: JSON.stringify({ geometry })
      });
    } catch (e) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.polyEditSaveFail'), 'error');
    }
  }

  function clearPendingDelete() {
    if (_pendingDeleteId && drawnPolygons[_pendingDeleteId]) {
      const entry = drawnPolygons[_pendingDeleteId];
      const crole = entry.data.created_by_role || 'contributor';
      entry.gmapsPoly.setOptions(getPolyStyle(crole));
    }
    _pendingDeleteId = null;
    updateToolBadge(activeMode);
  }

  function selectForDeletion(id) { // two-step delete: red highlight, then Delete/Backspace confirms (see keydown handler)
    const entry = drawnPolygons[id];
    if (!entry) return;

    if (!canDeletePolygon(entry)) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.polyBelongsAdmin', entry.data.created_by), 'warning');
      return;
    }

    const cellId = entry.data.grid_cell_id;
    const selectedCell = LeucenaApp.getSelectedCellId();
    const cellData = LeucenaApp.getSelectedCellData();
    if (cellId !== selectedCell || !cellData || cellData.locked_by !== LeucenaApp.getUsername()) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.lockCellToDelete'), 'warning');
      return;
    }

    if (_pendingDeleteId === id) {
      clearPendingDelete();
      return;
    }

    clearPendingDelete();
    _pendingDeleteId = id;
    entry.gmapsPoly.setOptions({
      strokeColor: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0.4,
      strokeWeight: 3
    });
    if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
      LeucenaApp.logEvent('polygon_select_delete', entry.data.grid_cell_id, id, null);
    }
    updateToolBadge('delete');
  }

  async function deletePolygon(id) {
    const entry = drawnPolygons[id];
    if (!entry) return;

    if (!canDeletePolygon(entry)) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.polyBelongsAdmin', entry.data.created_by), 'warning');
      return;
    }

    const cellId = entry.data.grid_cell_id;
    const selectedCell = LeucenaApp.getSelectedCellId();
    const cellData = LeucenaApp.getSelectedCellData();

    if (cellId !== selectedCell || !cellData || cellData.locked_by !== LeucenaApp.getUsername()) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.lockCellToDelete'), 'warning');
      return;
    }

    const backup = {
      id,
      grid_cell_id: entry.data.grid_cell_id,
      geometry: entry.data.geometry,
      created_by: entry.data.created_by
    };

    try {
      const res = await fetch(`/api/polygons/${id}`, {
        method: 'DELETE',
        headers: LeucenaApp.authHeaders()
      });
      if (!res.ok) {
        const err = await res.json();
        LeucenaApp.showToast(err.error, 'error');
        return;
      }
      const delBody = await res.json();
      entry.gmapsPoly.setMap(null);
      if (entry.areaLabel) entry.areaLabel.setMap(null);
      delete drawnPolygons[id];
      delete polyBounds[id];
      deleteUndoStack.push(backup);
      if (typeof LeucenaMap !== 'undefined' && LeucenaMap.updateFilterCounts) LeucenaMap.updateFilterCounts();
      if (typeof LeucenaApp.onPolygonDeleted === 'function') LeucenaApp.onPolygonDeleted(entry.data.area_ha || 0, delBody.cell_summary);
      LeucenaApp.showToast(LeucenaI18n.t('toast.polyDeleted'), 'success');
    } catch (e) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.polyDeleteFail'), 'error');
    }
    _syncToolbarExtras();
  }

  function makeAllNonEditable() {
    for (const [id, entry] of Object.entries(drawnPolygons)) {
      entry.gmapsPoly.setEditable(false);
      detachPathListeners(id);
    }
  }

  function deactivate() {
    deleteUndoStack.length = 0;
    editUndoStack.length = 0;
    cleanupManualDraw();
    setMode('select');
  }

  function setVisible(visible) {
    const map = LeucenaMap.getMap();
    const viewport = map ? map.getBounds() : null;
    for (const [id, entry] of Object.entries(drawnPolygons)) {
      const crole = entry.data.created_by_role || 'contributor';
      const inView = !viewport || !polyBounds[id] || viewport.intersects(polyBounds[id]);
      const show = visible && shouldShowPoly(crole) && inView;
      entry.gmapsPoly.setMap(show ? map : null);
      if (entry.areaLabel) entry.areaLabel.setMap(show && _areaLabelsVisible ? map : null);
    }
  }

  function setMemberMasksVisible(visible) {
    showMemberMasks = visible;
    refreshPolyVisibility();
  }

  function setContributorMasksVisible(visible) {
    showContributorMasks = visible;
    refreshPolyVisibility();
  }

  function refreshPolyVisibility() {
    const globalShow = LeucenaMap.getShowPolygons();
    const map = LeucenaMap.getMap();
    const viewport = map ? map.getBounds() : null;
    const currentState = typeof LeucenaMap.getCurrentState === 'function' ? LeucenaMap.getCurrentState() : null;
    const brazilOverview = !currentState;
    const loadedCells = currentState ? LeucenaMap.getGridData() : null;
    for (const [id, entry] of Object.entries(drawnPolygons)) {
      if (brazilOverview) {
        entry.gmapsPoly.setMap(null);
        if (entry.areaLabel) entry.areaLabel.setMap(null);
        continue;
      }
      const crole = entry.data.created_by_role || 'contributor';
      const inView = !viewport || !polyBounds[id] || viewport.intersects(polyBounds[id]);
      const inState = !currentState || (entry.data.grid_cell_id && loadedCells && loadedCells[entry.data.grid_cell_id]);
      const show = globalShow && shouldShowPoly(crole) && inView && inState;
      entry.gmapsPoly.setMap(show ? map : null);
      if (entry.areaLabel) entry.areaLabel.setMap(show && _areaLabelsVisible ? map : null);
    }
  }

  function refreshPolyStyles() {
    for (const entry of Object.values(drawnPolygons)) {
      const crole = entry.data.created_by_role || 'contributor';
      const style = getPolyStyle(crole);
      entry.gmapsPoly.setOptions(style);
    }
    refreshPolyVisibility();
  }

  function polygonCountsInLoadedState() {
    const stateActive = typeof LeucenaMap !== 'undefined' && LeucenaMap.getCurrentState && LeucenaMap.getCurrentState();
    if (!stateActive) return { member: 0, contributor: 0, total: 0 };
    const loaded = LeucenaMap.getGridData && LeucenaMap.getGridData();
    if (!loaded) return { member: 0, contributor: 0, total: 0 };
    let member = 0;
    let contributor = 0;
    for (const entry of Object.values(drawnPolygons)) {
      const gid = entry.data.grid_cell_id;
      if (!gid || !loaded[gid]) continue;
      const crole = entry.data.created_by_role || 'contributor';
      if (isMemberRole(crole)) member++;
      else contributor++;
    }
    return { member, contributor, total: member + contributor };
  }

  function getPolygonCounts() {
    return polygonCountsInLoadedState();
  }

  function addRemotePolygon(data) {
    renderPolygon(data.id, data.geometry, data, false);
    if (typeof LeucenaMap !== 'undefined' && LeucenaMap.updateFilterCounts) LeucenaMap.updateFilterCounts();
  }

  function updateRemotePolygon(data) {
    const entry = drawnPolygons[data.id];
    if (!entry) return;
    if (entry.gmapsPoly.getEditable()) return;
    const paths = geojsonRingsToPaths(data.geometry.coordinates);
    entry.gmapsPoly.setPaths(paths);
    entry.data.geometry = data.geometry;
    if (entry.areaLabel) {
      const ha = data.area_ha != null ? data.area_ha : calcAreaHa(data.geometry);
      entry.areaLabel.updateText(formatAreaLabel(ha));
      entry.areaLabel.updatePosition(polygonCentroid(data.geometry));
    }
  }

  function removeRemotePolygon(id) {
    const entry = drawnPolygons[id];
    if (!entry) return;
    entry.gmapsPoly.setMap(null);
    if (entry.areaLabel) entry.areaLabel.setMap(null);
    delete drawnPolygons[id];
    delete polyBounds[id];
    if (typeof LeucenaMap !== 'undefined' && LeucenaMap.updateFilterCounts) LeucenaMap.updateFilterCounts();
  }

  function getActiveMode() {
    return activeMode;
  }

  function setClickable(clickable) {
    for (const entry of Object.values(drawnPolygons)) {
      entry.gmapsPoly.setOptions({ clickable: clickable });
    }
  }

  function getPolygonCount() {
    const c = polygonCountsInLoadedState();
    return c.total;
  }

  /** Contagem de polígonos numa célula (ex.: modal de desbloqueio). */
  function getPolygonCountForCell(cellId) {
    if (cellId == null) return 0;
    let n = 0;
    for (const entry of Object.values(drawnPolygons)) {
      if (entry.data.grid_cell_id === cellId) n++;
    }
    return n;
  }

  function getTotalPolygonCount() {
    return Object.keys(drawnPolygons).length;
  }

  function clearUndoHistory() {
    deleteUndoStack.length = 0;
    cleanupManualDraw();
  }

  function setAreaLabelsVisible(visible) {
    _areaLabelsVisible = visible;
    const map = LeucenaMap.getMap();
    const globalShow = LeucenaMap.getShowPolygons();
    const viewport = map ? map.getBounds() : null;
    const stateActive = typeof LeucenaMap.getCurrentState === 'function' && LeucenaMap.getCurrentState();
    const loadedCells = stateActive ? LeucenaMap.getGridData() : null;
    for (const [id, entry] of Object.entries(drawnPolygons)) {
      if (!entry.areaLabel) continue;
      const crole = entry.data.created_by_role || 'contributor';
      const inView = !viewport || !polyBounds[id] || viewport.intersects(polyBounds[id]);
      const inState = !stateActive || (entry.data.grid_cell_id && loadedCells && loadedCells[entry.data.grid_cell_id]);
      const show = visible && globalShow && shouldShowPoly(crole) && inView && inState;
      entry.areaLabel.setMap(show ? map : null);
    }
  }

  return {
    init,
    deactivate,
    setVisible,
    setMemberMasksVisible,
    setContributorMasksVisible,
    refreshPolyStyles,
    addRemotePolygon,
    updateRemotePolygon,
    removeRemotePolygon,
    getActiveMode,
    setMode,
    setClickable,
    getPolygonCount,
    getPolygonCountForCell,
    getTotalPolygonCount,
    getPolygonCounts,
    clearUndoHistory,
    setAreaLabelsVisible,
    refreshPolyVisibility,
    isPolygonInProgress,
    updateMouseLatLng(latLng) { _lastMouseLatLng = latLng; },
    isEditModified() { return _editModified; },
    exitEditMode() { if (activeMode === 'edit') { setMode('select'); } }
  };
})();

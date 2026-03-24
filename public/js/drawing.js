window.LeucenaDrawing = (function () {
  let drawingManager = null;
  let activeMode = 'select';
  const drawnPolygons = {};
  let holeTargetId = null;

  const deleteUndoStack = [];
  const editUndoStack = [];
  let manualDrawState = null;
  let _areaLabelsVisible = false;

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

  // ── Client-side geodesic area calculation ──
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

  // ── Area Label Overlay (lazy-initialized after Google Maps loads) ──
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
  }

  function setupUndoHandler() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && activeMode === 'draw' && manualDrawState) {
        e.preventDefault();
        completeManualDraw();
        return;
      }

      if (!(e.key === 'z' && (e.ctrlKey || e.metaKey))) return;

      if (activeMode === 'draw' && manualDrawState) {
        e.preventDefault();
        e.stopPropagation();
        undoDrawVertex();
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

  function renderPolygon(id, geometry, props, editable) {
    if (drawnPolygons[id]) {
      drawnPolygons[id].gmapsPoly.setMap(null);
      if (drawnPolygons[id].areaLabel) drawnPolygons[id].areaLabel.setMap(null);
    }

    const map = LeucenaMap.getMap();
    const paths = geojsonRingsToPaths(geometry.coordinates);
    const creatorRole = props.created_by_role || 'contributor';
    const style = getPolyStyle(creatorRole);
    const visible = LeucenaMap.getShowPolygons() && shouldShowPoly(creatorRole);

    const poly = new google.maps.Polygon({
      paths: paths,
      ...style,
      editable: editable,
      draggable: false,
      map: visible ? map : null,
      zIndex: 10
    });

    poly.addListener('click', () => {
      if (activeMode === 'delete') {
        deletePolygon(id);
      } else if (activeMode === 'edit') {
        toggleEditPolygon(id);
      } else if (activeMode === 'hole') {
        selectHoleTarget(id);
      }
    });

    if (editable) {
      attachPathListeners(id, poly);
    }

    const areaHa = props.area_ha != null ? props.area_ha : calcAreaHa(geometry);
    const showLabel = visible && _areaLabelsVisible;
    const areaLabel = createAreaLabel(geometry, areaHa, showLabel ? map : null);
    drawnPolygons[id] = { gmapsPoly: poly, areaLabel, data: { id, ...props, geometry } };
  }

  const pathListenerMap = {};
  let editUndoGuard = false;

  function attachPathListeners(id, poly) {
    detachPathListeners(id);
    let gestureTimer = null;
    const gmapListeners = [];

    const onPathChange = () => {
      if (editUndoGuard) return;
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

  function setupToolbar() {
    document.getElementById('tool-select').addEventListener('click', () => setMode('select'));
    document.getElementById('tool-draw').addEventListener('click', () => setMode(activeMode === 'draw' ? 'select' : 'draw'));
    document.getElementById('tool-edit').addEventListener('click', () => setMode(activeMode === 'edit' ? 'select' : 'edit'));
    document.getElementById('tool-delete').addEventListener('click', () => {
      if (activeMode === 'delete') { setMode('select'); return; }
      showDeleteWarningModal();
    });
    document.getElementById('tool-hole').addEventListener('click', () => setMode(activeMode === 'hole' ? 'select' : 'hole'));

    document.getElementById('delete-warn-ok').addEventListener('click', () => {
      document.getElementById('delete-warn-modal').classList.add('hidden');
      setMode('delete');
    });
    document.getElementById('delete-warn-cancel').addEventListener('click', () => {
      document.getElementById('delete-warn-modal').classList.add('hidden');
    });
  }

  function showDeleteWarningModal() {
    document.getElementById('delete-warn-modal').classList.remove('hidden');
  }

  function setMode(mode) {
    const prevMode = activeMode;
    activeMode = mode;

    if (prevMode !== mode && typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
      LeucenaApp.logEvent('tool_switch', LeucenaApp.getSelectedCellId(), null, { from: prevMode, to: mode });
    }

    if (typeof LeucenaMap !== 'undefined' && LeucenaMap.deselectPoint) {
      LeucenaMap.deselectPoint();
    }

    deleteUndoStack.length = 0;
    editUndoStack.length = 0;
    cleanupManualDraw();
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

    if (mode === 'draw') {
      startDrawing();
    } else if (mode === 'edit') {
      makeAllEditableInCell();
    } else if (mode === 'hole') {
      LeucenaApp.showToast(LeucenaI18n.t('toast.holeSelectMask'), 'info');
    }
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

  function startHoleDrawing(targetId) {
    if (drawingManager) {
      drawingManager.setMap(null);
      drawingManager = null;
    }

    const map = LeucenaMap.getMap();
    drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.POLYGON,
      drawingControl: false,
      polygonOptions: {
        strokeColor: '#ef4444',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: '#ef4444',
        fillOpacity: 0.20,
        editable: true,
        zIndex: 15
      }
    });
    drawingManager.setMap(map);

    google.maps.event.addListener(drawingManager, 'polygoncomplete', async (holePoly) => {
      const entry = drawnPolygons[targetId];
      if (!entry) {
        holePoly.setMap(null);
        return;
      }

      const holePath = holePoly.getPath();
      if (holePath.getLength() < 3) {
        holePoly.setMap(null);
        LeucenaApp.showToast(LeucenaI18n.t('toast.min3Vertices'), 'warning');
        return;
      }

      const holeRing = [];
      holePath.forEach(p => holeRing.push([p.lng(), p.lat()]));
      holeRing.push(holeRing[0]);

      const currentCoords = pathsToGeoJSONCoords(entry.gmapsPoly);
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
          holePoly.setMap(null);
          LeucenaApp.showToast(err.error, 'error');
          return;
        }

        const holeResult = await res.json();
        holePoly.setMap(null);
        entry.data.geometry = newGeometry;
        if (holeResult.area_ha != null) entry.data.area_ha = holeResult.area_ha;
        renderPolygon(targetId, newGeometry, entry.data, false);

        if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
          LeucenaApp.logEvent('hole_create', entry.data.grid_cell_id, targetId, { rings: currentCoords.length });
        }
        LeucenaApp.showToast(LeucenaI18n.t('toast.holeCreated'), 'success');
      } catch (e) {
        holePoly.setMap(null);
        LeucenaApp.showToast(LeucenaI18n.t('toast.polySaveFail'), 'error');
      }

      if (drawingManager) {
        drawingManager.setMap(null);
        drawingManager = null;
      }
      clearHoleTarget();
      setMode('select');
    });
  }

  // ── Manual vertex-by-vertex drawing ──

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
    const vertices = [];
    const vertexMarkers = [];
    const prevDblClickZoom = map.get('disableDoubleClickZoom');
    map.setOptions({ disableDoubleClickZoom: true });

    LeucenaMap.setGridClickable(false);
    LeucenaDrawing.setClickable(false);

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
    });

    const moveListener = map.addListener('mousemove', (e) => {
      if (vertices.length > 0) {
        guideLine.setPath([vertices[vertices.length - 1], e.latLng]);
      } else {
        guideLine.setPath([]);
      }
    });

    const dblClickListener = map.addListener('dblclick', (e) => {
      if (activeMode !== 'draw') return;
      if (vertices.length > 0) removeLastVertex();
      completeManualDraw();
    });

    const rightClickListener = map.addListener('rightclick', (e) => {
      if (activeMode !== 'draw') return;
      if (vertices.length >= 3) {
        completeManualDraw();
      }
    });

    manualDrawState = {
      vertices, vertexMarkers, previewPoly, guideLine,
      clickListener, moveListener, dblClickListener, rightClickListener,
      removeLastVertex, prevDblClickZoom
    };
  }

  async function completeManualDraw() {
    if (!manualDrawState) return;
    const { vertices } = manualDrawState;

    if (vertices.length < 3) {
      cleanupManualDraw();
      if (vertices.length > 0) {
        LeucenaApp.showToast(LeucenaI18n.t('toast.min3Vertices'), 'warning');
      }
      if (activeMode === 'draw') startDrawing();
      return;
    }

    const cellId = LeucenaApp.getSelectedCellId();
    if (!cellId) {
      cleanupManualDraw();
      LeucenaApp.showToast(LeucenaI18n.t('toast.selectCellFirst'), 'warning');
      if (activeMode === 'draw') startDrawing();
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
        if (activeMode === 'draw') startDrawing();
        return;
      }

      const result = await res.json();
      renderPolygon(result.id, geometry, result, false);
      if (typeof LeucenaMap !== 'undefined' && LeucenaMap.updateFilterCounts) LeucenaMap.updateFilterCounts();
      LeucenaApp.showToast(LeucenaI18n.t('toast.polySaved'), 'success');
    } catch (e) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.polySaveFail'), 'error');
    }

    if (activeMode === 'draw') startDrawing();
  }

  function cleanupManualDraw() {
    if (!manualDrawState) return;
    const { vertexMarkers, previewPoly, guideLine,
            clickListener, moveListener, dblClickListener, rightClickListener, prevDblClickZoom } = manualDrawState;

    vertexMarkers.forEach(m => m.setMap(null));
    if (previewPoly) previewPoly.setMap(null);
    if (guideLine) guideLine.setMap(null);
    if (clickListener) google.maps.event.removeListener(clickListener);
    if (moveListener) google.maps.event.removeListener(moveListener);
    if (dblClickListener) google.maps.event.removeListener(dblClickListener);
    if (rightClickListener) google.maps.event.removeListener(rightClickListener);

    const map = LeucenaMap.getMap();
    if (map && prevDblClickZoom !== undefined) {
      map.setOptions({ disableDoubleClickZoom: prevDblClickZoom });
    }

    LeucenaMap.setGridClickable(true);
    hideDrawOverlay();

    manualDrawState = null;
  }

  function undoDrawVertex() {
    if (!manualDrawState) return;
    const { vertices, removeLastVertex } = manualDrawState;

    if (vertices.length <= 1) {
      cleanupManualDraw();
      LeucenaApp.showToast(LeucenaI18n.t('toast.drawCancelled'), 'info');
      if (activeMode === 'draw') startDrawing();
      return;
    }

    removeLastVertex();
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
      LeucenaApp.showToast(LeucenaI18n.t('toast.polyRestored'), 'success');
    } catch (e) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.polyRestoreFail'), 'error');
      deleteUndoStack.push(backup);
    }
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
  }

  // ── Tool badges ──

  function updateToolBadge(mode) {
    const overlay = document.getElementById('draw-instructions-overlay');
    if (!overlay) return;
    const t = LeucenaI18n.t;

    if (mode === 'draw' || mode === 'delete' || mode === 'edit') {
      overlay.textContent = mode === 'draw' ? t('badge.draw')
                          : mode === 'delete' ? t('badge.delete')
                          : t('badge.edit');
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
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
      entry.gmapsPoly.setMap(null);
      if (entry.areaLabel) entry.areaLabel.setMap(null);
      delete drawnPolygons[id];
      deleteUndoStack.push(backup);
      if (typeof LeucenaMap !== 'undefined' && LeucenaMap.updateFilterCounts) LeucenaMap.updateFilterCounts();
      LeucenaApp.showToast(LeucenaI18n.t('toast.polyDeleted'), 'success');
    } catch (e) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.polyDeleteFail'), 'error');
    }
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
    for (const entry of Object.values(drawnPolygons)) {
      const crole = entry.data.created_by_role || 'contributor';
      const show = visible && shouldShowPoly(crole);
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
    for (const entry of Object.values(drawnPolygons)) {
      const crole = entry.data.created_by_role || 'contributor';
      const show = globalShow && shouldShowPoly(crole);
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

  function getPolygonCounts() {
    let member = 0, contributor = 0;
    for (const entry of Object.values(drawnPolygons)) {
      const crole = entry.data.created_by_role || 'contributor';
      if (isMemberRole(crole)) member++;
      else contributor++;
    }
    return { member, contributor, total: member + contributor };
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
    for (const entry of Object.values(drawnPolygons)) {
      if (!entry.areaLabel) continue;
      const crole = entry.data.created_by_role || 'contributor';
      const show = visible && globalShow && shouldShowPoly(crole);
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
    setClickable,
    getPolygonCount,
    getPolygonCounts,
    clearUndoHistory,
    setAreaLabelsVisible
  };
})();

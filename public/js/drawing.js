window.LeucenaDrawing = (function () {
  let drawingManager = null;
  let activeMode = 'select';
  const drawnPolygons = {};
  let holeTargetId = null;

  const POLY_STYLE = {
    strokeColor: '#84cc16',
    strokeOpacity: 0.9,
    strokeWeight: 2.5,
    fillColor: '#84cc16',
    fillOpacity: 0.10
  };

  const HOLE_HIGHLIGHT = {
    strokeColor: '#f59e0b',
    strokeWeight: 3.5,
    fillColor: '#f59e0b',
    fillOpacity: 0.15
  };

  function init() {
    loadAllPolygons();
    setupToolbar();
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
    return coordinates.map(ring => ring.map(c => ({ lat: c[1], lng: c[0] })));
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
    }

    const map = LeucenaMap.getMap();
    const paths = geojsonRingsToPaths(geometry.coordinates);

    const poly = new google.maps.Polygon({
      paths: paths,
      ...POLY_STYLE,
      editable: editable,
      draggable: false,
      map: LeucenaMap.getShowPolygons() ? map : null,
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

    drawnPolygons[id] = { gmapsPoly: poly, data: { id, ...props, geometry } };
  }

  function attachPathListeners(id, poly) {
    const save = () => savePolygonGeometry(id, poly);
    const paths = poly.getPaths();
    for (let i = 0; i < paths.getLength(); i++) {
      google.maps.event.addListener(paths.getAt(i), 'set_at', save);
      google.maps.event.addListener(paths.getAt(i), 'insert_at', save);
    }
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
    activeMode = mode;

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
    } else if (mode === 'hole') {
      LeucenaApp.showToast(LeucenaI18n.t('toast.holeSelectMask'), 'info');
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
      drawnPolygons[holeTargetId].gmapsPoly.setOptions(POLY_STYLE);
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

        holePoly.setMap(null);
        entry.data.geometry = newGeometry;
        renderPolygon(targetId, newGeometry, entry.data, false);

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

  function startDrawing() {
    const map = LeucenaMap.getMap();
    drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.POLYGON,
      drawingControl: false,
      polygonOptions: {
        ...POLY_STYLE,
        editable: true,
        zIndex: 10
      }
    });

    drawingManager.setMap(map);

    google.maps.event.addListener(drawingManager, 'polygoncomplete', async (poly) => {
      const cellId = LeucenaApp.getSelectedCellId();
      if (!cellId) {
        poly.setMap(null);
        LeucenaApp.showToast(LeucenaI18n.t('toast.selectCellFirst'), 'warning');
        return;
      }

      const path = poly.getPath();

      if (path.getLength() < 3) {
        poly.setMap(null);
        LeucenaApp.showToast(LeucenaI18n.t('toast.min3Vertices'), 'warning');
        return;
      }

      const coordinates = [];
      path.forEach(p => coordinates.push([p.lng(), p.lat()]));
      coordinates.push(coordinates[0]);

      const geometry = { type: 'Polygon', coordinates: [coordinates] };

      try {
        const res = await fetch('/api/polygons', {
          method: 'POST',
          headers: LeucenaApp.authHeaders(),
          body: JSON.stringify({ grid_cell_id: cellId, geometry })
        });

        if (!res.ok) {
          const err = await res.json();
          poly.setMap(null);
          LeucenaApp.showToast(err.error, 'error');
          return;
        }

        const result = await res.json();
        poly.setMap(null);
        renderPolygon(result.id, geometry, result, true);
        if (typeof LeucenaMap !== 'undefined' && LeucenaMap.updateFilterCounts) LeucenaMap.updateFilterCounts();
        LeucenaApp.showToast(LeucenaI18n.t('toast.polySaved'), 'success');
      } catch (e) {
        poly.setMap(null);
        LeucenaApp.showToast(LeucenaI18n.t('toast.polySaveFail'), 'error');
      }
    });
  }

  function canEditPolygon(entry) {
    const username = LeucenaApp.getUsername();
    if (!username) return false;
    if (username === 'msb') return true;
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
      attachPathListeners(id, entry.gmapsPoly);
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

    if (!canEditPolygon(entry)) {
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
      delete drawnPolygons[id];
      if (typeof LeucenaMap !== 'undefined' && LeucenaMap.updateFilterCounts) LeucenaMap.updateFilterCounts();
      LeucenaApp.showToast(LeucenaI18n.t('toast.polyDeleted'), 'success');
    } catch (e) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.polyDeleteFail'), 'error');
    }
  }

  function makeAllNonEditable() {
    for (const entry of Object.values(drawnPolygons)) {
      entry.gmapsPoly.setEditable(false);
    }
  }

  function deactivate() {
    setMode('select');
  }

  function setVisible(visible) {
    const map = visible ? LeucenaMap.getMap() : null;
    for (const entry of Object.values(drawnPolygons)) {
      entry.gmapsPoly.setMap(map);
    }
  }

  function addRemotePolygon(data) {
    renderPolygon(data.id, data.geometry, data, false);
    if (typeof LeucenaMap !== 'undefined' && LeucenaMap.updateFilterCounts) LeucenaMap.updateFilterCounts();
  }

  function updateRemotePolygon(data) {
    const entry = drawnPolygons[data.id];
    if (!entry) return;
    const paths = geojsonRingsToPaths(data.geometry.coordinates);
    entry.gmapsPoly.setPaths(paths);
    entry.data.geometry = data.geometry;
  }

  function removeRemotePolygon(id) {
    const entry = drawnPolygons[id];
    if (!entry) return;
    entry.gmapsPoly.setMap(null);
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

  return {
    init,
    deactivate,
    setVisible,
    addRemotePolygon,
    updateRemotePolygon,
    removeRemotePolygon,
    getActiveMode,
    setClickable,
    getPolygonCount
  };
})();

window.LeucenaDrawing = (function () {
  let drawingManager = null;
  let activeMode = 'select';
  const drawnPolygons = {};

  const POLY_STYLE = {
    strokeColor: '#84cc16',
    strokeOpacity: 0.9,
    strokeWeight: 2.5,
    fillColor: '#84cc16',
    fillOpacity: 0.10
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
    } catch (e) {
      LeucenaApp.showToast('Failed to load polygons', 'error');
    }
  }

  function renderPolygon(id, geometry, props, editable) {
    if (drawnPolygons[id]) {
      drawnPolygons[id].gmapsPoly.setMap(null);
    }

    const map = LeucenaMap.getMap();
    const coords = geometry.coordinates[0].map(c => ({ lat: c[1], lng: c[0] }));

    const poly = new google.maps.Polygon({
      paths: coords,
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
      }
    });

    if (editable) {
      const savePath = () => savePolygonGeometry(id, poly);
      google.maps.event.addListener(poly.getPath(), 'set_at', savePath);
      google.maps.event.addListener(poly.getPath(), 'insert_at', savePath);
    }

    drawnPolygons[id] = { gmapsPoly: poly, data: { id, ...props, geometry } };
  }

  function setupToolbar() {
    document.getElementById('tool-select').addEventListener('click', () => setMode('select'));
    document.getElementById('tool-draw').addEventListener('click', () => setMode('draw'));
    document.getElementById('tool-edit').addEventListener('click', () => setMode('edit'));
    document.getElementById('tool-delete').addEventListener('click', () => setMode('delete'));
  }

  function setMode(mode) {
    activeMode = mode;

    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));

    const btnMap = { select: 'tool-select', draw: 'tool-draw', edit: 'tool-edit', delete: 'tool-delete' };
    const activeBtn = document.getElementById(btnMap[mode]);
    if (activeBtn) activeBtn.classList.add('active');

    if (LeucenaStreetView.isActive()) {
      document.getElementById('tool-streetview').classList.add('active');
    }

    if (drawingManager) {
      drawingManager.setMap(null);
      drawingManager = null;
    }

    makeAllNonEditable();

    if (mode === 'draw') {
      startDrawing();
    }
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
        LeucenaApp.showToast('Select and lock a cell first', 'warning');
        return;
      }

      const path = poly.getPath();

      if (path.getLength() < 3) {
        poly.setMap(null);
        LeucenaApp.showToast('Polygon needs at least 3 vertices', 'warning');
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
        LeucenaApp.showToast('Polygon saved', 'success');
      } catch (e) {
        poly.setMap(null);
        LeucenaApp.showToast('Failed to save polygon', 'error');
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
      LeucenaApp.showToast(`This polygon belongs to ${entry.data.created_by}`, 'warning');
      return;
    }

    const cellId = entry.data.grid_cell_id;
    const selectedCell = LeucenaApp.getSelectedCellId();
    const cellData = LeucenaApp.getSelectedCellData();

    if (cellId !== selectedCell || !cellData || cellData.locked_by !== LeucenaApp.getUsername()) {
      LeucenaApp.showToast('Lock the cell to edit its polygons', 'warning');
      return;
    }

    const isEditable = entry.gmapsPoly.getEditable();
    entry.gmapsPoly.setEditable(!isEditable);

    if (!isEditable) {
      const savePath = () => savePolygonGeometry(id, entry.gmapsPoly);
      google.maps.event.addListener(entry.gmapsPoly.getPath(), 'set_at', savePath);
      google.maps.event.addListener(entry.gmapsPoly.getPath(), 'insert_at', savePath);
    }
  }

  async function savePolygonGeometry(id, gmapsPoly) {
    const path = gmapsPoly.getPath();
    const coordinates = [];
    path.forEach(p => coordinates.push([p.lng(), p.lat()]));
    coordinates.push(coordinates[0]);
    const geometry = { type: 'Polygon', coordinates: [coordinates] };

    try {
      await fetch(`/api/polygons/${id}`, {
        method: 'PUT',
        headers: LeucenaApp.authHeaders(),
        body: JSON.stringify({ geometry })
      });
    } catch (e) {
      LeucenaApp.showToast('Failed to save polygon changes', 'error');
    }
  }

  async function deletePolygon(id) {
    const entry = drawnPolygons[id];
    if (!entry) return;

    if (!canEditPolygon(entry)) {
      LeucenaApp.showToast(`This polygon belongs to ${entry.data.created_by}. Only they or admin can delete it.`, 'warning');
      return;
    }

    const cellId = entry.data.grid_cell_id;
    const selectedCell = LeucenaApp.getSelectedCellId();
    const cellData = LeucenaApp.getSelectedCellData();

    if (cellId !== selectedCell || !cellData || cellData.locked_by !== LeucenaApp.getUsername()) {
      LeucenaApp.showToast('Lock the cell to delete its polygons', 'warning');
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
      LeucenaApp.showToast('Polygon deleted', 'success');
    } catch (e) {
      LeucenaApp.showToast('Failed to delete polygon', 'error');
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
  }

  function updateRemotePolygon(data) {
    const entry = drawnPolygons[data.id];
    if (!entry) return;
    const coords = data.geometry.coordinates[0].map(c => ({ lat: c[1], lng: c[0] }));
    entry.gmapsPoly.setPath(coords);
    entry.data.geometry = data.geometry;
  }

  function removeRemotePolygon(id) {
    const entry = drawnPolygons[id];
    if (!entry) return;
    entry.gmapsPoly.setMap(null);
    delete drawnPolygons[id];
  }

  function getActiveMode() {
    return activeMode;
  }

  function setClickable(clickable) {
    for (const entry of Object.values(drawnPolygons)) {
      entry.gmapsPoly.setOptions({ clickable: clickable });
    }
  }

  return {
    init,
    deactivate,
    setVisible,
    addRemotePolygon,
    updateRemotePolygon,
    removeRemotePolygon,
    getActiveMode,
    setClickable
  };
})();

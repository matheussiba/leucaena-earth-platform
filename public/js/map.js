window.LeucenaMap = (function () {
  let map = null;
  let svCoverageLayer = null;
  const gridPolygons = {};
  const gridData = {};
  const pointMarkersById = {};
  let activeFilters = new Set(['not_yet_finished', 'mapping', 'no_points', 'finished']);
  let showGrid = true;
  let showPoints = true;
  let showPolygons = true;
  let originalRestriction = null;
  let gridBounds = null;
  let selectedCellId = null;
  let lastCoords = null;
  let clickedOnFeature = false;

  const SELECTED_STROKE = '#00FFFF';

  const STATUS_STYLES = {
    not_yet_finished: { fill: '#7c3aed', stroke: '#7c3aed', fillOpacity: 0.20, strokeWeight: 1.5 },
    mapping:          { fill: 'transparent', stroke: '#eab308', fillOpacity: 0.0,  strokeWeight: 10 },
    no_points:        { fill: '#d4d4d8', stroke: '#9ca3af', fillOpacity: 0.50, strokeWeight: 1.5 },
    finished:         { fill: '#22c55e', stroke: '#16a34a', fillOpacity: 0.20, strokeWeight: 1.5 }
  };

  const LOCKED_STROKE = '#fde047';

  function init() {
    map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: -22.5, lng: -48.5 },
      zoom: 7,
      mapTypeId: 'satellite',
      mapTypeControl: false,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_CENTER
      },
      cameraControlOptions: {
        position: google.maps.ControlPosition.RIGHT_CENTER
      },
      controlSize: 32,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      gestureHandling: 'greedy',
      padding: { top: 56, bottom: 48, left: 0, right: 0 }
    });

    svCoverageLayer = new google.maps.StreetViewCoverageLayer();

    map.addListener('mousemove', (e) => {
      const lat = e.latLng.lat().toFixed(6);
      const lng = e.latLng.lng().toFixed(6);
      lastCoords = `${lat}, ${lng}`;
      document.getElementById('coords-display').textContent = lastCoords;
    });

    map.addListener('click', (e) => {
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.isDeletionMode && LeucenaApp.isDeletionMode()) {
        LeucenaApp.handleDeletionClick(e.latLng);
        return;
      }
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.isPointModeActive && LeucenaApp.isPointModeActive()) {
        return;
      }
      if (clickedOnFeature) {
        clickedOnFeature = false;
        return;
      }
      if (LeucenaStreetView.isActive()) {
        LeucenaStreetView.showAt(e.latLng);
        return;
      }
      deselectFromMap();
    });

    setupRightClickCopy();
    setupBasemapToggle();
    loadGrid();
    loadPoints();
    setupFilters();
  }

  let isSatellite = true;
  let showLabels = false;

  function setupBasemapToggle() {
    const mapBtn = document.getElementById('tool-maptype');
    const labelsCheckbox = document.getElementById('tool-labels');
    const labelToggle = document.getElementById('label-toggle');

    mapBtn.addEventListener('click', () => {
      isSatellite = !isSatellite;
      applyMapType();
      mapBtn.textContent = '';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '18');
      svg.setAttribute('height', '18');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      if (isSatellite) {
        svg.innerHTML = '<path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>';
        mapBtn.appendChild(svg);
        mapBtn.appendChild(document.createTextNode(' Map'));
        mapBtn.classList.remove('active');
      } else {
        svg.innerHTML = '<path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>';
        mapBtn.appendChild(svg);
        mapBtn.appendChild(document.createTextNode(' Satellite'));
        mapBtn.classList.add('active');
      }
      labelToggle.style.display = isSatellite ? 'flex' : 'none';
    });

    labelsCheckbox.addEventListener('change', () => {
      showLabels = labelsCheckbox.checked;
      applyMapType();
    });
  }

  function applyMapType() {
    if (isSatellite) {
      map.setMapTypeId(showLabels ? 'hybrid' : 'satellite');
    } else {
      map.setMapTypeId('roadmap');
    }
  }

  function handleRightClick(e) {
    const coordsText = `${e.latLng.lat().toFixed(6)}, ${e.latLng.lng().toFixed(6)}`;
    navigator.clipboard.writeText(coordsText).then(() => {
      LeucenaApp.showToast('Coordinates copied: ' + coordsText, 'success');
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = coordsText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      LeucenaApp.showToast('Coordinates copied: ' + coordsText, 'success');
    });
  }

  function deselectFromMap() {
    const main = document.getElementById('main-content');
    main.classList.remove('sidebar-open');
    const arrow = document.querySelector('.toggle-arrow');
    if (arrow) arrow.textContent = '\u00BB';
    LeucenaApp.deselectCell();
  }

  function setupRightClickCopy() {
    map.addListener('rightclick', handleRightClick);

    document.getElementById('map').addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  async function loadGrid() {
    try {
      const res = await fetch('/api/grid');
      const fc = await res.json();
      gridBounds = new google.maps.LatLngBounds();
      for (const feature of fc.features) {
        const props = feature.properties;
        gridData[props.id] = props;
        createGridPolygon(props.id, feature.geometry, props);
        for (const coord of feature.geometry.coordinates[0]) {
          gridBounds.extend({ lat: coord[1], lng: coord[0] });
        }
      }
      map.setOptions({
        restriction: {
          latLngBounds: gridBounds,
          strictBounds: false
        }
      });
    } catch (e) {
      LeucenaApp.showToast('Failed to load grid', 'error');
    }
  }

  function getStyleForCell(props, cellId) {
    const base = STATUS_STYLES[props.grid_status] || STATUS_STYLES.not_yet_finished;
    const isSelected = cellId !== undefined && cellId === selectedCellId;

    if (props.locked_by) {
      return {
        strokeColor: LOCKED_STROKE,
        strokeWeight: base.strokeWeight,
        strokeOpacity: 0.9,
        fillColor: base.fill,
        fillOpacity: 0.0
      };
    }
    if (isSelected) {
      return {
        strokeColor: SELECTED_STROKE,
        strokeWeight: 5,
        strokeOpacity: 1.0,
        fillColor: base.fill,
        fillOpacity: base.fillOpacity
      };
    }
    return {
      strokeColor: base.stroke,
      strokeWeight: base.strokeWeight,
      strokeOpacity: 0.8,
      fillColor: base.fill,
      fillOpacity: base.fillOpacity
    };
  }

  function createGridPolygon(cellId, geometry, props) {
    const coords = geometry.coordinates[0].map(c => ({ lat: c[1], lng: c[0] }));
    const style = getStyleForCell(props, cellId);

    const poly = new google.maps.Polygon({
      paths: coords,
      ...style,
      map: shouldShowCell(props) ? map : null,
      clickable: true,
      zIndex: 0
    });

    poly.addListener('mousemove', (e) => {
      const lat = e.latLng.lat().toFixed(6);
      const lng = e.latLng.lng().toFixed(6);
      lastCoords = `${lat}, ${lng}`;
      document.getElementById('coords-display').textContent = lastCoords;
    });

    poly.addListener('click', (e) => {
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.isDeletionMode && LeucenaApp.isDeletionMode()) {
        LeucenaApp.handleDeletionClick(e.latLng);
        return;
      }
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.isPointModeActive && LeucenaApp.isPointModeActive()) {
        return;
      }
      clickedOnFeature = true;
      if (LeucenaStreetView.isActive()) {
        LeucenaStreetView.showAt(e.latLng);
        return;
      }
      const currentData = LeucenaApp.getSelectedCellData();
      if (currentData && currentData.locked_by && currentData.locked_by === LeucenaApp.getUsername() && cellId !== LeucenaApp.getSelectedCellId()) {
        LeucenaApp.showToast('You are editing a tile. Click "Unlock" to stop editing first.', 'warning');
        return;
      }
      LeucenaApp.selectCell(cellId, gridData[cellId]);
    });

    poly.addListener('rightclick', (e) => {
      handleRightClick(e);
    });

    gridPolygons[cellId] = poly;
  }

  function shouldShowCell(props) {
    if (!showGrid) return false;
    return activeFilters.has(props.grid_status);
  }

  function updateCellAppearance(cellId, data) {
    gridData[cellId] = { ...gridData[cellId], ...data };
    const poly = gridPolygons[cellId];
    if (!poly) return;

    const props = gridData[cellId];
    const style = getStyleForCell(props, cellId);

    if (typeof LeucenaApp !== 'undefined' && LeucenaApp.isPointModeActive && LeucenaApp.isPointModeActive()) {
      style.fillOpacity = 0.0;
    }

    poly.setOptions({
      ...style,
      map: shouldShowCell(props) ? map : null
    });
  }

  function setSelectedCell(cellId) {
    const prevId = selectedCellId;
    selectedCellId = cellId;
    if (prevId != null && gridData[prevId]) {
      updateCellAppearance(prevId, gridData[prevId]);
    }
    if (cellId != null && gridData[cellId]) {
      updateCellAppearance(cellId, gridData[cellId]);
    }
  }

  function onCellLocked(cellId, lockedBy) {
    if (gridData[cellId]) {
      gridData[cellId].locked_by = lockedBy;
      updateCellAppearance(cellId, gridData[cellId]);
    }
  }

  function onCellUnlocked(cellId) {
    if (gridData[cellId]) {
      gridData[cellId].locked_by = null;
      updateCellAppearance(cellId, gridData[cellId]);
    }
  }

  function onCellStatusChanged(cellId, status, extra) {
    if (gridData[cellId]) {
      gridData[cellId].grid_status = status;
      if (extra && extra.finished_by) {
        gridData[cellId].finished_by = extra.finished_by;
      }
      updateCellAppearance(cellId, gridData[cellId]);
    }
  }

  function getGridData(cellId) {
    return gridData[cellId] || null;
  }

  async function loadPoints() {
    try {
      const res = await fetch('/api/points');
      const fc = await res.json();
      for (const feature of fc.features) {
        const [lng, lat] = feature.geometry.coordinates;
        const pointId = feature.properties.id;
        const isInvalid = feature.properties.not_valid === 1;

        const marker = new google.maps.Marker({
          position: { lat, lng },
          map: showPoints ? map : null,
          icon: getPointIcon(isInvalid),
          title: `Point #${feature.properties.fid}${isInvalid ? ' (invalid)' : ''}`,
          zIndex: 5
        });

        marker.addListener('click', () => {
          clickedOnFeature = true;
          if (LeucenaStreetView.isActive()) {
            LeucenaStreetView.showAt(marker.getPosition());
            return;
          }
          if (LeucenaDrawing.getActiveMode() === 'select') {
            togglePointValidity(pointId);
          }
        });

        marker.setClickable(false);

        pointMarkersById[pointId] = {
          marker,
          data: feature.properties
        };
      }
    } catch (e) {
      LeucenaApp.showToast('Failed to load points', 'error');
    }
  }

  function getPointIcon(isInvalid) {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 5,
      fillColor: isInvalid ? '#ef4444' : '#facc15',
      fillOpacity: 0.9,
      strokeColor: isInvalid ? '#991b1b' : '#854d0e',
      strokeWeight: 1.5
    };
  }

  async function togglePointValidity(pointId) {
    if (!LeucenaApp.isLoggedIn()) {
      LeucenaApp.showToast('Login to change point validity', 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/points/${pointId}/validity`, {
        method: 'PUT',
        headers: LeucenaApp.authHeaders()
      });
      if (!res.ok) {
        const err = await res.json();
        LeucenaApp.showToast(err.error, 'error');
        return;
      }
      const result = await res.json();
      updatePointAppearance(pointId, result.not_valid);
      LeucenaApp.showToast(
        result.not_valid ? 'Point marked as invalid' : 'Point marked as valid',
        'info'
      );
    } catch (e) {
      LeucenaApp.showToast('Failed to update point validity', 'error');
    }
  }

  function updatePointAppearance(pointId, notValid) {
    const entry = pointMarkersById[pointId];
    if (!entry) return;
    entry.data.not_valid = notValid;
    const isInvalid = notValid === 1;
    entry.marker.setIcon(getPointIcon(isInvalid));
    entry.marker.setTitle(`Point #${entry.data.fid}${isInvalid ? ' (invalid)' : ''}`);
  }

  function zoomToCell(cellId) {
    const bounds = getCellBounds(cellId);
    if (!bounds) return;

    map.setOptions({ restriction: null });

    const container = document.getElementById('map');
    const padH = Math.round(container.offsetWidth * 0.20);
    const padV = Math.round(container.offsetHeight * 0.20);
    map.fitBounds(bounds, { top: padV, right: padH, bottom: padV, left: padH });

    google.maps.event.addListenerOnce(map, 'idle', () => {
      map.setZoom(map.getZoom() + 1);
      restrictPanToCell(cellId);
    });
  }

  let panWarningListener = null;
  let panWarningShown = false;

  function restrictPanToCell(cellId) {
    const bounds = getCellBounds(cellId);
    if (!bounds) return;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const latSpan = ne.lat() - sw.lat();
    const lngSpan = ne.lng() - sw.lng();

    const expanded = new google.maps.LatLngBounds(
      { lat: sw.lat() - latSpan * 0.80, lng: sw.lng() - lngSpan * 0.80 },
      { lat: ne.lat() + latSpan * 0.80, lng: ne.lng() + lngSpan * 0.80 }
    );

    map.setOptions({
      restriction: {
        latLngBounds: expanded,
        strictBounds: false
      }
    });

    panWarningShown = false;
    if (panWarningListener) google.maps.event.removeListener(panWarningListener);
    panWarningListener = map.addListener('dragend', () => {
      const center = map.getCenter();
      if (!bounds.contains(center)) {
        if (!panWarningShown) {
          panWarningShown = true;
          LeucenaApp.showToast('You are panning away from the editing tile. Click "Unlock" to stop editing first.', 'warning', 5000);
          setTimeout(() => { panWarningShown = false; }, 6000);
        }
      }
    });
  }

  function releasePanRestriction() {
    if (panWarningListener) {
      google.maps.event.removeListener(panWarningListener);
      panWarningListener = null;
    }
    panWarningShown = false;
    map.setOptions({
      restriction: gridBounds ? { latLngBounds: gridBounds, strictBounds: false } : null
    });
  }

  function setupFilters() {
    document.querySelectorAll('[data-status]').forEach(cb => {
      cb.addEventListener('change', function () {
        const status = this.dataset.status;
        if (this.checked) {
          activeFilters.add(status);
        } else {
          activeFilters.delete(status);
        }
        refreshGridVisibility();
      });
    });

    document.getElementById('toggle-grid').addEventListener('change', function () {
      showGrid = this.checked;
      refreshGridVisibility();
    });

    document.getElementById('toggle-points').addEventListener('change', function () {
      showPoints = this.checked;
      for (const entry of Object.values(pointMarkersById)) {
        entry.marker.setMap(showPoints ? map : null);
      }
    });

    document.getElementById('toggle-polygons').addEventListener('change', function () {
      showPolygons = this.checked;
      if (typeof LeucenaDrawing !== 'undefined') {
        LeucenaDrawing.setVisible(showPolygons);
      }
    });
  }

  function refreshGridVisibility() {
    for (const [cellId, poly] of Object.entries(gridPolygons)) {
      const props = gridData[cellId];
      poly.setMap(shouldShowCell(props) ? map : null);
    }
  }

  function setFeaturesClickable(clickable) {
    for (const entry of Object.values(pointMarkersById)) {
      entry.marker.setClickable(clickable);
    }
    if (typeof LeucenaDrawing !== 'undefined') {
      LeucenaDrawing.setClickable(clickable);
    }
  }

  function showStreetViewCoverage(show) {
    svCoverageLayer.setMap(show ? map : null);
  }

  function getMap() { return map; }

  function getCellBounds(cellId) {
    const poly = gridPolygons[cellId];
    if (!poly) return null;
    const bounds = new google.maps.LatLngBounds();
    poly.getPath().forEach(p => bounds.extend(p));
    return bounds;
  }

  function getShowPolygons() { return showPolygons; }

  function setGridsHollow(hollow) {
    for (const [cellId, poly] of Object.entries(gridPolygons)) {
      if (hollow) {
        poly.setOptions({ fillOpacity: 0.0 });
      } else {
        const props = gridData[cellId];
        const style = getStyleForCell(props, cellId);
        poly.setOptions({ fillOpacity: style.fillOpacity });
      }
    }
  }

  function setMapBorder(show) {
    const mapDiv = document.getElementById('map-container');
    if (show) {
      mapDiv.classList.add('insertion-mode-active');
    } else {
      mapDiv.classList.remove('insertion-mode-active');
    }
  }

  function addPointMarker(pointData) {
    const { id, fid, geometry, not_valid } = pointData;
    if (pointMarkersById[id]) return pointMarkersById[id].marker;
    const [lng, lat] = geometry.coordinates;
    const isInvalid = not_valid === 1;

    const marker = new google.maps.Marker({
      position: { lat, lng },
      map: showPoints ? map : null,
      icon: getPointIcon(isInvalid),
      title: `Point #${fid}${isInvalid ? ' (invalid)' : ''}`,
      zIndex: 5
    });

    marker.addListener('click', () => {
      clickedOnFeature = true;
      if (LeucenaStreetView.isActive()) {
        LeucenaStreetView.showAt(marker.getPosition());
        return;
      }
      if (LeucenaDrawing.getActiveMode() === 'select') {
        togglePointValidity(id);
      }
    });

    marker.setClickable(false);

    pointMarkersById[id] = { marker, data: { id, fid, not_valid } };
    return marker;
  }

  function removePointMarker(pointId) {
    const entry = pointMarkersById[pointId];
    if (!entry) return;
    entry.marker.setMap(null);
    delete pointMarkersById[pointId];
  }

  function getLastCoords() { return lastCoords; }

  function findNearestPoint(latLng, radiusPx) {
    const projection = map.getProjection();
    if (!projection) return null;

    const zoom = map.getZoom();
    const scale = Math.pow(2, zoom);
    const clickWorld = projection.fromLatLngToPoint(latLng);
    const clickPx = { x: clickWorld.x * scale, y: clickWorld.y * scale };

    let nearest = null;
    let minDist = Infinity;

    for (const [id, entry] of Object.entries(pointMarkersById)) {
      if (!entry.marker.getMap()) continue;
      const pos = entry.marker.getPosition();
      const ptWorld = projection.fromLatLngToPoint(pos);
      const ptPx = { x: ptWorld.x * scale, y: ptWorld.y * scale };

      const dx = clickPx.x - ptPx.x;
      const dy = clickPx.y - ptPx.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDist && dist <= radiusPx) {
        minDist = dist;
        nearest = { id: Number(id), data: entry.data, dist };
      }
    }
    return nearest;
  }

  function getPointData(pointId) {
    const entry = pointMarkersById[pointId];
    if (!entry) return null;
    const pos = entry.marker.getPosition();
    return { ...entry.data, lat: pos.lat(), lng: pos.lng() };
  }

  return {
    init,
    getMap,
    updateCellAppearance,
    onCellLocked,
    onCellUnlocked,
    onCellStatusChanged,
    getCellBounds,
    getShowPolygons,
    showStreetViewCoverage,
    zoomToCell,
    restrictPanToCell,
    releasePanRestriction,
    updatePointAppearance,
    getGridData,
    setSelectedCell,
    setFeaturesClickable,
    setGridsHollow,
    setMapBorder,
    addPointMarker,
    removePointMarker,
    getLastCoords,
    findNearestPoint,
    getPointData
  };
})();

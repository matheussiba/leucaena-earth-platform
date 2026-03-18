window.LeucenaMap = (function () {
  let map = null;
  let svCoverageLayer = null;
  const gridPolygons = {};
  const gridData = {};
  const pointMarkersById = {};
  const POINT_LAYERS = ['crowdmapping', 'inaturalist', 'gbif', 'insthorus', 'specieslink'];
  let activeFilters = new Set(['not_yet_finished', 'in_use', 'mapping', 'no_points', 'finished']);
  let visiblePointLayers = new Set(['crowdmapping']);
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
    no_points:        { fill: '#d4d4d8', stroke: '#9ca3af', fillOpacity: 0.50, strokeWeight: 1.5, zIndex: 0 },
    mapping:          { fill: '#FFFF59', stroke: '#a16207', fillOpacity: 0.50, strokeWeight: 1.5, zIndex: 1 },
    not_yet_finished: { fill: '#7c3aed', stroke: '#7c3aed', fillOpacity: 0.20, strokeWeight: 1.5, zIndex: 2 },
    finished:         { fill: '#22c55e', stroke: '#94FB54', fillOpacity: 0.50, strokeWeight: 1.5, zIndex: 3 },
    in_use:           { fill: 'transparent', stroke: '#eab308', fillOpacity: 0.0,  strokeWeight: 10, zIndex: 4 }
  };

  const LOCKED_STROKE = '#fde047';

  let initialZoom = null;
  let initialCenter = null;

  function init() {
    map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: -22.5, lng: -48.5 },
      zoom: 7,
      mapTypeId: 'satellite',
      mapTypeControl: false,
      zoomControl: false,
      cameraControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy',
      padding: { top: 56, bottom: 48, left: 0, right: 0 }
    });

    document.getElementById('tool-zoom-in').addEventListener('click', () => {
      map.setZoom(map.getZoom() + 1);
    });
    document.getElementById('tool-zoom-out').addEventListener('click', () => {
      map.setZoom(map.getZoom() - 1);
    });

    map.addListener('zoom_changed', updateZoomButtons);

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
      const label = document.getElementById('maptype-label');
      if (isSatellite) {
        label.textContent = LeucenaI18n.t('tool.map');
        mapBtn.classList.remove('active');
      } else {
        label.textContent = LeucenaI18n.t('tool.satellite');
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

  let rightDownTime = 0;

  function handleRightClick(e) {
    if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.getActiveMode() === 'draw') return;
    const held = Date.now() - rightDownTime;
    if (held < 2000) return;

    const coordsText = `${e.latLng.lat().toFixed(6)}, ${e.latLng.lng().toFixed(6)}`;
    navigator.clipboard.writeText(coordsText).then(() => {
      LeucenaApp.showToast(LeucenaI18n.t('toast.coordsCopied', coordsText), 'success');
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = coordsText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      LeucenaApp.showToast(LeucenaI18n.t('toast.coordsCopied', coordsText), 'success');
    });
  }

  function deselectFromMap() {
    if (typeof LeucenaApp !== 'undefined' && LeucenaApp.isEditing && LeucenaApp.isEditing()) return;
    const main = document.getElementById('main-content');
    main.classList.remove('sidebar-open');
    const arrow = document.querySelector('.toggle-arrow');
    if (arrow) arrow.textContent = '\u00BB';
    const legend = document.getElementById('map-legend');
    if (legend) legend.classList.remove('legend-hidden');
    LeucenaApp.deselectCell();
  }

  function setupRightClickCopy() {
    map.addListener('rightclick', handleRightClick);

    const mapDiv = document.getElementById('map');
    mapDiv.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
    mapDiv.addEventListener('mousedown', (e) => {
      if (e.button === 2) rightDownTime = Date.now();
    });
  }

  function getGeometryRings(geometry) {
    if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates.map(p => p[0]);
    }
    return [geometry.coordinates[0]];
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
        const rings = getGeometryRings(feature.geometry);
        for (const ring of rings) {
          for (const coord of ring) {
            gridBounds.extend({ lat: coord[1], lng: coord[0] });
          }
        }
      }
      map.fitBounds(gridBounds);
      google.maps.event.addListenerOnce(map, 'idle', () => {
        initialZoom = map.getZoom();
        initialCenter = map.getCenter();
        map.setOptions({
          restriction: {
            latLngBounds: gridBounds,
            strictBounds: false
          }
        });
        const zoomListener = map.addListener('zoom_changed', () => {
          google.maps.event.removeListener(zoomListener);
          if (typeof LeucenaApp !== 'undefined' && LeucenaApp.collapseLegendOnFirstZoom) {
            LeucenaApp.collapseLegendOnFirstZoom();
          }
        });
      });
      updateFilterCounts();
    } catch (e) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.gridLoadFail'), 'error');
    }
  }

  function getStyleForCell(props, cellId) {
    const base = STATUS_STYLES[props.grid_status] || STATUS_STYLES.not_yet_finished;
    const isSelected = cellId !== undefined && cellId === selectedCellId;
    const z = base.zIndex !== undefined ? base.zIndex : 0;

    if (props.locked_by) {
      return {
        strokeColor: LOCKED_STROKE,
        strokeWeight: base.strokeWeight,
        strokeOpacity: 0.9,
        fillColor: base.fill,
        fillOpacity: 0.0,
        zIndex: z
      };
    }
    if (isSelected) {
      return {
        strokeColor: SELECTED_STROKE,
        strokeWeight: 5,
        strokeOpacity: 1.0,
        fillColor: base.fill,
        fillOpacity: base.fillOpacity,
        zIndex: z
      };
    }
    return {
      strokeColor: base.stroke,
      strokeWeight: base.strokeWeight,
      strokeOpacity: 0.8,
      fillColor: base.fill,
      fillOpacity: base.fillOpacity,
      zIndex: z
    };
  }

  function createGridPolygon(cellId, geometry, props) {
    const rings = getGeometryRings(geometry);
    const paths = rings.map(ring => ring.map(c => ({ lat: c[1], lng: c[0] })));
    const style = getStyleForCell(props, cellId);

    const poly = new google.maps.Polygon({
      paths: paths,
      ...style,
      map: shouldShowCell(props) ? map : null,
      clickable: true
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
        LeucenaApp.showToast(LeucenaI18n.t('toast.editingWarning'), 'warning');
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
      updateFilterCounts();
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
        const status = feature.properties.status || 0;
        const layer = feature.properties.layer || 'crowdmapping';

        const marker = new google.maps.Marker({
          position: { lat, lng },
          map: isPointLayerVisible(layer) ? map : null,
          icon: getPointIcon(status, layer),
          title: getPointTitle(feature.properties.fid, status),
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
      updateFilterCounts();
    } catch (e) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.pointsLoadFail'), 'error');
    }
  }

  function getPointTitle(fid, status) {
    if (status === 1) return LeucenaI18n.t('point.titleInvalid', fid);
    if (status === 2) return LeucenaI18n.t('point.titleDoubt', fid);
    return LeucenaI18n.t('point.title', fid);
  }

  const LAYER_STROKE_COLORS = {
    crowdmapping: '#DE9958',
    inaturalist:  '#505752',
    gbif:         '#2B526D',
    insthorus:    '#000000',
    specieslink:  '#7F2E74'
  };

  function getPointIcon(status, layer) {
    if (status === 1) {
      return { path: google.maps.SymbolPath.CIRCLE, scale: 4, fillColor: '#ef4444', fillOpacity: 0.9, strokeColor: '#991b1b', strokeWeight: 0.8 };
    }
    if (status === 2) {
      return { path: google.maps.SymbolPath.CIRCLE, scale: 4, fillColor: '#ef4444', fillOpacity: 0.9, strokeColor: '#ffffff', strokeWeight: 0.8 };
    }
    const strokeColor = LAYER_STROKE_COLORS[layer] || '#000000';
    return { path: google.maps.SymbolPath.CIRCLE, scale: 4, fillColor: '#84cc16', fillOpacity: 0.9, strokeColor, strokeWeight: 0.8 };
  }

  async function togglePointValidity(pointId) {
    if (!LeucenaApp.isLoggedIn()) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.loginToToggle'), 'warning');
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
      updatePointAppearance(pointId, result.status);
      const statusMessages = {
        0: LeucenaI18n.t('toast.markedValid'),
        1: LeucenaI18n.t('toast.markedInvalid'),
        2: LeucenaI18n.t('toast.markedDoubt')
      };
      LeucenaApp.showToast(statusMessages[result.status] || statusMessages[0], 'info');
    } catch (e) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.validityFail'), 'error');
    }
  }

  function updatePointAppearance(pointId, newStatus) {
    const entry = pointMarkersById[pointId];
    if (!entry) return;
    entry.data.status = newStatus;
    entry.data.not_valid = newStatus;
    const layer = entry.data.layer || 'crowdmapping';
    entry.marker.setIcon(getPointIcon(newStatus, layer));
    entry.marker.setTitle(getPointTitle(entry.data.fid, newStatus));
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

  function zoomToCellViewOnly(cellId) {
    const bounds = getCellBounds(cellId);
    if (!bounds) return;
    map.setOptions({ restriction: null });
    releasePanRestriction();
    const center = bounds.getCenter();
    const container = document.getElementById('map');
    const padH = Math.round(container.offsetWidth * 0.20);
    const padV = Math.round(container.offsetHeight * 0.20);
    map.fitBounds(bounds, { top: padV, right: padH, bottom: padV, left: padH });
    google.maps.event.addListenerOnce(map, 'idle', () => {
      map.setCenter(center);
      map.setZoom(map.getZoom() + 1);
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
          LeucenaApp.showToast(LeucenaI18n.t('toast.panWarning'), 'warning', 5000);
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

  function syncGridParent() {
    const parent = document.getElementById('toggle-grid');
    const children = document.querySelectorAll('[data-status]');
    const checkedCount = Array.from(children).filter(c => c.checked).length;
    parent.checked = checkedCount > 0;
    parent.indeterminate = checkedCount > 0 && checkedCount < children.length;
    showGrid = checkedCount > 0;
  }

  function syncPointsParent() {
    const parent = document.getElementById('toggle-points');
    const children = document.querySelectorAll('[data-layer]');
    const checkedCount = Array.from(children).filter(c => c.checked).length;
    parent.checked = checkedCount > 0;
    parent.indeterminate = checkedCount > 0 && checkedCount < children.length;
    showPoints = checkedCount > 0;
  }

  function setupFilters() {
    const statusCheckboxes = document.querySelectorAll('[data-status]');
    statusCheckboxes.forEach(cb => {
      cb.addEventListener('change', function () {
        const status = this.dataset.status;
        if (this.checked) activeFilters.add(status);
        else activeFilters.delete(status);
        syncGridParent();
        refreshGridVisibility();
      });
    });

    document.getElementById('toggle-grid').addEventListener('change', function () {
      const checked = this.checked;
      this.indeterminate = false;
      showGrid = checked;
      statusCheckboxes.forEach(cb => {
        cb.checked = checked;
        if (checked) activeFilters.add(cb.dataset.status);
        else activeFilters.delete(cb.dataset.status);
      });
      refreshGridVisibility();
    });

    const layerCheckboxes = document.querySelectorAll('[data-layer]');
    layerCheckboxes.forEach(cb => {
      cb.addEventListener('change', function () {
        const layer = this.dataset.layer;
        if (this.checked) visiblePointLayers.add(layer);
        else visiblePointLayers.delete(layer);
        syncPointsParent();
        refreshPointVisibility();
      });
    });

    document.getElementById('toggle-points').addEventListener('change', function () {
      const checked = this.checked;
      this.indeterminate = false;
      showPoints = checked;
      if (checked) {
        POINT_LAYERS.forEach(l => visiblePointLayers.add(l));
        layerCheckboxes.forEach(cb => { cb.checked = true; });
      } else {
        visiblePointLayers.clear();
        layerCheckboxes.forEach(cb => { cb.checked = false; });
      }
      refreshPointVisibility();
    });

    document.getElementById('toggle-polygons').addEventListener('change', function () {
      showPolygons = this.checked;
      if (typeof LeucenaDrawing !== 'undefined') {
        LeucenaDrawing.setVisible(showPolygons);
      }
    });

    syncPointsParent();
  }

  function refreshGridVisibility() {
    for (const [cellId, poly] of Object.entries(gridPolygons)) {
      const props = gridData[cellId];
      poly.setMap(shouldShowCell(props) ? map : null);
    }
  }

  function updateFilterCounts() {
    const statusCounts = { not_yet_finished: 0, in_use: 0, mapping: 0, no_points: 0, finished: 0 };
    let gridTotal = 0;
    for (const props of Object.values(gridData)) {
      gridTotal++;
      if (statusCounts[props.grid_status] !== undefined) statusCounts[props.grid_status]++;
    }
    const setText = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = '(' + n + ')'; };
    setText('count-grid-total', gridTotal);
    setText('count-not_yet_finished', statusCounts.not_yet_finished);
    setText('count-in_use', statusCounts.in_use);
    setText('count-mapping', statusCounts.mapping);
    setText('count-no_points', statusCounts.no_points);
    setText('count-finished', statusCounts.finished);

    const layerCounts = { crowdmapping: 0, inaturalist: 0, gbif: 0, insthorus: 0, specieslink: 0 };
    let pointsTotal = 0;
    for (const entry of Object.values(pointMarkersById)) {
      pointsTotal++;
      const l = entry.data.layer || 'crowdmapping';
      if (layerCounts[l] !== undefined) layerCounts[l]++;
    }
    setText('count-points-total', pointsTotal);
    setText('count-crowdmapping', layerCounts.crowdmapping);
    setText('count-inaturalist', layerCounts.inaturalist);
    setText('count-gbif', layerCounts.gbif);
    setText('count-insthorus', layerCounts.insthorus);
    setText('count-specieslink', layerCounts.specieslink);

    const polyCount = (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.getPolygonCount) ? LeucenaDrawing.getPolygonCount() : 0;
    setText('count-polygons-total', polyCount);
  }

  function setFeaturesClickable(clickable) {
    for (const entry of Object.values(pointMarkersById)) {
      entry.marker.setClickable(clickable);
    }
    if (typeof LeucenaDrawing !== 'undefined') {
      LeucenaDrawing.setClickable(clickable);
    }
  }

  function setGridClickable(clickable) {
    for (const poly of Object.values(gridPolygons)) {
      poly.setOptions({ clickable });
    }
  }

  function updateZoomButtons() {
    const zoom = map.getZoom();
    const minZoom = initialZoom != null ? initialZoom : (map.minZoom || 0);
    const maxZoom = map.maxZoom || 22;
    document.getElementById('tool-zoom-out').disabled = (zoom <= minZoom);
    document.getElementById('tool-zoom-in').disabled = (zoom >= maxZoom);
  }

  function showStreetViewCoverage(show) {
    svCoverageLayer.setMap(show ? map : null);
  }

  function getMap() { return map; }

  function getCellBounds(cellId) {
    const poly = gridPolygons[cellId];
    if (!poly) return null;
    const bounds = new google.maps.LatLngBounds();
    poly.getPaths().forEach(path => {
      path.forEach(p => bounds.extend(p));
    });
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
    const { id, fid, geometry } = pointData;
    const status = pointData.status || 0;
    const layer = pointData.layer || 'crowdmapping';
    if (pointMarkersById[id]) return pointMarkersById[id].marker;
    const [lng, lat] = geometry.coordinates;

    const marker = new google.maps.Marker({
      position: { lat, lng },
      map: isPointLayerVisible(layer) ? map : null,
      icon: getPointIcon(status, layer),
      title: getPointTitle(fid, status),
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

    pointMarkersById[id] = { marker, data: { id, fid, status, layer, not_valid: status } };
    updateFilterCounts();
    return marker;
  }

  function isPointLayerVisible(layer) {
    const key = (layer || 'crowdmapping').toLowerCase();
    return showPoints && visiblePointLayers.has(key);
  }

  function refreshPointVisibility() {
    for (const entry of Object.values(pointMarkersById)) {
      const layer = entry.data.layer || 'crowdmapping';
      entry.marker.setMap(isPointLayerVisible(layer) ? map : null);
    }
  }

  function removePointMarker(pointId) {
    const entry = pointMarkersById[pointId];
    if (!entry) return;
    entry.marker.setMap(null);
    delete pointMarkersById[pointId];
    updateFilterCounts();
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

  function zoomToInitialView() {
    if (!gridBounds) return;
    map.setOptions({ restriction: null });
    if (initialZoom != null && initialCenter) {
      map.setCenter(initialCenter);
      map.setZoom(initialZoom);
    } else {
      map.fitBounds(gridBounds);
    }
    google.maps.event.addListenerOnce(map, 'idle', () => {
      map.setOptions({
        restriction: { latLngBounds: gridBounds, strictBounds: false }
      });
    });
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
    zoomToCellViewOnly,
    restrictPanToCell,
    releasePanRestriction,
    updatePointAppearance,
    getGridData,
    setSelectedCell,
    setFeaturesClickable,
    setGridsHollow,
    setGridClickable,
    setMapBorder,
    addPointMarker,
    removePointMarker,
    getLastCoords,
    findNearestPoint,
    getPointData,
    zoomToInitialView,
    updateFilterCounts
  };
})();

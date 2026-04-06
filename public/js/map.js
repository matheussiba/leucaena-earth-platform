window.LeucenaMap = (function () { // IIFE: init, grid cells, occurrence points, filters, viewport-based perf
  let map = null;
  let svCoverageLayer = null;
  const gridPolygons = {};
  const gridData = {};
  const gridCellBounds = {}; // LatLngBounds per cell for viewport culling
  const pointMarkersById = {};
  const POINT_LAYERS = ['crowdmapping', 'inaturalist', 'gbif', 'insthorus', 'specieslink'];
  let activeFilters = new Set(['not_yet_finished', 'in_use', 'mapping', 'no_points', 'finished']);
  let visiblePointLayers = new Set(['crowdmapping', 'inaturalist', 'gbif', 'insthorus', 'specieslink']); // all layers on load so every point type shows
  let showGrid = true;
  let showPoints = true;
  let showPolygons = true;
  let originalRestriction = null;
  let gridBounds = null;
  let selectedCellId = null;
  const selectedPointIds = new Set();
  let lastCoords = null;
  let clickedOnFeature = false;
  let spiderfiedGroup = null;
  const SPIDERFY_OFFSET = 0.00015;
  let previewMode = false;
  let previewTimer = null;
  let _editMinZoom = 12;
  let _editZoomEnforced = false;
  let _zoomWarnCount = 0;
  let pointClusterer = null; // MarkerClusterer; lazily created in ensureClusterer()

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
      mapTypeId: 'hybrid',
      mapTypeControl: false,
      zoomControl: false,
      cameraControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy',
      padding: { top: 56, bottom: 48, left: 0, right: 0 }
    });

    document.getElementById('tool-zoom-in').addEventListener('click', () => {
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) LeucenaApp.logEvent('zoom_in', null, null, { zoom: map.getZoom() + 1 });
      map.setZoom(map.getZoom() + 1);
    });
    document.getElementById('tool-zoom-out').addEventListener('click', () => {
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) LeucenaApp.logEvent('zoom_out', null, null, { zoom: map.getZoom() - 1 });
      map.setZoom(map.getZoom() - 1);
    });

    let _prevPointScale = getPointScale(); // icon scale flips at zoom 14↔15 only—skip refresh on every zoom tick
    map.addListener('zoom_changed', () => {
      if (_editZoomEnforced && map.getZoom() <= _editMinZoom && _zoomWarnCount < 1) {
        _zoomWarnCount++;
        LeucenaApp.showToast(LeucenaI18n.t('toast.zoomMinEdit'), 'warning');
      }
      updateZoomButtons();
      updateAreaLabelsForZoom();
      const newScale = getPointScale();
      if (newScale !== _prevPointScale) {
        _prevPointScale = newScale;
        refreshPointIcons();
      }
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
      if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.getActiveMode() === 'edit' && LeucenaDrawing.isEditModified()) {
        LeucenaDrawing.exitEditMode();
        return;
      }
      deselectPoint();
      if (LeucenaStreetView.isActive()) {
        const drawMode = typeof LeucenaDrawing !== 'undefined' ? LeucenaDrawing.getActiveMode() : null;
        if (drawMode === 'draw') return;
        LeucenaStreetView.showAt(e.latLng);
        return;
      }
      deselectFromMap();
    });

    // Log map interactions when a cell is locked for editing
    map.addListener('click', (e) => {
      if (LeucenaApp.isEditing && LeucenaApp.isEditing()) {
        LeucenaApp.logEvent('map_click_left', LeucenaApp.getSelectedCellId(), null, {
          lat: e.latLng.lat(), lng: e.latLng.lng()
        });
      }
    });
    map.addListener('rightclick', (e) => {
      if (LeucenaApp.isEditing && LeucenaApp.isEditing()) {
        LeucenaApp.logEvent('map_click_right', LeucenaApp.getSelectedCellId(), null, {
          lat: e.latLng.lat(), lng: e.latLng.lng()
        });
      }
    });
    map.addListener('dragend', () => {
      if (LeucenaApp.isEditing && LeucenaApp.isEditing()) {
        const c = map.getCenter();
        LeucenaApp.logEvent('map_pan', LeucenaApp.getSelectedCellId(), null, {
          lat: c.lat(), lng: c.lng(), zoom: map.getZoom()
        });
      }
    });
    map.getDiv().addEventListener('wheel', () => {
      if (LeucenaApp.isEditing && LeucenaApp.isEditing()) {
        LeucenaApp.logEvent('map_scroll', LeucenaApp.getSelectedCellId(), null, {
          zoom: map.getZoom()
        });
      }
    }, { passive: true });

    setupRightClickCopy();
    setupBasemapToggle();
    loadGrid();
    loadPoints();
    setupFilters();
  }

  let isSatellite = true;
  let showLabels = true;
  let labelsUserControlled = false;

  function setupBasemapToggle() {
    const mapBtn = document.getElementById('tool-maptype');
    const labelsCheckbox = document.getElementById('tool-labels');
    const labelToggle = document.getElementById('label-toggle');

    labelsCheckbox.checked = true;

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
      labelsUserControlled = true;
      showLabels = labelsCheckbox.checked;
      applyMapType();
    });
  }

  function collapseLabelsOnFirstZoom() {
    if (labelsUserControlled) return;
    labelsUserControlled = true;
    showLabels = false;
    const cb = document.getElementById('tool-labels');
    if (cb) cb.checked = false;
    applyMapType();
  }

  function applyMapType() {
    if (isSatellite) {
      map.setMapTypeId(showLabels ? 'hybrid' : 'satellite');
    } else {
      map.setMapTypeId('roadmap');
    }
  }

  let rightHoldTimer = null;

  function copyCoordinates(coordsText) {
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

  function handleRightClick(e) {
    if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.getActiveMode() === 'draw') return;
    if (!e || !e.latLng) return;
    const coordsText = `${e.latLng.lat().toFixed(6)}, ${e.latLng.lng().toFixed(6)}`;
    copyCoordinates(coordsText);
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
    const mapDiv = document.getElementById('map');
    mapDiv.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
    mapDiv.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        clearTimeout(rightHoldTimer);
        rightHoldTimer = setTimeout(() => {
          if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.getActiveMode() === 'draw') return;
          if (!lastCoords) return;
          copyCoordinates(lastCoords);
          rightHoldTimer = null;
        }, 2000);
      }
    });
    mapDiv.addEventListener('mouseup', (e) => {
      if (e.button === 2 && rightHoldTimer) {
        clearTimeout(rightHoldTimer);
        rightHoldTimer = null;
      }
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
      map.addListener('idle', () => { // after pan/zoom: viewport cull grids, points, and drawing polygons
        refreshGridVisibility();
        refreshPointVisibility();
        if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.refreshPolyVisibility) LeucenaDrawing.refreshPolyVisibility();
      });
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
          collapseLabelsOnFirstZoom();
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

    const cellBnds = new google.maps.LatLngBounds(); // bounds for culling; polygon stays map:null until idle shows in-viewport cells
    for (const coord of rings[0]) {
      cellBnds.extend({ lat: coord[1], lng: coord[0] });
    }
    gridCellBounds[cellId] = cellBnds;

    const poly = new google.maps.Polygon({
      paths: paths,
      ...style,
      map: null,
      clickable: true
    });

    poly.addListener('mousemove', (e) => {
      const lat = e.latLng.lat().toFixed(6);
      const lng = e.latLng.lng().toFixed(6);
      lastCoords = `${lat}, ${lng}`;
      document.getElementById('coords-display').textContent = lastCoords;
      // Keep drawing.js cursor position in sync when grid cells capture mousemove
      if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.updateMouseLatLng) {
        LeucenaDrawing.updateMouseLatLng(e.latLng);
      }
    });

    poly.addListener('click', (e) => {
      if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.getActiveMode() === 'edit' && LeucenaDrawing.isEditModified()) {
        clickedOnFeature = true;
        LeucenaDrawing.exitEditMode();
        return;
      }
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.isDeletionMode && LeucenaApp.isDeletionMode()) {
        LeucenaApp.handleDeletionClick(e.latLng);
        return;
      }
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.isPointModeActive && LeucenaApp.isPointModeActive()) {
        return;
      }
      // In draw/hole/delete mode, grid cell clicks should not trigger cell selection
      if (typeof LeucenaDrawing !== 'undefined') {
        const dm = LeucenaDrawing.getActiveMode();
        if (dm === 'draw' || dm === 'hole' || dm === 'delete') return;
      }
      clickedOnFeature = true;
      deselectPoint();
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
    deselectPoint();
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
    deselectPoint();
    if (gridData[cellId]) {
      gridData[cellId].locked_by = lockedBy;
      updateCellAppearance(cellId, gridData[cellId]);
    }
  }

  function onCellUnlocked(cellId) {
    deselectPoint();
    if (gridData[cellId]) {
      gridData[cellId].locked_by = null;
      updateCellAppearance(cellId, gridData[cellId]);
    }
  }

  function onCellStatusChanged(cellId, status, extra) {
    if (gridData[cellId]) {
      gridData[cellId].grid_status = status;
      if (extra && extra.finished_by !== undefined) {
        gridData[cellId].finished_by = extra.finished_by;
      }
      if (extra && extra.worked_by !== undefined) {
        gridData[cellId].worked_by = extra.worked_by;
      }
      updateCellAppearance(cellId, gridData[cellId]);
      updateFilterCounts();
    }
  }

  function getGridData(cellId) {
    return gridData[cellId] || null;
  }

  function createPointMarkerObj(pointId, lat, lng, status, layer, fid) { // factory: map:null; clusterer or idle attaches
    const marker = new google.maps.Marker({
      position: { lat, lng },
      map: null,
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
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.isDeletionMode && LeucenaApp.isDeletionMode()) {
        LeucenaApp.handleDeletionClick(marker.getPosition());
        return;
      }
      if (LeucenaDrawing.getActiveMode() === 'select') {
        handlePointClick(pointId);
      }
    });

    marker.addListener('rightclick', () => {
      if (previewMode) return;
      if (selectedPointIds.has(pointId)) {
        togglePointValidity(pointId);
      }
    });

    marker.setClickable(false);
    return marker;
  }

  function clusterRenderer({ count, position }) { // custom SVG: 3 count tiers, log-scaled radius, abbreviated labels (e.g. 1k)
    let bg, bgOuter, text;
    if (count >= 100)     { bg = '#F97316'; bgOuter = 'rgba(249,115,22,0.25)'; text = '#7c2d12'; }
    else if (count >= 20) { bg = '#FACC15'; bgOuter = 'rgba(250,204,21,0.25)'; text = '#713f12'; }
    else                  { bg = '#7DD3FC'; bgOuter = 'rgba(125,211,252,0.25)'; text = '#0c4a6e'; }
    const r = Math.min(10 + Math.floor(Math.log10(count)) * 3, 15);
    const outerR = r + 4;
    const size = outerR * 2 + 2;
    const cx = size / 2;
    const cy = size / 2;
    const fontSize = count >= 1000 ? 9 : 10;
    const label = count >= 1000 ? Math.round(count / 1000) + 'k' : String(count);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
        `<circle cx="${cx}" cy="${cy}" r="${outerR}" fill="${bgOuter}"/>` +
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${bg}" opacity="0.9"/>` +
        `<circle cx="${cx}" cy="${cy}" r="${r - 3}" fill="white" opacity="0.25"/>` +
        `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" ` +
          `fill="${text}" font-size="${fontSize}" font-weight="700" font-family="system-ui,sans-serif">${label}</text>` +
      `</svg>`;
    return new google.maps.Marker({
      position,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(size, size),
        anchor: new google.maps.Point(cx, cy)
      },
      zIndex: 1000 + count
    });
  }

  function ensureClusterer() {
    if (!pointClusterer && map && typeof markerClusterer !== 'undefined') {
      pointClusterer = new markerClusterer.MarkerClusterer({
        map,
        markers: [],
        algorithmOptions: { maxZoom: 10 },
        renderer: { render: clusterRenderer },
        onClusterClick: (event, cluster, gMap) => {
          const pos = cluster.position || (event && event.latLng);
          if (!pos) return;
          const fromZoom = gMap.getZoom();
          const toZoom = Math.min(fromZoom + 3, 18);
          const clickLat = event && event.latLng ? event.latLng.lat() : null;
          const clickLng = event && event.latLng ? event.latLng.lng() : null;
          if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
            LeucenaApp.logEvent('cluster_click', LeucenaApp.getSelectedCellId(), null, {
              clickLat, clickLng,
              clusterLat: pos.lat(), clusterLng: pos.lng(),
              count: cluster.markers ? cluster.markers.length : 0,
              fromZoom, toZoom
            });
          }
          gMap.setZoom(toZoom);
          gMap.panTo(pos);
        }
      });
    }
  }

  async function loadPoints() { // batch-add layer-visible markers to clusterer; idle then syncs to viewport
    try {
      const res = await fetch('/api/points');
      const fc = await res.json();
      const visibleMarkers = [];
      for (const feature of fc.features) {
        const [lng, lat] = feature.geometry.coordinates;
        const pointId = feature.properties.id;
        const status = feature.properties.status || 0;
        const layer = feature.properties.layer || 'crowdmapping';

        const marker = createPointMarkerObj(pointId, lat, lng, status, layer, feature.properties.fid);

        pointMarkersById[pointId] = {
          marker,
          data: feature.properties
        };

        if (isPointLayerVisible(layer)) {
          visibleMarkers.push(marker);
        }
      }

      ensureClusterer();
      if (pointClusterer) {
        pointClusterer.addMarkers(visibleMarkers, true);
      }

      refreshPointVisibility();
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

  const LAYER_STROKE_COLORS = { // distinct outlines per data source for at-a-glance identification
    crowdmapping: '#DE9958',
    inaturalist:  '#1B9E3E',
    gbif:         '#2B526D',
    insthorus:    '#000000',
    specieslink:  '#7F2E74'
  };

  function getPointScale() { // smaller markers below zoom 15 to cut clutter at medium zoom
    if (!map) return 4;
    const z = map.getZoom();
    return z >= 15 ? 4 : 3;
  }

  function getPointIcon(status, layer) {
    const s = getPointScale();
    if (status === 1) {
      return { path: google.maps.SymbolPath.CIRCLE, scale: s, fillColor: '#ef4444', fillOpacity: 0.9, strokeColor: '#991b1b', strokeWeight: 1.6 };
    }
    if (status === 2) {
      return { path: google.maps.SymbolPath.CIRCLE, scale: s, fillColor: '#ef4444', fillOpacity: 0.9, strokeColor: '#ffffff', strokeWeight: 1.6 };
    }
    const strokeColor = LAYER_STROKE_COLORS[layer] || '#000000';
    return { path: google.maps.SymbolPath.CIRCLE, scale: s, fillColor: '#84cc16', fillOpacity: 0.9, strokeColor, strokeWeight: 1.6 };
  }

  function getSelectedPointIcon(status, layer) {
    const base = getPointIcon(status, layer);
    return { ...base, strokeColor: SELECTED_STROKE, strokeWeight: 2.4, scale: base.scale + 1 };
  }

  function refreshPointIcons() { // full pass on icons—only invoked on scale-threshold zoom crossings
    for (const entry of Object.values(pointMarkersById)) {
      if (selectedPointIds.has(entry.data.id)) {
        entry.marker.setIcon(getSelectedPointIcon(entry.data.status || entry.data.not_valid || 0, entry.data.layer));
      } else {
        entry.marker.setIcon(getPointIcon(entry.data.status || entry.data.not_valid || 0, entry.data.layer));
      }
    }
  }

  function getOriginalPosition(pointId) {
    if (spiderfiedGroup) {
      const item = spiderfiedGroup.items.find(i => i.id === pointId);
      if (item) return spiderfiedGroup.center;
    }
    const entry = pointMarkersById[pointId];
    return entry ? { lat: entry.marker.getPosition().lat(), lng: entry.marker.getPosition().lng() } : null;
  }

  function findOverlappingPoints(pointId) {
    const origin = getOriginalPosition(pointId);
    if (!origin) return [];
    const lat = typeof origin.lat === 'function' ? origin.lat() : origin.lat;
    const lng = typeof origin.lng === 'function' ? origin.lng() : origin.lng;
    const threshold = 0.000005;
    const overlapping = [];
    for (const [id, e] of Object.entries(pointMarkersById)) {
      if (!e.marker.getMap()) continue;
      const orig = getOriginalPosition(Number(id));
      if (!orig) continue;
      const pLat = typeof orig.lat === 'function' ? orig.lat() : orig.lat;
      const pLng = typeof orig.lng === 'function' ? orig.lng() : orig.lng;
      if (Math.abs(pLat - lat) < threshold && Math.abs(pLng - lng) < threshold) {
        overlapping.push(Number(id));
      }
    }
    return overlapping;
  }

  function unspiderfy() {
    if (!spiderfiedGroup) return;
    for (const item of spiderfiedGroup.items) {
      const entry = pointMarkersById[item.id];
      if (entry) {
        entry.marker.setPosition(spiderfiedGroup.center);
        if (item.line) { item.line.setMap(null); }
      }
    }
    spiderfiedGroup = null;
  }

  function spiderfy(pointIds) {
    unspiderfy();
    if (pointIds.length < 2) return;
    const first = pointMarkersById[pointIds[0]];
    if (!first) return;
    const center = first.marker.getPosition();
    const centerLat = center.lat();
    const centerLng = center.lng();
    const count = pointIds.length;
    const angleStep = (2 * Math.PI) / count;
    const items = [];

    for (let i = 0; i < count; i++) {
      const angle = angleStep * i - Math.PI / 2;
      const newLat = centerLat + SPIDERFY_OFFSET * Math.sin(angle);
      const newLng = centerLng + SPIDERFY_OFFSET * Math.cos(angle);
      const entry = pointMarkersById[pointIds[i]];
      if (!entry) continue;

      const line = new google.maps.Polyline({
        path: [center, { lat: newLat, lng: newLng }],
        strokeColor: '#888',
        strokeOpacity: 0.6,
        strokeWeight: 1,
        map: map,
        clickable: false
      });

      entry.marker.setPosition({ lat: newLat, lng: newLng });
      entry.marker.setZIndex(15);
      items.push({ id: pointIds[i], line });
    }

    spiderfiedGroup = { center: { lat: centerLat, lng: centerLng }, items };
  }

  function handlePointClick(pointId) {
    if (spiderfiedGroup) {
      selectPoint(pointId);
      return;
    }
    const overlapping = findOverlappingPoints(pointId);
    if (overlapping.length > 1) {
      spiderfy(overlapping);
      return;
    }
    selectPoint(pointId);
  }

  function updatePointHint() {
    const hint = document.getElementById('tool-hint-text');
    if (!hint) return;
    if (selectedPointIds.size > 0 && !previewMode) {
      hint.textContent = LeucenaI18n.t('badge.pointSelected');
      hint.classList.remove('hidden');
    } else {
      hint.textContent = '';
      hint.classList.add('hidden');
    }
  }

  function selectPoint(pointId) {
    if (previewMode) {
      const wasInPreview = selectedPointIds.has(pointId);
      clearPreviewMode();
      if (wasInPreview) {
        const entry = pointMarkersById[pointId];
        if (!entry) return;
        selectedPointIds.add(pointId);
        entry.marker.setIcon(getSelectedPointIcon(entry.data.status, entry.data.layer));
        entry.marker.setZIndex(10);
        updatePointHint();
      } else {
        const entry = pointMarkersById[pointId];
        if (!entry) return;
        selectedPointIds.add(pointId);
        entry.marker.setIcon(getSelectedPointIcon(entry.data.status, entry.data.layer));
        entry.marker.setZIndex(10);
        updatePointHint();
      }
      return;
    }

    if (selectedPointIds.has(pointId)) {
      deselectSinglePoint(pointId);
      return;
    }
    deselectPoint();
    const entry = pointMarkersById[pointId];
    if (!entry) return;
    selectedPointIds.add(pointId);
    entry.marker.setIcon(getSelectedPointIcon(entry.data.status, entry.data.layer));
    entry.marker.setZIndex(10);
    updatePointHint();
  }

  function selectPointsPreview(pointIds) {
    deselectPoint();
    previewMode = true;
    for (const pid of pointIds) {
      const entry = pointMarkersById[pid];
      if (!entry) continue;
      selectedPointIds.add(pid);
      entry.marker.setIcon(getSelectedPointIcon(entry.data.status, entry.data.layer));
      entry.marker.setZIndex(10);
    }
    updatePointHint();
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      clearPreviewMode();
    }, 5000);
  }

  function clearPreviewMode() {
    clearTimeout(previewTimer);
    previewTimer = null;
    if (previewMode) {
      previewMode = false;
      for (const pid of [...selectedPointIds]) {
        const entry = pointMarkersById[pid];
        if (entry) {
          entry.marker.setIcon(getPointIcon(entry.data.status, entry.data.layer));
          entry.marker.setZIndex(5);
        }
        selectedPointIds.delete(pid);
      }
      unspiderfy();
      updatePointHint();
    }
  }

  function deselectSinglePoint(pointId) {
    if (!selectedPointIds.has(pointId)) return;
    const entry = pointMarkersById[pointId];
    if (entry) {
      entry.marker.setIcon(getPointIcon(entry.data.status, entry.data.layer));
      entry.marker.setZIndex(5);
    }
    selectedPointIds.delete(pointId);
    updatePointHint();
  }

  function deselectPoint() {
    clearTimeout(previewTimer);
    previewTimer = null;
    previewMode = false;
    for (const pid of [...selectedPointIds]) {
      const entry = pointMarkersById[pid];
      if (entry) {
        entry.marker.setIcon(getPointIcon(entry.data.status, entry.data.layer));
        entry.marker.setZIndex(5);
      }
      selectedPointIds.delete(pid);
    }
    unspiderfy();
    updatePointHint();
  }

  async function togglePointValidity(pointId) {
    if (!LeucenaApp.isLoggedIn()) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.loginToToggle'), 'warning');
      return;
    }
    if (!LeucenaApp.isTeamOrAbove()) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.validityRestricted'), 'warning');
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
    const isSelected = selectedPointIds.has(pointId);
    entry.marker.setIcon(isSelected ? getSelectedPointIcon(newStatus, layer) : getPointIcon(newStatus, layer));
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
      // Wait for the +1 zoom to settle, then lock to this exact viewport
      google.maps.event.addListenerOnce(map, 'idle', () => {
        restrictPanToCell(cellId);
      });
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
  let _editSafeCenter = null;
  let _editAllowedBounds = null;

  function restrictPanToCell(cellId) {
    const cellBounds = getCellBounds(cellId);
    if (!cellBounds) return;

    // Lock to the zoom level zoomToCell settled on
    _editMinZoom = map.getZoom();
    _editZoomEnforced = true;
    _zoomWarnCount = 0;
    map.setOptions({ minZoom: _editMinZoom });

    // No API restriction — we handle pan enforcement manually via snap-back
    map.setOptions({ restriction: null });

    _editSafeCenter = map.getCenter();
    _editAllowedBounds = map.getBounds();

    updateZoomButtons();

    if (panWarningListener) google.maps.event.removeListener(panWarningListener);
    panWarningListener = map.addListener('dragend', () => {
      const center = map.getCenter();
      if (_editAllowedBounds && !_editAllowedBounds.contains(center)) {
        map.panTo(_editSafeCenter);
        LeucenaApp.showToast(LeucenaI18n.t('toast.panWarning'), 'warning', 5000);
      }
    });
  }

  function releasePanRestriction() {
    _editZoomEnforced = false;
    _editMinZoom = 12;
    _editSafeCenter = null;
    _editAllowedBounds = null;
    map.setOptions({ minZoom: initialZoom != null ? initialZoom : null });
    if (panWarningListener) {
      google.maps.event.removeListener(panWarningListener);
      panWarningListener = null;
    }
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

    document.getElementById('toggle-masks-member').addEventListener('change', function () {
      if (typeof LeucenaDrawing !== 'undefined') LeucenaDrawing.setMemberMasksVisible(this.checked);
    });

    document.getElementById('toggle-masks-contributor').addEventListener('change', function () {
      if (typeof LeucenaDrawing !== 'undefined') LeucenaDrawing.setContributorMasksVisible(this.checked);
    });

    syncPointsParent();
  }

  function refreshGridVisibility() { // viewport cull: setMap(map) only when cell bounds intersect viewport
    const viewport = map ? map.getBounds() : null;
    for (const [cellId, poly] of Object.entries(gridPolygons)) {
      const props = gridData[cellId];
      const inViewport = viewport && gridCellBounds[cellId] ? viewport.intersects(gridCellBounds[cellId]) : true;
      poly.setMap(shouldShowCell(props) && inViewport ? map : null);
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

    const relevant = statusCounts.not_yet_finished + statusCounts.in_use + statusCounts.mapping + statusCounts.finished;
    if (relevant > 0) {
      const finishedPct = (statusCounts.finished / relevant * 100);
      const mappingPct = ((statusCounts.mapping + statusCounts.in_use) / relevant * 100);
      const tomapPct = (statusCounts.not_yet_finished / relevant * 100);
      const setW = (id, v) => { const el = document.getElementById(id); if (el) el.style.width = v.toFixed(1) + '%'; };
      setW('progress-finished', finishedPct);
      setW('progress-mapping', mappingPct);
      setW('progress-tomap', tomapPct);
      const lbl = document.getElementById('progress-pct-label');
      if (lbl) lbl.textContent = (finishedPct + mappingPct).toFixed(1) + '%';
      const setPct = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v.toFixed(1) + '%'; };
      setPct('progress-finished-pct', finishedPct);
      setPct('progress-mapping-pct', mappingPct);
      setPct('progress-tomap-pct', tomapPct);
    }

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

  const subEl = document.getElementById('mask-subcategories');
    if (subEl && typeof LeucenaApp !== 'undefined') {
      const role = LeucenaApp.getUserRole ? LeucenaApp.getUserRole() : null;
      const showSubs = role === 'superadmin' || role === 'admin' || role === 'team';
      subEl.classList.toggle('hidden', !showSubs);
      const defLeg = document.getElementById('legend-mask-default');
      const memLeg = document.getElementById('legend-mask-member');
      const conLeg = document.getElementById('legend-mask-contributor');
      if (defLeg) defLeg.classList.toggle('hidden', showSubs);
      if (memLeg) memLeg.classList.toggle('hidden', !showSubs);
      if (conLeg) conLeg.classList.toggle('hidden', !showSubs);
      if (showSubs && typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.getPolygonCounts) {
        const counts = LeucenaDrawing.getPolygonCounts();
        setText('count-masks-member', counts.member);
        setText('count-masks-contributor', counts.contributor);
      }
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

  function setGridClickable(clickable) {
    for (const poly of Object.values(gridPolygons)) {
      poly.setOptions({ clickable });
    }
  }

  function updateZoomButtons() {
    const zoom = map.getZoom();
    const minZoom = _editZoomEnforced ? _editMinZoom : (initialZoom != null ? initialZoom : (map.minZoom || 0));
    const maxZoom = map.maxZoom || 22;
    document.getElementById('tool-zoom-out').disabled = (zoom <= minZoom);
    document.getElementById('tool-zoom-in').disabled = (zoom >= maxZoom);
  }

  function updateAreaLabelsForZoom() {
    if (typeof LeucenaDrawing === 'undefined' || typeof LeucenaApp === 'undefined') return;
    const zoom = map.getZoom();
    const cellLocked = LeucenaApp.isEditing && LeucenaApp.isEditing();
    LeucenaDrawing.setAreaLabelsVisible(cellLocked && zoom >= 16);
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

  function cellHasCrowdmapping(cellId) {
    const bounds = getCellBounds(cellId);
    if (!bounds) return false;
    for (const entry of Object.values(pointMarkersById)) {
      if ((entry.data.layer || 'crowdmapping') !== 'crowdmapping') continue;
      if (entry.data.status !== 0) continue;
      const pos = entry.marker.getPosition();
      if (bounds.contains(pos)) return true;
    }
    return false;
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

  function addPointMarker(pointData) { // realtime (e.g. socket): add to clusterer when layer on and in viewport
    const { id, fid, geometry } = pointData;
    const status = pointData.status || 0;
    const layer = pointData.layer || 'crowdmapping';
    if (pointMarkersById[id]) return pointMarkersById[id].marker;
    const [lng, lat] = geometry.coordinates;

    const marker = createPointMarkerObj(id, lat, lng, status, layer, fid);

    pointMarkersById[id] = { marker, data: { id, fid, status, layer, not_valid: status } };

    ensureClusterer();
    if (pointClusterer && isPointLayerVisible(layer)) {
      const viewport = map ? map.getBounds() : null;
      if (!viewport || viewport.contains(marker.getPosition())) {
        pointClusterer.addMarker(marker, true);
        pointClusterer.render();
      }
    }

    updateFilterCounts();
    return marker;
  }

  function isPointLayerVisible(layer) {
    const key = (layer || 'crowdmapping').toLowerCase();
    return showPoints && visiblePointLayers.has(key);
  }

  function refreshPointVisibility() { // layer toggles + viewport: clusterer add/remove (or direct setMap fallback)
    const viewport = map ? map.getBounds() : null;
    ensureClusterer();
    if (!pointClusterer) {
      for (const entry of Object.values(pointMarkersById)) {
        const layer = entry.data.layer || 'crowdmapping';
        const inView = !viewport || viewport.contains(entry.marker.getPosition());
        entry.marker.setMap(isPointLayerVisible(layer) && inView ? map : null);
      }
      return;
    }
    const toAdd = [];
    const toRemove = [];
    for (const entry of Object.values(pointMarkersById)) {
      const layer = entry.data.layer || 'crowdmapping';
      const inView = !viewport || viewport.contains(entry.marker.getPosition());
      if (isPointLayerVisible(layer) && inView) {
        toAdd.push(entry.marker);
      } else {
        toRemove.push(entry.marker);
      }
    }
    if (toRemove.length) pointClusterer.removeMarkers(toRemove, true);
    if (toAdd.length) pointClusterer.addMarkers(toAdd, true);
    pointClusterer.render();
  }

  function removePointMarker(pointId) { // removeMarker from clusterer before setMap(null) to avoid orphan clusters
    const entry = pointMarkersById[pointId];
    if (!entry) return;
    selectedPointIds.delete(pointId);
    if (spiderfiedGroup) {
      const item = spiderfiedGroup.items.find(i => i.id === pointId);
      if (item && item.line) item.line.setMap(null);
      spiderfiedGroup.items = spiderfiedGroup.items.filter(i => i.id !== pointId);
      if (spiderfiedGroup.items.length <= 1) unspiderfy();
    }
    if (pointClusterer) {
      pointClusterer.removeMarker(entry.marker, true);
    }
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
    updateFilterCounts,
    selectPoint,
    selectPointsPreview,
    deselectPoint,
    hasSelectedPoints: () => selectedPointIds.size > 0,
    unspiderfy,
    togglePointValidity,
    cellHasCrowdmapping,
    updateAreaLabelsForZoom
  };
})();

window.LeucenaMap = (function () { // IIFE: init, grid cells, occurrence points, filters, viewport-based perf
  let map = null;
  let svCoverageLayer = null;
  let gridLayer = null;         // google.maps.Data — single layer replaces per-cell Polygons
  const gridData = {};
  const gridCellBounds = {};
  const gridCellGeometry = {}; // GeoJSON geometry per cell id (for point-in-cell checks)
  const gridCache = {};         // client-side cache: state key → FeatureCollection
  let _currentState = null;     // loaded state UF (null = all)
  let _statesLayer = null;      // google.maps.Data — state boundary outlines (non-interactive)
  let _statesGeoJson = null;    // cached FeatureCollection for state boundaries
  let _gridClickable = true;
  let _gridsHollow = false;
  const pointMarkersById = {};
  const POINT_LAYERS = ['crowdmapping', 'inaturalist', 'gbif', 'insthorus', 'specieslink'];
  let activeFilters = new Set(['not_yet_finished', 'in_use', 'mapping', 'no_points', 'finished']);
  let visiblePointLayers = new Set(['crowdmapping', 'inaturalist', 'gbif', 'insthorus', 'specieslink']); // all layers on load so every point type shows
  let showGrid = true;
  let showPoints = true;
  let showPolygons = true;
  let originalRestriction = null;
  let gridBounds = null;
  let restrictionBounds = null;
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
  let pointHeatmap = null;
  let pointDisplayMode = 'cluster';
  let _editingCellId = null;
  let _editNeighborIds = null; // Set of cell IDs adjacent to the editing cell
  let _showCollaboratorPoints = true;

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

  function init(initialState) {
    if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) LeucenaApp.logEvent('map_init', null, null, { state: initialState || 'brazil' });
    if (initialState) _currentState = initialState;
    map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: -14.2, lng: -51.9 },
      zoom: 4,
      mapTypeId: 'hybrid',
      mapTypeControl: false,
      zoomControl: false,
      cameraControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy',
      isFractionalZoomEnabled: false,
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

    let _prevPointScale = getPointScale(); // icon scale flips at zoom 14↔15 only; skip refresh on every zoom tick
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

    function updateCoordsDisplay(latLng) {
      if (!latLng) return;
      const lat = latLng.lat().toFixed(6);
      const lng = latLng.lng().toFixed(6);
      lastCoords = `${lat}, ${lng}`;
      const el = document.getElementById('coords-display');
      if (el) el.textContent = lastCoords;
      if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.updateMouseLatLng) {
        LeucenaDrawing.updateMouseLatLng(latLng);
      }
    }

    map.addListener('mousemove', (e) => {
      updateCoordsDisplay(e.latLng);
    });

    // DOM fallback: map mousemove does not fire when the cursor is over the Data layer (grid)
    // or other overlays that capture events — same pattern as drawing.js.
    const coordsProjOverlay = new google.maps.OverlayView();
    coordsProjOverlay.onAdd = coordsProjOverlay.draw = coordsProjOverlay.onRemove = function () {};
    coordsProjOverlay.setMap(map);
    map.getDiv().addEventListener('mousemove', (e) => {
      try {
        const proj = coordsProjOverlay.getProjection();
        if (!proj) return;
        const rect = map.getDiv().getBoundingClientRect();
        const latLng = proj.fromContainerPixelToLatLng(
          new google.maps.Point(e.clientX - rect.left, e.clientY - rect.top)
        );
        if (latLng) updateCoordsDisplay(latLng);
      } catch (_) { /* projection not ready */ }
    });

    map.addListener('click', (e) => {
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logInputTrace) {
        LeucenaApp.logInputTrace('gmap_click', {
          lat: e.latLng.lat(), lng: e.latLng.lng()
        });
      }
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.isDeletionMode && LeucenaApp.isDeletionMode()) {
        LeucenaApp.handleDeletionClick(e.latLng);
        return;
      }
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.isPointModeActive && LeucenaApp.isPointModeActive()) {
        if (LeucenaApp.handleInsertionClick) LeucenaApp.handleInsertionClick(e.latLng);
        return;
      }
      if (clickedOnFeature) {
        clickedOnFeature = false;
        return;
      }
      // Map clicks outside any polygon should drop edit mode. Polygon clicks are intercepted
      // by the polygon's own listener (which routes to toggleEditPolygon) and don't reach here,
      // so this only fires when the user clicks empty map / a grid tile / etc.
      if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.getActiveMode() === 'edit') {
        LeucenaDrawing.exitEditMode();
        return;
      }
      // Same idea for delete mode: clicking on a polygon stays armed and selects
      // it for confirmation; clicking on empty map disarms the tool so we don't
      // accidentally delete the next polygon the user clicks. Skip while a
      // pending delete confirmation is showing — the overlay's Cancel button
      // (or Esc) is the right way to back out at that point.
      if (typeof LeucenaDrawing !== 'undefined'
          && LeucenaDrawing.getActiveMode() === 'delete'
          && !(LeucenaDrawing.hasPendingDelete && LeucenaDrawing.hasPendingDelete())) {
        LeucenaDrawing.exitDeleteMode();
        return;
      }
      // draw/hole: background clicks add vertices; must not deselect the sidebar cell.
      // QC review is not isEditing(), so deselectFromMap() was firing and aborting hole draw.
      if (typeof LeucenaDrawing !== 'undefined') {
        const dm = LeucenaDrawing.getActiveMode();
        if (dm === 'draw' || dm === 'hole') return;
      }
      deselectPoint();
      if (LeucenaStreetView.isActive()) {
        const drawMode = typeof LeucenaDrawing !== 'undefined' ? LeucenaDrawing.getActiveMode() : null;
        if (drawMode === 'draw' || drawMode === 'hole') return;
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
        return;
      }
      const qcCell = typeof LeucenaQC !== 'undefined' && LeucenaQC.getReviewCellId && LeucenaQC.getReviewCellId();
      if (qcCell) {
        const dm = typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.getActiveMode
          ? LeucenaDrawing.getActiveMode() : null;
        LeucenaApp.logEvent('map_click_left_qc', qcCell, null, {
          lat: e.latLng.lat(), lng: e.latLng.lng(),
          drawMode: dm,
          sidebarSelectedCell: LeucenaApp.getSelectedCellId && LeucenaApp.getSelectedCellId()
        });
      }
    });
    map.addListener('rightclick', (e) => {
      if (LeucenaApp.isEditing && LeucenaApp.isEditing()) {
        LeucenaApp.logEvent('map_click_right', LeucenaApp.getSelectedCellId(), null, {
          lat: e.latLng.lat(), lng: e.latLng.lng()
        });
        return;
      }
      const qcCell = typeof LeucenaQC !== 'undefined' && LeucenaQC.getReviewCellId && LeucenaQC.getReviewCellId();
      if (qcCell) {
        const dm = typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.getActiveMode
          ? LeucenaDrawing.getActiveMode() : null;
        LeucenaApp.logEvent('map_click_right_qc', qcCell, null, {
          lat: e.latLng.lat(), lng: e.latLng.lng(),
          drawMode: dm,
          sidebarSelectedCell: LeucenaApp.getSelectedCellId && LeucenaApp.getSelectedCellId()
        });
      }
    });
    map.addListener('dragend', () => {
      const c = map.getCenter();
      if (LeucenaApp.isEditing && LeucenaApp.isEditing()) {
        LeucenaApp.logEvent('map_pan', LeucenaApp.getSelectedCellId(), null, {
          lat: c.lat(), lng: c.lng(), zoom: map.getZoom()
        });
        return;
      }
      const qcCell = typeof LeucenaQC !== 'undefined' && LeucenaQC.getReviewCellId && LeucenaQC.getReviewCellId();
      if (qcCell) {
        const dm = typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.getActiveMode
          ? LeucenaDrawing.getActiveMode() : null;
        LeucenaApp.logEvent('map_pan_qc', qcCell, null, {
          lat: c.lat(), lng: c.lng(), zoom: map.getZoom(), drawMode: dm,
          sidebarSelectedCell: LeucenaApp.getSelectedCellId && LeucenaApp.getSelectedCellId()
        });
      }
    });
    map.getDiv().addEventListener('wheel', () => {
      if (LeucenaApp.isEditing && LeucenaApp.isEditing()) {
        LeucenaApp.logEvent('map_scroll', LeucenaApp.getSelectedCellId(), null, {
          zoom: map.getZoom()
        });
        return;
      }
      const qcCell = typeof LeucenaQC !== 'undefined' && LeucenaQC.getReviewCellId && LeucenaQC.getReviewCellId();
      if (qcCell) {
        const dm = typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.getActiveMode
          ? LeucenaDrawing.getActiveMode() : null;
        LeucenaApp.logEvent('map_scroll_qc', qcCell, null, {
          zoom: map.getZoom(), drawMode: dm,
          sidebarSelectedCell: LeucenaApp.getSelectedCellId && LeucenaApp.getSelectedCellId()
        });
      }
    }, { passive: true });

    setupRightClickCopy();
    setupBasemapToggle();

    gridLayer = new google.maps.Data({ map: map });
    gridLayer.addListener('click', (event) => {
      const cellId = event.feature.getId();
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logInputTrace) {
        LeucenaApp.logInputTrace('grid_click', {
          gridFeatureId: cellId,
          lat: event.latLng.lat(), lng: event.latLng.lng()
        });
      }
      if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.getActiveMode() === 'edit' && LeucenaDrawing.isEditModified()) {
        clickedOnFeature = true;
        LeucenaDrawing.exitEditMode();
        return;
      }
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.isDeletionMode && LeucenaApp.isDeletionMode()) {
        LeucenaApp.handleDeletionClick(event.latLng);
        return;
      }
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.isPointModeActive && LeucenaApp.isPointModeActive()) {
        if (LeucenaApp.handleInsertionClick) LeucenaApp.handleInsertionClick(event.latLng);
        return;
      }
      if (typeof LeucenaDrawing !== 'undefined') {
        const dm = LeucenaDrawing.getActiveMode();
        if (dm === 'draw' || dm === 'hole') return;
        // For delete mode: a tap inside the locked cell tile (a Data feature)
        // is intercepted here and never reaches map.click, so the auto-exit
        // wired up in the map.click handler doesn't fire on mobile when the
        // user taps the cell area to disarm the tool. Mirror the same logic
        // here: if there's no pending confirmation, exit delete mode.
        if (dm === 'delete') {
          if (LeucenaDrawing.hasPendingDelete && LeucenaDrawing.hasPendingDelete()) {
            return; // overlay's Cancel/Esc owns the back-out path
          }
          LeucenaDrawing.exitDeleteMode();
          return;
        }
      }
      clickedOnFeature = true;
      deselectPoint();
      if (LeucenaStreetView.isActive()) {
        LeucenaStreetView.showAt(event.latLng);
        return;
      }
      const currentData = LeucenaApp.getSelectedCellData();
      if (currentData && currentData.locked_by && currentData.locked_by === LeucenaApp.getUsername() && cellId !== LeucenaApp.getSelectedCellId()) {
        LeucenaApp.showToast(LeucenaI18n.t('toast.editingWarning'), 'warning');
        return;
      }
      LeucenaApp.selectCell(cellId, gridData[cellId]);
    });

    loadGrid();
    loadPoints();
    setupFilters();
    _loadStateOutlines();
  }

  let _hoveredStateFeature = null;
  let _stateTooltipEl = null;
  let _stateStatsCache = {};
  const BRAZIL_VIEW_BOUNDS = { south: -33.75, west: -73.99, north: 5.27, east: -34.79 };

  function _ensureStateTooltip() {
    if (_stateTooltipEl) return;
    _stateTooltipEl = document.createElement('div');
    _stateTooltipEl.className = 'state-hover-tooltip';
    _stateTooltipEl.style.display = 'none';
    map.getDiv().appendChild(_stateTooltipEl);
  }

  function _showStateTooltip(e) {
    _ensureStateTooltip();
    var uf = e.feature.getProperty('abbrev_state');
    var name = e.feature.getProperty('name') || uf;
    var stats = _stateStatsCache[uf];
    var cells = stats ? stats.cells : 0;
    var pts = stats && stats.pointsRegistered != null ? Number(stats.pointsRegistered) : 0;
    var pctF = stats ? stats.pctFinished || 0 : 0;
    var pctM = stats ? stats.pctMapping || 0 : 0;
    var pctT = stats ? stats.pctTomap || 0 : 0;
    var overallPct = pctF + pctM;

    var ptsLine = '';
    if (typeof LeucenaI18n !== 'undefined' && LeucenaI18n.t) {
      ptsLine = '<div class="stt-points">' + LeucenaI18n.t('map.stateTooltipPoints', String(pts)) + '</div>';
    } else {
      ptsLine = '<div class="stt-points">' + pts + ' pontos registrados</div>';
    }

    _stateTooltipEl.innerHTML =
      '<div class="stt-name">' + name + '</div>' +
      '<div class="stt-uf">' + uf + ' · ' + cells + ' célula' + (cells !== 1 ? 's' : '') + '</div>' +
      ptsLine +
      '<div class="stt-overall">' + overallPct.toFixed(1) + '%</div>' +
      '<div class="stt-bar">' +
        '<div class="stt-bar-finished" style="width:' + pctF.toFixed(1) + '%"></div>' +
        '<div class="stt-bar-mapping" style="width:' + pctM.toFixed(1) + '%"></div>' +
        '<div class="stt-bar-tomap" style="width:' + pctT.toFixed(1) + '%"></div>' +
      '</div>' +
      '<div class="stt-legend">' +
        '<span class="stt-leg-item stt-leg-finished">' + pctF.toFixed(1) + '% Finalizado</span>' +
        '<span class="stt-leg-item stt-leg-mapping">' + pctM.toFixed(1) + '% Mapeando</span>' +
        '<span class="stt-leg-item stt-leg-tomap">' + pctT.toFixed(1) + '% A mapear</span>' +
      '</div>';
    _stateTooltipEl.style.display = '';

    var pixel = _latLngToPixel(e.latLng);
    if (pixel) {
      _stateTooltipEl.style.left = (pixel.x + 16) + 'px';
      _stateTooltipEl.style.top = (pixel.y - 12) + 'px';
    }
  }

  function _hideStateTooltip() {
    if (_stateTooltipEl) _stateTooltipEl.style.display = 'none';
  }

  let _pixelOverlay = null;
  function _ensurePixelOverlay() {
    if (_pixelOverlay) return;
    _pixelOverlay = new google.maps.OverlayView();
    _pixelOverlay.draw = function () {};
    _pixelOverlay.setMap(map);
  }

  function _latLngToPixel(latLng) {
    _ensurePixelOverlay();
    var proj = _pixelOverlay.getProjection();
    if (!proj) return null;
    return proj.fromLatLngToContainerPixel(latLng);
  }

  function setStateStats(stats) {
    _stateStatsCache = stats || {};
  }

  async function _loadStateOutlines() {
    if (!map) return;
    try {
      if (!_statesGeoJson) {
        var res = await fetch('/data/brazil-states.geojson');
        _statesGeoJson = await res.json();
      }
      _statesLayer = new google.maps.Data({ map: map });
      _statesLayer.addGeoJson(_statesGeoJson);

      _statesLayer.addListener('mouseover', function (e) {
        if (_currentState) return;
        _hoveredStateFeature = e.feature;
        var uf = e.feature.getProperty('abbrev_state');
        var stats = _stateStatsCache[uf];
        var pct = stats ? (stats.pctFinished || stats.pct || 0) : 0;
        var hoverFill = pct > 50 ? '#4ade80' : pct > 10 ? '#60a5fa' : '#a78bfa';
        _statesLayer.overrideStyle(e.feature, {
          fillOpacity: 0.45,
          fillColor: hoverFill,
          strokeColor: '#ffffff',
          strokeWeight: 2.2,
          strokeOpacity: 1
        });
        map.getDiv().style.cursor = 'pointer';
        _showStateTooltip(e);
      });
      _statesLayer.addListener('mouseout', function (e) {
        if (_currentState) return;
        _hoveredStateFeature = null;
        _statesLayer.revertStyle(e.feature);
        map.getDiv().style.cursor = '';
        _hideStateTooltip();
      });
      map.addListener('mousemove', function (e) {
        if (!_hoveredStateFeature || _currentState || !_stateTooltipEl || _stateTooltipEl.style.display === 'none') return;
        var pixel = _latLngToPixel(e.latLng);
        if (pixel) {
          _stateTooltipEl.style.left = (pixel.x + 16) + 'px';
          _stateTooltipEl.style.top = (pixel.y - 12) + 'px';
        }
      });
      _statesLayer.addListener('click', function (e) {
        if (_currentState) return;
        _hideStateTooltip();
        var uf = e.feature.getProperty('abbrev_state');
        if (uf && typeof LeucenaApp !== 'undefined' && LeucenaApp.selectStateFromMap) {
          LeucenaApp.selectStateFromMap(uf);
        }
      });

      _applyStateOutlineFilter(_currentState);
    } catch (e) { /* non-critical */ }
  }

  function _applyStateOutlineFilter(uf) {
    if (!_statesLayer) return;
    _hoveredStateFeature = null;
    _statesLayer.revertStyle();
    _hideStateTooltip();
    if (!uf) {
      _statesLayer.setStyle(function (feature) {
        var fUf = feature.getProperty('abbrev_state');
        var name = feature.getProperty('name') || fUf;
        var stats = _stateStatsCache[fUf];
        var pct = stats ? (stats.pctFinished || stats.pct || 0) : 0;
        var fill = pct > 50 ? '#22c55e' : pct > 10 ? '#3b82f6' : '#6366f1';
        return {
          fillOpacity: 0.22,
          fillColor: fill,
          strokeColor: 'rgba(255,255,255,0.35)',
          strokeWeight: 1.4,
          strokeOpacity: 1,
          clickable: true,
          zIndex: 1,
          title: name
        };
      });
      return;
    }
    _statesLayer.setStyle(function (feature) {
      var fUf = feature.getProperty('abbrev_state');
      if (fUf === uf) {
        return {
          fillOpacity: 0,
          fillColor: 'transparent',
          strokeColor: 'rgba(241,245,249,0.45)',
          strokeWeight: 1.5,
          strokeOpacity: 1,
          clickable: false,
          zIndex: 0
        };
      }
      return { visible: false };
    });
  }

  let isSatellite = true;
  let showLabels = true;
  let labelsUserControlled = false;
  let labelsAutoOffTimer = null;
  let labelsPostAutoOffFlashTimer = null;
  const LABELS_AUTO_OFF_MS = 3000;
  const LABELS_FLASH_AFTER_AUTO_OFF_MS = 320;

  function clearLabelsAutoOffTimer() {
    if (labelsAutoOffTimer) {
      clearTimeout(labelsAutoOffTimer);
      labelsAutoOffTimer = null;
    }
  }

  function clearLabelsPostAutoOffFlashTimer() {
    if (labelsPostAutoOffFlashTimer) {
      clearTimeout(labelsPostAutoOffFlashTimer);
      labelsPostAutoOffFlashTimer = null;
    }
  }

  function clearLabelsReenableHint() {
    clearLabelsPostAutoOffFlashTimer();
    const lt = document.getElementById('label-toggle');
    if (lt) {
      lt.classList.remove('label-toggle-pulse');
      delete lt.dataset.labelsReenableHint;
      lt.title = LeucenaI18n.t('tool.labelsTooltip');
    }
  }

  function refreshLabelToggleTitleForLang() {
    const el = document.getElementById('label-toggle');
    if (!el) return;
    if (el.dataset.labelsReenableHint === 'true') {
      el.title = LeucenaI18n.t('tool.labelsReenableHint');
    } else {
      el.title = LeucenaI18n.t('tool.labelsTooltip');
    }
  }

  function playLabelToggleFlash() {
    const lt = document.getElementById('label-toggle');
    if (!lt || !isSatellite) return;
    const onEnd = (e) => {
      if (e.animationName !== 'label-toggle-flash') return;
      lt.classList.remove('label-toggle-pulse');
      lt.removeEventListener('animationend', onEnd);
    };
    lt.removeEventListener('animationend', onEnd);
    lt.classList.remove('label-toggle-pulse');
    void lt.offsetWidth;
    lt.classList.add('label-toggle-pulse');
    lt.addEventListener('animationend', onEnd);
  }

  function performAutoLabelsOff() {
    if (labelsUserControlled) return;
    labelsUserControlled = true;
    showLabels = false;
    const cb = document.getElementById('tool-labels');
    const lt = document.getElementById('label-toggle');
    if (cb) cb.checked = false;
    applyMapType();
    if (lt && isSatellite) {
      lt.dataset.labelsReenableHint = 'true';
      lt.title = LeucenaI18n.t('tool.labelsReenableHint');
    }
    clearLabelsPostAutoOffFlashTimer();
    labelsPostAutoOffFlashTimer = setTimeout(() => {
      labelsPostAutoOffFlashTimer = null;
      playLabelToggleFlash();
    }, LABELS_FLASH_AFTER_AUTO_OFF_MS);
  }

  function scheduleAutoLabelsOff() {
    clearLabelsAutoOffTimer();
    labelsAutoOffTimer = setTimeout(() => {
      labelsAutoOffTimer = null;
      performAutoLabelsOff();
    }, LABELS_AUTO_OFF_MS);
  }

  function setupBasemapToggle() {
    const mapBtn = document.getElementById('tool-maptype');
    const labelsCheckbox = document.getElementById('tool-labels');
    const labelToggle = document.getElementById('label-toggle');

    labelsCheckbox.checked = true;

    mapBtn.addEventListener('click', () => {
      isSatellite = !isSatellite;
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) LeucenaApp.logEvent('toggle_maptype', null, null, { satellite: isSatellite });
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
      if (!isSatellite) clearLabelsPostAutoOffFlashTimer();
    });

    labelsCheckbox.addEventListener('change', () => {
      clearLabelsAutoOffTimer();
      labelsUserControlled = true;
      showLabels = labelsCheckbox.checked;
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) LeucenaApp.logEvent('toggle_labels', null, null, { labels: showLabels });
      if (labelsCheckbox.checked) clearLabelsReenableHint();
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

  let rightHoldTimer = null;
  // Set by Google Maps' own `rightclick` event (which fires reliably whether
  // the cursor is over the map background, a polygon, a marker, or an editable
  // cell), so the 2-second copy-coords gesture works in all those scenarios.
  // Without this we relied on `lastCoords` from mousemove, which was stale or
  // empty over polygons/edit handles whose SVG layers swallow mousemove.
  let _lastRightClickLatLng = null;

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
    if (typeof LeucenaQC !== 'undefined' && LeucenaQC.getReviewCellId && LeucenaQC.getReviewCellId()) return;
    const main = document.getElementById('main-content');
    main.classList.remove('sidebar-open');
    const arrow = document.querySelector('.toggle-arrow');
    if (arrow) arrow.textContent = '\u00BB';
    const legend = document.getElementById('map-legend');
    if (legend) legend.classList.remove('legend-hidden');
    const usersBtn = document.getElementById('toggle-users-btn');
    if (usersBtn) usersBtn.classList.remove('legend-hidden');
    LeucenaApp.deselectCell();
  }

  function setupRightClickCopy() {
    const mapDiv = document.getElementById('map');
    if (!mapDiv) return;

    // Listen to Google Maps' `rightclick` event — it fires for the map *and*
    // for clicks on polygons/markers, giving us a reliable latLng that doesn't
    // depend on the live mousemove coords (which can be stale over polygon
    // SVGs that intercept mousemove before our DOM listener sees it).
    if (map) {
      map.addListener('rightclick', (e) => {
        if (e && e.latLng) _lastRightClickLatLng = e.latLng;
      });
    }

    // Block the native context menu over the map container at capture phase
    // so polygon/SVG layers can't bubble up the browser menu (which would
    // then steal the pointer and prevent our hold timer from firing).
    mapDiv.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    }, true);

    const isInsideMapContainer = (target) => {
      if (!target) return false;
      // Reject right-clicks that happened inside floating UI on top of the
      // map (toolbar, legend, edit-tools panel, sidebar, modals), so the
      // gesture only triggers when the user is really pointing at the map.
      const ui = target.closest && target.closest(
        '#edit-tools-panel, #map-legend, #toolbar, #top-bar, #sidebar, ' +
        '.modal-overlay, .map-controls-right, .btn-my-location, ' +
        '#streetview-container, #toggle-users-btn'
      );
      if (ui) return false;
      return target === mapDiv || mapDiv.contains(target);
    };

    // Document-level capture-phase listeners so the gesture isn't intercepted
    // by Google Maps' polygon SVG / edit-vertex handles, which can stop
    // propagation on the underlying DOM mousedown when a cell is being edited
    // or the cursor is hovering a polygon.
    document.addEventListener('mousedown', (e) => {
      if (e.button !== 2) return;
      if (!isInsideMapContainer(e.target)) return;
      // Reset the captured latLng so an old click doesn't bleed into this
      // hold; `map.rightclick` will fire (or already fired) for the same
      // pointer event and refresh it.
      // NOTE: we do NOT clear it unconditionally — Google may fire
      // `rightclick` slightly after our mousedown on some browsers.
      clearTimeout(rightHoldTimer);
      rightHoldTimer = setTimeout(() => {
        rightHoldTimer = null;
        const mode = (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.getActiveMode)
          ? LeucenaDrawing.getActiveMode() : null;
        // In draw/hole modes the right-click is repurposed (finish polygon /
        // finish hole), so suppressing the copy avoids fighting the user.
        if (mode === 'draw' || mode === 'hole') return;
        let coordsText = null;
        if (_lastRightClickLatLng) {
          coordsText = `${_lastRightClickLatLng.lat().toFixed(6)}, ${_lastRightClickLatLng.lng().toFixed(6)}`;
        } else if (lastCoords) {
          coordsText = lastCoords;
        }
        if (coordsText) {
          copyCoordinates(coordsText);
          if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
            LeucenaApp.logEvent('coords_copy_hold', LeucenaApp.getSelectedCellId ? LeucenaApp.getSelectedCellId() : null, null, { coords: coordsText, mode: mode });
          }
        }
      }, 2000);
    }, true);

    document.addEventListener('mouseup', (e) => {
      if (e.button === 2 && rightHoldTimer) {
        clearTimeout(rightHoldTimer);
        rightHoldTimer = null;
      }
    }, true);

    // Cancel the timer if the user drags away or the window loses focus mid-hold.
    document.addEventListener('mouseleave', () => {
      if (rightHoldTimer) { clearTimeout(rightHoldTimer); rightHoldTimer = null; }
    }, true);
    window.addEventListener('blur', () => {
      if (rightHoldTimer) { clearTimeout(rightHoldTimer); rightHoldTimer = null; }
    });
  }

  function getGeometryRings(geometry) {
    if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates.map(p => p[0]);
    }
    return [geometry.coordinates[0]];
  }

  function pointInPolygonRing(lng, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];
      if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  function isLngLatInsideGeometry(lng, lat, geometry) {
    if (!geometry) return false;
    const rings = getGeometryRings(geometry);
    return rings.some(ring => pointInPolygonRing(lng, lat, ring));
  }

  function isLatLngInsideMappingCell(cellId, latLng) {
    if (cellId == null || latLng == null) return false;
    const geom = gridCellGeometry[String(cellId)];
    if (!geom) return false;
    const lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
    const lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;
    return isLngLatInsideGeometry(lng, lat, geom);
  }

  function bufferBounds(bounds, factor) {
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const latSpan = ne.lat() - sw.lat();
    const lngSpan = ne.lng() - sw.lng();
    const latBuf = latSpan * factor;
    const lngBuf = lngSpan * factor;
    return new google.maps.LatLngBounds(
      { lat: sw.lat() - latBuf, lng: sw.lng() - lngBuf },
      { lat: ne.lat() + latBuf, lng: ne.lng() + lngBuf }
    );
  }

  function prepareGridData(fc) {
    gridBounds = new google.maps.LatLngBounds();
    for (const feature of fc.features) {
      const props = feature.properties;
      gridData[props.id] = props;
      gridCellGeometry[String(props.id)] = feature.geometry;
      const rings = getGeometryRings(feature.geometry);
      const cellBnds = new google.maps.LatLngBounds();
      for (const ring of rings) {
        for (const coord of ring) {
          const ll = { lat: coord[1], lng: coord[0] };
          gridBounds.extend(ll);
          cellBnds.extend(ll);
        }
      }
      gridCellBounds[props.id] = cellBnds;
    }
  }

  function renderGridFeatures(fc) {
    gridLayer.addGeoJson(fc, { idPropertyName: 'id' });
    gridLayer.setStyle(gridStyleCallback);
  }

  function applyGridGeoJson(fc) {
    prepareGridData(fc);
    renderGridFeatures(fc);
  }

  // ── Camera transition overlay ─────────────────────────────────────────────
  // The Google Maps JS API animates fitBounds/panTo by scaling the currently
  // loaded tiles toward the target viewport while it fetches the new-zoom tiles.
  // On hi-DPI displays (DPR >= 2) the intermediate scaled frames look noticeably
  // blurred, and the blur persists for 100-400 ms after the camera settles
  // because the compositor renders upscaled placeholders until the new tiles
  // arrive. Nothing we do on the main thread can remove that — it's inside the
  // Maps renderer. So we hide the transition behind an opaque overlay that
  // matches the app background, and only fade it out once tilesloaded fires for
  // the destination. The user sees: crisp frame -> short fade -> crisp frame.
  let _transitionFallbackTimer = null;
  let _transitionTilesloadedListener = null;
  // Hard cap on how long the overlay can stay visible. The point of the overlay
  // is to mask the Maps compositor's blur during the brief window where it
  // upscales old tiles, not to gate the entire load. Keep this short so a slow
  // network never leaves the user staring at the spinner: even if tiles aren't
  // fully loaded yet, revealing the map mid-load reads as "still loading"
  // rather than "site broken".
  const TRANSITION_SAFETY_TIMEOUT_MS = 700;

  function _showMapTransition() {
    const overlay = document.getElementById('map-transition-overlay');
    if (!overlay) return;
    if (_transitionFallbackTimer) {
      clearTimeout(_transitionFallbackTimer);
      _transitionFallbackTimer = null;
    }
    if (_transitionTilesloadedListener) {
      google.maps.event.removeListener(_transitionTilesloadedListener);
      _transitionTilesloadedListener = null;
    }
    overlay.classList.add('active');
  }

  function _hideMapTransition() {
    if (_transitionFallbackTimer) {
      clearTimeout(_transitionFallbackTimer);
      _transitionFallbackTimer = null;
    }
    if (_transitionTilesloadedListener) {
      google.maps.event.removeListener(_transitionTilesloadedListener);
      _transitionTilesloadedListener = null;
    }
    const overlay = document.getElementById('map-transition-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
  }

  // Wait for the destination tiles to be fully loaded before fading out.
  // tilesloaded may have already fired for the old viewport; to make sure we
  // react to the *new* one, arm the listener only after the idle callback that
  // follows fitBounds. A safety timeout guarantees we never leave the overlay
  // stuck in the active state if tilesloaded doesn't fire (e.g. offline).
  function _hideMapTransitionWhenTilesReady() {
    if (!map) { _hideMapTransition(); return; }
    if (_transitionTilesloadedListener) {
      google.maps.event.removeListener(_transitionTilesloadedListener);
      _transitionTilesloadedListener = null;
    }
    _transitionTilesloadedListener = google.maps.event.addListenerOnce(map, 'tilesloaded', () => {
      _transitionTilesloadedListener = null;
      requestAnimationFrame(() => _hideMapTransition());
    });
    if (_transitionFallbackTimer) clearTimeout(_transitionFallbackTimer);
    _transitionFallbackTimer = setTimeout(() => {
      _transitionFallbackTimer = null;
      _hideMapTransition();
    }, TRANSITION_SAFETY_TIMEOUT_MS);
  }

  function _toggleSidebarForBrazilView(isBrazil) {
    var progress = document.getElementById('mapping-progress');
    var filters = document.getElementById('sidebar-filters');
    var prompt = document.getElementById('sidebar-brazil-prompt');
    var brazilStats = document.getElementById('sidebar-brazil-stats');
    var cellSearch = document.getElementById('cell-search-section');
    if (progress) progress.style.display = isBrazil ? 'none' : '';
    if (filters) filters.style.display = isBrazil ? 'none' : '';
    if (prompt) prompt.style.display = isBrazil ? '' : 'none';
    if (brazilStats) brazilStats.style.display = isBrazil ? '' : 'none';
    if (cellSearch) cellSearch.style.display = isBrazil ? 'none' : '';
  }

  function _showBrazilOverview() {
    gridLayer.forEach(f => gridLayer.remove(f));
    Object.keys(gridData).forEach(k => delete gridData[k]);
    Object.keys(gridCellBounds).forEach(k => delete gridCellBounds[k]);
    Object.keys(gridCellGeometry).forEach(k => delete gridCellGeometry[k]);
    gridBounds = null;
    initialZoom = null;
    initialCenter = null;
    _editZoomEnforced = false;
    const brBounds = new google.maps.LatLngBounds(
      { lat: BRAZIL_VIEW_BOUNDS.south, lng: BRAZIL_VIEW_BOUNDS.west },
      { lat: BRAZIL_VIEW_BOUNDS.north, lng: BRAZIL_VIEW_BOUNDS.east }
    );
    restrictionBounds = bufferBounds(brBounds, 0.15);
    map.setOptions({
      minZoom: null,
      restriction: { latLngBounds: restrictionBounds, strictBounds: false }
    });
    if (gridLayer) gridLayer.setMap(map);
    _showMapTransition();
    map.fitBounds(brBounds);
    _applyStateOutlineFilter(null);
    updateFilterCounts();
    refreshPointVisibility();
    if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.refreshPolyVisibility) LeucenaDrawing.refreshPolyVisibility();
    _toggleSidebarForBrazilView(true);
    google.maps.event.addListenerOnce(map, 'idle', () => {
      _hideMapTransitionWhenTilesReady();
    });
  }

  let _brazilIdleListener = null;
  let _stateIdleListener = null;

  async function loadGrid() {
    if (!_currentState) {
      _showBrazilOverview();
      if (_brazilIdleListener) google.maps.event.removeListener(_brazilIdleListener);
      _brazilIdleListener = map.addListener('idle', () => {
        refreshPointVisibility();
        if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.refreshPolyVisibility) LeucenaDrawing.refreshPolyVisibility();
      });
      google.maps.event.addListenerOnce(map, 'idle', () => {
        initialZoom = map.getZoom();
        initialCenter = map.getCenter();
        scheduleAutoLabelsOff();
        if (typeof LeucenaApp !== 'undefined' && LeucenaApp.scheduleAutoCollapseLegend) {
          LeucenaApp.scheduleAutoCollapseLegend();
        }
      });
      return;
    }
    try {
      const url = `/api/grid?state=${_currentState}`;
      const cacheKey = _currentState;
      let fc;
      if (gridCache[cacheKey]) {
        fc = gridCache[cacheKey];
      } else {
        const res = await fetch(url);
        fc = await res.json();
        gridCache[cacheKey] = fc;
      }
      const ufInit = _currentState;
      prepareGridData(fc);
      restrictionBounds = bufferBounds(gridBounds, 0.15);
      map.setOptions({
        restriction: { latLngBounds: restrictionBounds, strictBounds: false }
      });
      if (gridLayer) gridLayer.setMap(null);
      _showMapTransition();
      map.fitBounds(gridBounds);
      google.maps.event.addListenerOnce(map, 'idle', function () {
        if (_currentState !== ufInit) return;
        _finalizeStateLoad(fc, ufInit);
      });
    } catch (e) {
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) LeucenaApp.logEvent('grid_load_error', null, null, { error: e.message || String(e) });
      LeucenaApp.showToast(LeucenaI18n.t('toast.gridLoadFail'), 'error');
    }
  }

  async function loadStateGrid(uf) {
    if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) LeucenaApp.logEvent('grid_load', null, null, { state: uf || 'brazil' });
    _currentState = uf || null;
    if (_brazilIdleListener) {
      google.maps.event.removeListener(_brazilIdleListener);
      _brazilIdleListener = null;
    }
    if (_stateIdleListener) {
      google.maps.event.removeListener(_stateIdleListener);
      _stateIdleListener = null;
    }
    if (!_currentState) {
      _showBrazilOverview();
      return;
    }
    // Cover the map immediately: the user may see a few frames of the previous
    // view (Brasil, or another state) being cleared before fitBounds runs, and
    // the fetch for uncached states can take 100-300 ms. Hiding everything
    // behind the overlay from the very first frame keeps the transition clean.
    _showMapTransition();
    gridLayer.forEach(f => gridLayer.remove(f));
    Object.keys(gridData).forEach(k => delete gridData[k]);
    Object.keys(gridCellBounds).forEach(k => delete gridCellBounds[k]);
    Object.keys(gridCellGeometry).forEach(k => delete gridCellGeometry[k]);
    const cacheKey = _currentState;
    let fc;
    if (gridCache[cacheKey]) {
      fc = gridCache[cacheKey];
      // Defer to next frame so the click handler returns immediately even on cache hit.
      // Equalises timing vs the uncached path; without this the synchronous prepareGridData +
      // setOptions + fitBounds runs inside the same click event, blocking the compositor for
      // 200 ms+ and producing visible blur during the camera animation (esp. on hi-DPI).
      await new Promise((r) => requestAnimationFrame(() => r()));
      if (_currentState !== cacheKey) return;
    } else {
      const url = `/api/grid?state=${_currentState}`;
      const res = await fetch(url);
      fc = await res.json();
      gridCache[cacheKey] = fc;
    }
    prepareGridData(fc);
    restrictionBounds = bufferBounds(gridBounds, 0.15);
    map.setOptions({
      restriction: { latLngBounds: restrictionBounds, strictBounds: false }
    });
    const ufLoaded = _currentState;
    _applyStateOutlineFilter(_currentState);
    _toggleSidebarForBrazilView(false);

    if (gridLayer) gridLayer.setMap(null);
    _showMapTransition();
    map.fitBounds(gridBounds);

    google.maps.event.addListenerOnce(map, 'idle', function () {
      if (_currentState !== ufLoaded) return;
      _finalizeStateLoad(fc, ufLoaded);
    });
  }

  // Spread the post-fitBounds work over multiple animation frames. Doing it all in the same
  // frame as the camera 'idle' bunches a 14-25 ms layout (hundreds of dirty objects) with
  // addGeoJson/setStyle for every cell and the MarkerClusterer render — which on hi-DPI
  // (DPR > 1) translates to a visibly blurred frame while the compositor catches up.
  function _finalizeStateLoad(fc, ufLoaded) {
    initialZoom = map.getZoom();
    initialCenter = map.getCenter();
    scheduleAutoLabelsOff();
    if (typeof LeucenaApp !== 'undefined' && LeucenaApp.scheduleAutoCollapseLegend) {
      LeucenaApp.scheduleAutoCollapseLegend();
    }

    // Frame 1: render grid features and outline only. No DOM work, no clusterer.
    requestAnimationFrame(function () {
      if (_currentState !== ufLoaded) return;
      if (gridLayer && map) gridLayer.setMap(map);
      renderGridFeatures(fc);
      _applyStateOutlineFilter(ufLoaded);

      // Frame 2: sidebar/filter DOM updates. Triggers the big layout, but now decoupled
      // from grid rendering and from the Maps composite frame.
      requestAnimationFrame(function () {
        if (_currentState !== ufLoaded) return;
        updateFilterCounts();

        // Frame 3: marker clusterer render and area labels.
        requestAnimationFrame(function () {
          if (_currentState !== ufLoaded) return;
          refreshPointVisibility();
          if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.refreshPolyVisibility) {
            LeucenaDrawing.refreshPolyVisibility();
          }
          updateAreaLabelsForZoom();

          // Nudge the map so Maps recomposes tiles at the final DPR. Cheap on hi-DPI
          // displays where the previous frames may have left soft tiles in place.
          try { map.panBy(0, 0); } catch (e) { /* noop */ }

          // Only now ask the overlay to fade out — and only after the destination
          // tiles report loaded. Any blur the Maps compositor shows while tiles
          // upscale from the old viewport stays hidden behind the overlay.
          _hideMapTransitionWhenTilesReady();

          if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
            LeucenaApp.logEvent('grid_rendered', null, null, { state: ufLoaded, zoom: map.getZoom() });
          }

          // Persistent idle listener so that pan/zoom inside the state always
          // re-syncs the marker clusterer (and the polygon DOM layer). Without
          // this, locking + unlocking a cell while staying zoomed-in left the
          // clusterer holding only the markers from that small viewport, and
          // panning out wouldn't bring the rest of the state's points back.
          if (_stateIdleListener) google.maps.event.removeListener(_stateIdleListener);
          _stateIdleListener = map.addListener('idle', function () {
            if (_currentState !== ufLoaded) return;
            refreshPointVisibility();
            if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.refreshPolyVisibility) {
              LeucenaDrawing.refreshPolyVisibility();
            }
          });
        });
      });
    });
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

  function gridStyleCallback(feature) {
    const cellId = feature.getId();
    const props = gridData[cellId];
    if (!props || !shouldShowCell(props)) return { visible: false };
    const style = getStyleForCell(props, cellId);
    if (_gridsHollow) style.fillOpacity = 0;
    style.clickable = _gridClickable;
    style.cursor = _gridClickable ? 'pointer' : '';
    return style;
  }

  function _computeNeighborCells(cellId) {
    const cb = gridCellBounds[cellId];
    if (!cb) return new Set();
    const ne = cb.getNorthEast();
    const sw = cb.getSouthWest();
    const h = ne.lat() - sw.lat();
    const w = ne.lng() - sw.lng();
    const expandedBounds = new google.maps.LatLngBounds(
      { lat: sw.lat() - h * 0.1, lng: sw.lng() - w * 0.1 },
      { lat: ne.lat() + h * 0.1, lng: ne.lng() + w * 0.1 }
    );
    const neighbors = new Set();
    for (const [id, b] of Object.entries(gridCellBounds)) {
      if (id === String(cellId)) continue;
      if (expandedBounds.intersects(b)) neighbors.add(id);
    }
    return neighbors;
  }

  function setEditingCell(cellId) {
    if (cellId) {
      _editingCellId = String(cellId);
      _editNeighborIds = _computeNeighborCells(cellId);
    } else {
      _editingCellId = null;
      _editNeighborIds = null;
    }
    if (gridLayer) gridLayer.setStyle(gridStyleCallback);
    refreshPointVisibility();
    if (typeof LeucenaDrawing !== 'undefined') LeucenaDrawing.refreshPolyVisibility();
  }

  function isEditNeighborOrSelf(cellId) {
    if (!_editingCellId) return true;
    const sid = String(cellId);
    return sid === _editingCellId || (_editNeighborIds && _editNeighborIds.has(sid));
  }

  function shouldShowCell(props) {
    if (!showGrid) return false;
    if (_editingCellId && !isEditNeighborOrSelf(props.id)) return false;
    return activeFilters.has(props.grid_status);
  }

  function updateCellAppearance(cellId, data) {
    gridData[cellId] = { ...gridData[cellId], ...data };
    if (gridLayer) gridLayer.setStyle(gridStyleCallback);
  }

  function setSelectedCell(cellId) {
    deselectPoint();
    selectedCellId = cellId;
    if (gridLayer) gridLayer.setStyle(gridStyleCallback);
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
      if (extra && extra.mask_count !== undefined) {
        gridData[cellId].mask_count = extra.mask_count;
      }
      if (extra && extra.mask_area_ha !== undefined) {
        gridData[cellId].mask_area_ha = extra.mask_area_ha;
      }
      if (extra && extra.mapped_by !== undefined) {
        gridData[cellId].mapped_by = extra.mapped_by;
      }
      updateCellAppearance(cellId, gridData[cellId]);
      updateFilterCounts();
    }
  }

  function patchCellMeta(cellId, patch) {
    if (!gridData[cellId]) return;
    Object.assign(gridData[cellId], patch);
    updateCellAppearance(cellId, gridData[cellId]);
    updateFilterCounts();
    if (typeof LeucenaApp !== 'undefined' && LeucenaApp.refreshCellSidebarIfSelected) {
      LeucenaApp.refreshCellSidebarIfSelected(cellId);
    }
  }

  /** Com argumento: metadados de uma célula. Sem argumentos: objeto id→props (filtro de máscaras por estado). */
  function getGridData(cellId) {
    if (arguments.length === 0) {
      return gridData;
    }
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
        algorithmOptions: { maxZoom: 12 },
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

  function ensurePointHeatmap() {
    if (!pointHeatmap && map && google.maps.OverlayView) {
      function CanvasPointHeatmap() {
        this.points = [];
        this.canvas = null;
        this.densityCanvas = document.createElement('canvas');
      }
      CanvasPointHeatmap.prototype = new google.maps.OverlayView();
      CanvasPointHeatmap.prototype.onAdd = function () {
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.opacity = '0.78';
        this.getPanes().overlayLayer.appendChild(this.canvas);
      };
      CanvasPointHeatmap.prototype.onRemove = function () {
        if (this.canvas && this.canvas.parentNode) {
          this.canvas.parentNode.removeChild(this.canvas);
        }
        this.canvas = null;
      };
      CanvasPointHeatmap.prototype.setData = function (points) {
        this.points = points || [];
        this.draw();
      };
      CanvasPointHeatmap.prototype._rampColor = function (t) {
        const stops = [
          { t: 0.00, c: [74, 222, 128] },
          { t: 0.38, c: [250, 204, 21] },
          { t: 0.68, c: [249, 115, 22] },
          { t: 1.00, c: [220, 38, 38] }
        ];
        for (let i = 1; i < stops.length; i++) {
          if (t <= stops[i].t) {
            const a = stops[i - 1];
            const b = stops[i];
            const p = (t - a.t) / (b.t - a.t);
            return [
              Math.round(a.c[0] + (b.c[0] - a.c[0]) * p),
              Math.round(a.c[1] + (b.c[1] - a.c[1]) * p),
              Math.round(a.c[2] + (b.c[2] - a.c[2]) * p)
            ];
          }
        }
        return stops[stops.length - 1].c;
      };
      CanvasPointHeatmap.prototype.draw = function () {
        if (!this.canvas || !map) return;
        const bounds = map.getBounds();
        const projection = this.getProjection();
        if (!bounds || !projection) return;

        const ne = projection.fromLatLngToDivPixel(bounds.getNorthEast());
        const sw = projection.fromLatLngToDivPixel(bounds.getSouthWest());
        const left = sw.x;
        const top = ne.y;
        const width = Math.max(1, ne.x - sw.x);
        const height = Math.max(1, sw.y - ne.y);
        const dpr = window.devicePixelRatio || 1;

        this.canvas.style.left = left + 'px';
        this.canvas.style.top = top + 'px';
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        this.canvas.width = Math.ceil(width * dpr);
        this.canvas.height = Math.ceil(height * dpr);
        this.densityCanvas.width = this.canvas.width;
        this.densityCanvas.height = this.canvas.height;

        const ctx = this.canvas.getContext('2d');
        const densityCtx = this.densityCanvas.getContext('2d');
        densityCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        densityCtx.clearRect(0, 0, width, height);
        const zoom = map.getZoom() || 12;
        const radius = Math.max(11, Math.min(23, 26 - zoom * 0.72));

        for (const latLng of this.points) {
          const p = projection.fromLatLngToDivPixel(latLng);
          if (!p) continue;
          const x = p.x - left;
          const y = p.y - top;
          const grad = densityCtx.createRadialGradient(x, y, 0, x, y, radius);
          grad.addColorStop(0.00, 'rgba(0, 0, 0, 0.09)');
          grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.045)');
          grad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
          densityCtx.fillStyle = grad;
          densityCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const density = densityCtx.getImageData(0, 0, this.densityCanvas.width, this.densityCanvas.height);
        const out = ctx.createImageData(density.width, density.height);
        const low = 10;
        const high = 150;
        for (let i = 3; i < density.data.length; i += 4) {
          const a = density.data[i];
          if (a < low) continue;
          const t = Math.max(0, Math.min(1, (a - low) / (high - low)));
          const eased = Math.pow(t, 0.72);
          const color = this._rampColor(eased);
          out.data[i - 3] = color[0];
          out.data[i - 2] = color[1];
          out.data[i - 1] = color[2];
          out.data[i] = Math.round(50 + 175 * eased);
        }
        ctx.putImageData(out, 0, 0);
      };
      pointHeatmap = new CanvasPointHeatmap();
    }
    return pointHeatmap;
  }

  function clearPointHeatmap() {
    if (!pointHeatmap) return;
    pointHeatmap.setMap(null);
    pointHeatmap.setData([]);
  }

  function clearClusteredPointMarkers() {
    if (!pointClusterer) return;
    const allMarkers = Object.values(pointMarkersById).map(e => e.marker);
    if (allMarkers.length) pointClusterer.removeMarkers(allMarkers, true);
    pointClusterer.render();
  }

  function updatePointDisplayModeButton() {
    const btn = document.getElementById('point-display-mode');
    if (!btn) return;
    const labels = { cluster: 'cluster', heatmap: 'heatmap', points: 'pontos' };
    const next = pointDisplayMode === 'cluster' ? 'heatmap' : (pointDisplayMode === 'heatmap' ? 'points' : 'cluster');
    const title = 'Exibindo como ' + labels[pointDisplayMode] + '. Clique para ver como ' + labels[next] + '.';
    btn.dataset.mode = pointDisplayMode;
    btn.title = title;
    btn.setAttribute('aria-label', title);
  }

  function cyclePointDisplayMode() {
    const previousMode = pointDisplayMode;
    pointDisplayMode = pointDisplayMode === 'cluster' ? 'heatmap' : (pointDisplayMode === 'heatmap' ? 'points' : 'cluster');
    if (pointDisplayMode === 'heatmap' && !ensurePointHeatmap()) {
      pointDisplayMode = 'points';
    }
    if (pointDisplayMode === 'cluster' && previousMode !== 'cluster') {
      _hideAllPointMarkers();
    }
    updatePointDisplayModeButton();
    refreshPointVisibility();
    if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
      LeucenaApp.logEvent('point_display_mode', null, null, { mode: pointDisplayMode });
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
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) LeucenaApp.logEvent('points_load_error', null, null, { error: e.message || String(e) });
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

  function refreshPointIcons() { // full pass on icons; only invoked on scale-threshold zoom crossings
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
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      hint.textContent = LeucenaI18n.t(touch ? 'badge.pointSelectedTouch' : 'badge.pointSelected');
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

  /** After unlock: same fit as zoomToCell but without the +1 zoom-in, so the
   *  cell stays fully visible with a bit more surrounding context than
   *  during editing (zoomToCell = fitBounds then +1). */
  function zoomToCellAfterUnlock(cellId) {
    const bounds = getCellBounds(cellId);
    if (!bounds) return;

    map.setOptions({ restriction: null });

    const container = document.getElementById('map');
    const padH = Math.round(container.offsetWidth * 0.20);
    const padV = Math.round(container.offsetHeight * 0.20);
    map.fitBounds(bounds, { top: padV, right: padH, bottom: padV, left: padH });

    google.maps.event.addListenerOnce(map, 'idle', () => {
      map.setCenter(bounds.getCenter());
      if (restrictionBounds) {
        map.setOptions({ restriction: { latLngBounds: restrictionBounds, strictBounds: false } });
      }
      try { triggerResize(); } catch (e) { /* noop */ }
    });
  }

  function zoomToCellViewOnly(cellId) {
    const bounds = getCellBounds(cellId);
    if (!bounds) return;
    releasePanRestriction();
    map.setOptions({ restriction: null });
    const center = bounds.getCenter();
    const container = document.getElementById('map');
    const padH = Math.round(container.offsetWidth * 0.20);
    const padV = Math.round(container.offsetHeight * 0.20);
    map.fitBounds(bounds, { top: padV, right: padH, bottom: padV, left: padH });
    google.maps.event.addListenerOnce(map, 'idle', () => {
      map.setCenter(center);
      map.setZoom(map.getZoom() + 1);
      if (restrictionBounds) {
        map.setOptions({ restriction: { latLngBounds: restrictionBounds, strictBounds: false } });
      }
    });
  }

  /** Normalize cell search: strip #, remove junk chars, accept "sp 828", "sp:828", "sp828", "SP-828-1-3", etc. */
  function normalizeCellSearchQuery(raw) {
    let s = String(raw || '').trim().replace(/^#/, '').toUpperCase();
    s = s.replace(/[^A-Z0-9\-]/g, '');
    s = s.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    if (!s) return '';
    const ufHyphen = s.match(/^([A-Z]{2})-(\d[\d\-]*)$/);
    if (ufHyphen) return ufHyphen[2];
    const ufJoined = s.match(/^([A-Z]{2})(\d[\d\-]*)$/);
    if (ufJoined) return ufJoined[2];
    return s;
  }

  function findCellsByGridId(query) {
    const q = normalizeCellSearchQuery(query);
    if (!q) return [];
    const results = [];
    for (const id in gridData) {
      const gid = (gridData[id].grid_id || String(id)).toUpperCase();
      // Cell ids look like "KX-330-1". The user may type with or without the
      // 2-letter cell-code prefix (e.g. "kx330", "330", "330-1", "KX-330-1",
      // "KX-330"). normalizeCellSearchQuery() already strips a leading 2-letter
      // prefix, so we also match against the cell id's tail (everything after
      // a leading "AA-") to make those joined / prefix-less variants work.
      const tail = gid.replace(/^[A-Z]{2}-/, '');
      if (gid === q || gid.startsWith(q + '-')
          || tail === q || tail.startsWith(q + '-')) {
        results.push({ id: Number(id), grid_id: gridData[id].grid_id || String(id) });
      }
    }
    return results;
  }

  function zoomToCells(cellIds) {
    if (!cellIds || cellIds.length === 0) return;
    if (cellIds.length === 1) {
      zoomToCellViewOnly(cellIds[0]);
      return;
    }
    const combined = new google.maps.LatLngBounds();
    let found = 0;
    for (const id of cellIds) {
      const b = gridCellBounds[id];
      if (b) {
        combined.extend(b.getNorthEast());
        combined.extend(b.getSouthWest());
        found++;
      }
    }
    if (found === 0) return;
    releasePanRestriction();
    map.setOptions({ restriction: null });
    const container = document.getElementById('map');
    const padH = Math.round(container.offsetWidth * 0.15);
    const padV = Math.round(container.offsetHeight * 0.15);
    map.fitBounds(combined, { top: padV, right: padH, bottom: padV, left: padH });
    google.maps.event.addListenerOnce(map, 'idle', () => {
      if (restrictionBounds) {
        map.setOptions({ restriction: { latLngBounds: restrictionBounds, strictBounds: false } });
      }
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

    // No API restriction; we handle pan enforcement manually via snap-back
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
      restriction: restrictionBounds ? { latLngBounds: restrictionBounds, strictBounds: false } : null
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
    const collabEl = document.getElementById('layer-collaborators');
    let checkedCount = Array.from(children).filter(c => c.checked).length;
    let totalCount = children.length;
    if (collabEl && collabEl.offsetParent !== null) {
      totalCount++;
      if (collabEl.checked) checkedCount++;
    }
    parent.checked = checkedCount > 0;
    parent.indeterminate = checkedCount > 0 && checkedCount < totalCount;
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
        if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) LeucenaApp.logEvent('filter_grid_status', null, null, { status: status, visible: this.checked });
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
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) LeucenaApp.logEvent('filter_grid', null, null, { visible: checked });
    });

    const layerCheckboxes = document.querySelectorAll('[data-layer]');
    const collabCb = document.getElementById('layer-collaborators');

    layerCheckboxes.forEach(cb => {
      cb.addEventListener('change', function () {
        const layer = this.dataset.layer;
        if (this.checked) visiblePointLayers.add(layer);
        else visiblePointLayers.delete(layer);
        syncPointsParent();
        refreshPointVisibility();
        if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) LeucenaApp.logEvent('filter_point_layer', null, null, { layer: layer, visible: this.checked });
      });
    });

    document.getElementById('toggle-points').addEventListener('change', function () {
      const checked = this.checked;
      this.indeterminate = false;
      showPoints = checked;
      if (checked) {
        POINT_LAYERS.forEach(l => visiblePointLayers.add(l));
        layerCheckboxes.forEach(cb => { cb.checked = true; });
        _showCollaboratorPoints = true;
        if (collabCb) collabCb.checked = true;
      } else {
        visiblePointLayers.clear();
        layerCheckboxes.forEach(cb => { cb.checked = false; });
        _showCollaboratorPoints = false;
        if (collabCb) collabCb.checked = false;
      }
      refreshPointVisibility();
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) LeucenaApp.logEvent('filter_points_all', null, null, { visible: checked });
    });

    const pointDisplayBtn = document.getElementById('point-display-mode');
    if (pointDisplayBtn) {
      updatePointDisplayModeButton();
      pointDisplayBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        cyclePointDisplayMode();
      });
    }

    document.getElementById('toggle-polygons').addEventListener('change', function () {
      showPolygons = this.checked;
      if (typeof LeucenaDrawing !== 'undefined') {
        LeucenaDrawing.setVisible(showPolygons);
      }
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) LeucenaApp.logEvent('filter_polygons', null, null, { visible: this.checked });
    });

    document.getElementById('toggle-masks-member').addEventListener('change', function () {
      if (typeof LeucenaDrawing !== 'undefined') LeucenaDrawing.setMemberMasksVisible(this.checked);
    });

    document.getElementById('toggle-masks-contributor').addEventListener('change', function () {
      if (typeof LeucenaDrawing !== 'undefined') LeucenaDrawing.setContributorMasksVisible(this.checked);
    });

    // QC sub-filters (team+ only). They split contributor masks by review status
    // using the same colors as the QC review panel badges.
    const qcStatuses = ['unreviewed', 'flagged', 'rejected', 'approved'];
    qcStatuses.forEach(function (s) {
      const cb = document.getElementById('toggle-qc-' + s);
      if (!cb) return;
      cb.addEventListener('change', function () {
        if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.setQcStatusVisible) {
          LeucenaDrawing.setQcStatusVisible(s, this.checked);
        }
        if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
          LeucenaApp.logEvent('filter_qc', null, null, { status: s, visible: this.checked });
        }
      });
    });

    if (collabCb) {
      collabCb.addEventListener('change', function () {
        _showCollaboratorPoints = this.checked;
        if (this.checked) {
          showPoints = true;
        }
        syncPointsParent();
        refreshPointVisibility();
        if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) LeucenaApp.logEvent('filter_collaborators', null, null, { visible: this.checked, showPoints: showPoints });
      });
    }

    syncPointsParent();
  }

  function refreshGridVisibility() {
    if (gridLayer) gridLayer.setStyle(gridStyleCallback);
  }

  // Cached element refs for updateFilterCounts. Avoids the per-call getElementById storm
  // (was 14+ lookups per frame) and skips setting textContent/style.width when the value
  // hasn't changed — DOM no-op writes still cost layout invalidation in some Chrome versions.
  const _filterCountEls = {};
  function _fcEl(id) {
    let el = _filterCountEls[id];
    if (el === undefined) { el = document.getElementById(id); _filterCountEls[id] = el; }
    return el;
  }
  function _fcSetText(id, txt) {
    const el = _fcEl(id);
    if (el && el.textContent !== txt) el.textContent = txt;
  }
  function _fcSetWidth(id, pctStr) {
    const el = _fcEl(id);
    if (el && el.style.width !== pctStr) el.style.width = pctStr;
  }

  function updateFilterCounts() {
    const statusCounts = { not_yet_finished: 0, in_use: 0, mapping: 0, no_points: 0, finished: 0 };
    let gridTotal = 0;
    for (const props of Object.values(gridData)) {
      gridTotal++;
      if (statusCounts[props.grid_status] !== undefined) statusCounts[props.grid_status]++;
    }
    const setText = (id, n) => _fcSetText(id, '(' + n + ')');
    setText('count-grid-total', gridTotal);
    setText('count-not_yet_finished', statusCounts.not_yet_finished);
    setText('count-in_use', statusCounts.in_use);
    setText('count-mapping', statusCounts.mapping);
    setText('count-no_points', statusCounts.no_points);
    setText('count-finished', statusCounts.finished);

    if (gridTotal > 0) {
      const relevantTotal = gridTotal - statusCounts.no_points;
      const denom = relevantTotal > 0 ? relevantTotal : 1;
      const finishedPct = (statusCounts.finished / denom * 100);
      const mappingPct = ((statusCounts.mapping + statusCounts.in_use) / denom * 100);
      const tomapPct = (statusCounts.not_yet_finished / denom * 100);
      _fcSetWidth('progress-finished', finishedPct.toFixed(1) + '%');
      _fcSetWidth('progress-mapping', mappingPct.toFixed(1) + '%');
      _fcSetWidth('progress-tomap', tomapPct.toFixed(1) + '%');
      _fcSetText('progress-pct-label', (finishedPct + mappingPct).toFixed(1) + '%');
      _fcSetText('progress-finished-pct', finishedPct.toFixed(1) + '%');
      _fcSetText('progress-mapping-pct', mappingPct.toFixed(1) + '%');
      _fcSetText('progress-tomap-pct', tomapPct.toFixed(1) + '%');
    }

    const layerCounts = { crowdmapping: 0, inaturalist: 0, gbif: 0, insthorus: 0, specieslink: 0 };
    let pointsTotal = 0;
    let collabCount = 0;
    const stateScopedPoints = !!_currentState;
    for (const entry of Object.values(pointMarkersById)) {
      if (stateScopedPoints && !isPointInLoadedGrid(entry.marker.getPosition())) continue;
      pointsTotal++;
      const l = (entry.data.layer || 'crowdmapping').toLowerCase();
      if (layerCounts[l] !== undefined) layerCounts[l]++;
      if (_isCollaboratorPoint(entry.data)) collabCount++;
    }
    _fcSetText('count-points-total', '(' + pointsTotal + ')');
    _fcSetText('count-crowdmapping', '(' + layerCounts.crowdmapping + ')');
    _fcSetText('count-inaturalist', '(' + layerCounts.inaturalist + ')');
    _fcSetText('count-gbif', '(' + layerCounts.gbif + ')');
    _fcSetText('count-insthorus', '(' + layerCounts.insthorus + ')');
    _fcSetText('count-specieslink', '(' + layerCounts.specieslink + ')');
    _fcSetText('count-collaborators', '(' + collabCount + ')');

    const polyCount = (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.getPolygonCount) ? LeucenaDrawing.getPolygonCount() : 0;
    _fcSetText('count-polygons-total', '(' + polyCount + ')');

    const subEl = document.getElementById('mask-subcategories');
    if (subEl && typeof LeucenaApp !== 'undefined') {
      const role = LeucenaApp.getUserRole ? LeucenaApp.getUserRole() : null;
      const showSubs = role === 'superadmin' || role === 'admin' || role === 'team';

      const chevron = document.getElementById('mask-hierarchy-chevron');
      if (chevron) {
        chevron.classList.toggle('hidden', !showSubs);
      }

      if (showSubs) {
        subEl.classList.remove('hidden');
      } else {
        subEl.classList.add('hidden');
      }

      const defLeg = document.getElementById('legend-mask-default');
      const memLeg = document.getElementById('legend-mask-member');
      const conLeg = document.getElementById('legend-mask-contributor');
      if (defLeg) defLeg.classList.toggle('hidden', showSubs);
      if (memLeg) memLeg.classList.toggle('hidden', !showSubs);
      if (conLeg) conLeg.classList.toggle('hidden', !showSubs);
      document.querySelectorAll('.legend-qc-row').forEach(function (row) {
        row.classList.toggle('hidden', !showSubs);
      });
      if (showSubs && typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.getPolygonCounts) {
        const counts = LeucenaDrawing.getPolygonCounts();
        _fcSetText('count-masks-member', '(' + counts.member + ')');
        _fcSetText('count-masks-contributor', '(' + counts.contributor + ')');
        if (counts.qc) {
          _fcSetText('count-qc-unreviewed', '(' + counts.qc.unreviewed + ')');
          _fcSetText('count-qc-flagged', '(' + counts.qc.flagged + ')');
          _fcSetText('count-qc-rejected', '(' + counts.qc.rejected + ')');
          _fcSetText('count-qc-approved', '(' + counts.qc.approved + ')');
        }
      }

      // QC subfilters mirror the contributor visibility — only relevant for team+.
      const qcGroup = subEl.querySelector('.filter-qc-subgroup');
      if (qcGroup) qcGroup.classList.toggle('hidden', !showSubs);
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
    _gridClickable = clickable;
    if (gridLayer) gridLayer.setStyle(gridStyleCallback);
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

  // Notify Google Maps that its container size changed (used by Street View
  // resizer so tiles re-render at the correct dimensions instead of leaving
  // a stretched bitmap behind).
  function triggerResize() {
    if (map && typeof google !== 'undefined' && google.maps && google.maps.event) {
      google.maps.event.trigger(map, 'resize');
    }
  }

  function getCellBounds(cellId) {
    return gridCellBounds[cellId] || null;
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

  function cellHasUnvalidatedPoints(cellId) {
    const bounds = getCellBounds(cellId);
    if (!bounds) return false;
    for (const entry of Object.values(pointMarkersById)) {
      if (entry.data.status !== 0) continue;
      const pos = entry.marker.getPosition();
      if (bounds.contains(pos)) return true;
    }
    return false;
  }

  function cellHasAnyPoints(cellId) {
    const bounds = getCellBounds(cellId);
    if (!bounds) return false;
    for (const entry of Object.values(pointMarkersById)) {
      const pos = entry.marker.getPosition();
      if (bounds.contains(pos)) return true;
    }
    return false;
  }

  function getShowPolygons() { return showPolygons; }

  function setGridsHollow(hollow) {
    _gridsHollow = hollow;
    if (gridLayer) gridLayer.setStyle(gridStyleCallback);
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
    if (pointDisplayMode === 'cluster' && pointClusterer && isPointLayerVisible(layer)) {
      const viewport = map ? map.getBounds() : null;
      if (!viewport || viewport.contains(marker.getPosition())) {
        pointClusterer.addMarker(marker, true);
        pointClusterer.render();
      }
    } else {
      refreshPointVisibility();
    }

    updateFilterCounts();
    return marker;
  }

  function isPointLayerVisible(layer) {
    const key = (layer || 'crowdmapping').toLowerCase();
    return showPoints && visiblePointLayers.has(key);
  }

  function isPointInLoadedGrid(position) {
    if (!gridBounds || !gridBounds.contains(position)) return false;
    for (const b of Object.values(gridCellBounds)) {
      if (b.contains(position)) return true;
    }
    return false;
  }

  function findCellAtPosition(latLng) {
    for (const [cellId, b] of Object.entries(gridCellBounds)) {
      if (b.contains(latLng)) return cellId;
    }
    return null;
  }

  function _isCollaboratorPoint(data) {
    const role = data.added_by_role;
    return role === 'contributor' || role === 'collaborator';
  }

  function _passesCollabFilter(data) {
    if (_showCollaboratorPoints) return true;
    return !_isCollaboratorPoint(data);
  }

  function _isPointVisible(data, layer) {
    if (_showCollaboratorPoints && _isCollaboratorPoint(data) && showPoints) return true;
    if (!isPointLayerVisible(layer)) return false;
    return _passesCollabFilter(data);
  }

  function _isPointInEditScope(position) {
    if (!_editingCellId) return true;
    const editBounds = gridCellBounds[_editingCellId];
    if (editBounds && editBounds.contains(position)) return true;
    if (_editNeighborIds) {
      for (const nid of _editNeighborIds) {
        const nb = gridCellBounds[nid];
        if (nb && nb.contains(position)) return true;
      }
    }
    return false;
  }

  function _getVisiblePointEntries(viewport, brazilOverview, stateFilter) {
    if (brazilOverview) return [];
    const entries = [];
    for (const entry of Object.values(pointMarkersById)) {
      const layer = entry.data.layer || 'crowdmapping';
      const position = entry.marker.getPosition();
      const inView = !viewport || viewport.contains(position);
      const inState = !stateFilter || isPointInLoadedGrid(position);
      const inEditScope = _isPointInEditScope(position);
      if (_isPointVisible(entry.data, layer) && inView && inState && inEditScope) {
        entries.push(entry);
      }
    }
    return entries;
  }

  function _hideAllPointMarkers() {
    for (const entry of Object.values(pointMarkersById)) {
      entry.marker.setMap(null);
    }
  }

  function refreshPointVisibility() {
    const viewport = map ? map.getBounds() : null;
    const brazilOverview = !_currentState;
    const stateFilter = !!_currentState;
    ensureClusterer();
    const visibleEntries = _getVisiblePointEntries(viewport, brazilOverview, stateFilter);

    if (brazilOverview) {
      clearClusteredPointMarkers();
      clearPointHeatmap();
      _hideAllPointMarkers();
      return;
    }

    if (pointDisplayMode === 'heatmap') {
      const heatmap = ensurePointHeatmap();
      clearClusteredPointMarkers();
      _hideAllPointMarkers();
      if (heatmap) {
        heatmap.setData(visibleEntries.map(entry => entry.marker.getPosition()));
        heatmap.setMap(visibleEntries.length ? map : null);
        return;
      }
      pointDisplayMode = 'points';
      updatePointDisplayModeButton();
    } else {
      clearPointHeatmap();
    }

    if (!pointClusterer) {
      const visibleMarkers = new Set(visibleEntries.map(entry => entry.marker));
      for (const entry of Object.values(pointMarkersById)) {
        entry.marker.setMap(visibleMarkers.has(entry.marker) ? map : null);
      }
      return;
    }

    if (pointDisplayMode === 'points') {
      clearClusteredPointMarkers();
      const visibleMarkers = new Set(visibleEntries.map(entry => entry.marker));
      for (const entry of Object.values(pointMarkersById)) {
        entry.marker.setMap(visibleMarkers.has(entry.marker) ? map : null);
      }
      return;
    }

    const toAdd = [];
    const toRemove = [];
    const visibleMarkers = new Set(visibleEntries.map(entry => entry.marker));
    for (const entry of Object.values(pointMarkersById)) {
      if (visibleMarkers.has(entry.marker)) {
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
    if (pointDisplayMode !== 'cluster') refreshPointVisibility();
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
    map.setOptions({ restriction: null });
    if (initialZoom != null && initialCenter) {
      map.setCenter(initialCenter);
      map.setZoom(initialZoom);
    } else if (gridBounds) {
      map.fitBounds(gridBounds);
    } else {
      const brBounds = new google.maps.LatLngBounds(
        { lat: BRAZIL_VIEW_BOUNDS.south, lng: BRAZIL_VIEW_BOUNDS.west },
        { lat: BRAZIL_VIEW_BOUNDS.north, lng: BRAZIL_VIEW_BOUNDS.east }
      );
      map.fitBounds(brBounds);
    }
    google.maps.event.addListenerOnce(map, 'idle', () => {
      if (restrictionBounds || gridBounds) {
        map.setOptions({
          restriction: { latLngBounds: restrictionBounds || gridBounds, strictBounds: false }
        });
      }
    });
  }

  return {
    init,
    getMap,
    triggerResize,
    updateCellAppearance,
    onCellLocked,
    onCellUnlocked,
    onCellStatusChanged,
    patchCellMeta,
    getCellBounds,
    getShowPolygons,
    showStreetViewCoverage,
    zoomToCell,
    zoomToCellAfterUnlock,
    zoomToCellViewOnly,
    zoomToCells,
    findCellsByGridId,
    normalizeCellSearchQuery,
    restrictPanToCell,
    releasePanRestriction,
    setEditingCell,
    isEditNeighborOrSelf,
    refreshPointVisibility,
    updatePointAppearance,
    getGridData,
    getCurrentState: function () { return _currentState; },
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
    loadStateGrid,
    findCellAtPosition,
    isLatLngInsideMappingCell,
    setStateStats,
    refreshLabelToggleTitleForLang,
    updateFilterCounts,
    selectPoint,
    selectPointsPreview,
    deselectPoint,
    hasSelectedPoints: () => selectedPointIds.size > 0,
    unspiderfy,
    togglePointValidity,
    cellHasCrowdmapping,
    cellHasUnvalidatedPoints,
    cellHasAnyPoints,
    updateAreaLabelsForZoom
  };
})();

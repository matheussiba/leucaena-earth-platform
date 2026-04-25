window.LeucenaStreetView = (function () {
  // Wraps StreetViewService + StreetViewPanorama for map-embedded Street View (coverage + pano panel).
  let panorama = null;
  let svService = null;
  let active = false;
  // Pegman-style "I'm looking that way" marker overlaid on the map. Shows the
  // panorama's current position as a circle and a triangular cone indicating
  // the viewing direction (heading). Updated live when the user pans the
  // panorama or the panorama snaps to a different pano via arrow links.
  let _directionMarker = null;
  let _povListener = null;
  let _posListener = null;
  // Cache the listeners' panorama instance so we don't double-register if
  // showAt() is called multiple times before close().
  let _markedPanorama = null;

  function init() {
    svService = new google.maps.StreetViewService();

    document.getElementById('tool-streetview').addEventListener('click', toggleActive);
    document.getElementById('close-streetview').addEventListener('click', close);
    _setupResizer();
    _restoreSavedHeight();
  }

  // Persist the user's preferred Street View pane height across sessions so
  // they don't have to re-drag the divider every time they open it.
  const SV_HEIGHT_KEY = 'leucena.svHeight';
  const SV_HEIGHT_MIN = 160;
  // Hard upper bound: leave at least 200px of map visible regardless of how
  // far the user drags. Computed from the map container's height.
  function _maxAllowedHeight() {
    const container = document.getElementById('map-container');
    const h = container ? container.clientHeight : window.innerHeight;
    return Math.max(SV_HEIGHT_MIN, h - 200);
  }

  function _applyHeight(px) {
    const sv = document.getElementById('streetview-container');
    if (!sv) return;
    const clamped = Math.max(SV_HEIGHT_MIN, Math.min(_maxAllowedHeight(), Math.round(px)));
    sv.style.height = clamped + 'px';
    // Tell Google Maps the viewport changed so tiles re-render correctly.
    if (typeof LeucenaMap !== 'undefined' && LeucenaMap.triggerResize) {
      LeucenaMap.triggerResize();
    } else if (typeof google !== 'undefined' && google.maps && google.maps.event) {
      const m = LeucenaMap && LeucenaMap.getMap && LeucenaMap.getMap();
      if (m) google.maps.event.trigger(m, 'resize');
    }
  }

  function _restoreSavedHeight() {
    try {
      const saved = parseInt(localStorage.getItem(SV_HEIGHT_KEY) || '', 10);
      if (saved && saved >= SV_HEIGHT_MIN) _applyHeight(saved);
    } catch (e) { /* ignore quota / disabled storage */ }
  }

  function _setupResizer() {
    const resizer = document.getElementById('streetview-resizer');
    const sv = document.getElementById('streetview-container');
    if (!resizer || !sv) return;
    let startY = 0;
    let startH = 0;
    let dragging = false;

    const onMove = (e) => {
      if (!dragging) return;
      const y = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
      // Dragging the handle UP grows the SV pane (handle sits above SV).
      const delta = startY - y;
      _applyHeight(startH + delta);
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove('sv-resizing');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      try {
        localStorage.setItem(SV_HEIGHT_KEY, String(sv.getBoundingClientRect().height));
      } catch (e) { /* ignore */ }
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
        LeucenaApp.logEvent('streetview_resize', null, null, { height: Math.round(sv.getBoundingClientRect().height) });
      }
    };
    const onDown = (e) => {
      // Only resize when SV is actually visible.
      if (sv.classList.contains('hidden')) return;
      const y = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
      startY = y;
      startH = sv.getBoundingClientRect().height;
      dragging = true;
      document.body.classList.add('sv-resizing');
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
      e.preventDefault();
    };
    resizer.addEventListener('mousedown', onDown);
    resizer.addEventListener('touchstart', onDown, { passive: false });
    // Keyboard accessibility: arrow keys nudge the divider.
    resizer.addEventListener('keydown', (e) => {
      if (sv.classList.contains('hidden')) return;
      const cur = sv.getBoundingClientRect().height;
      if (e.key === 'ArrowUp') { _applyHeight(cur + 16); e.preventDefault(); }
      if (e.key === 'ArrowDown') { _applyHeight(cur - 16); e.preventDefault(); }
    });
  }

  // Turn off any polygon mode (draw/edit/delete/hole) AND any point mode (insert/delete)
  // so map clicks reach the Street View coverage lines instead of being intercepted
  // by the editing tools. setMode('select') already clears point modes when active.
  function _disableAllEditTools() {
    if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.setMode) {
      LeucenaDrawing.setMode('select');
    }
    if (typeof LeucenaApp !== 'undefined') {
      if (LeucenaApp.setInsertionMode) LeucenaApp.setInsertionMode(false);
      if (LeucenaApp.setDeletionMode) LeucenaApp.setDeletionMode(false);
    }
  }

  function toggleActive() {
    if (active) {
      _deactivate();
      return;
    }

    // Activating: if the user is mid-draw, route through the abandon-draw modal so
    // their work isn't silently discarded.
    if (typeof LeucenaDrawing !== 'undefined'
        && LeucenaDrawing.isPolygonInProgress
        && LeucenaDrawing.isPolygonInProgress()
        && LeucenaDrawing.confirmAbandonDraw) {
      LeucenaDrawing.confirmAbandonDraw(_activate, function () { /* user kept drawing */ });
      return;
    }
    _activate();
  }

  function _activate() {
    _disableAllEditTools();
    active = true;
    // body-level class drives the "compact tools" CSS (icon-only buttons,
    // hidden section titles) so the user has more screen real estate while
    // looking around in Street View.
    document.body.classList.add('sv-active');
    if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.syncStreetViewToolbarActive) {
      LeucenaDrawing.syncStreetViewToolbarActive();
    }
    LeucenaMap.showStreetViewCoverage(true);
    if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
      LeucenaApp.logEvent('streetview_open', null, null, null);
    }
    LeucenaApp.showToast(LeucenaI18n.t('toast.svClickHint'), 'info');
  }

  function _deactivate() {
    active = false;
    document.body.classList.remove('sv-active');
    if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.syncStreetViewToolbarActive) {
      LeucenaDrawing.syncStreetViewToolbarActive();
    }
    LeucenaMap.showStreetViewCoverage(false);
    if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
      LeucenaApp.logEvent('streetview_close', null, null, null);
    }
    close();
  }

  function isActive() {
    return active;
  }

  function _directionIcon(heading) {
    // Mirrors Google Maps' pegman dot: a green circle with a translucent
    // viewing cone. We bake the cone's heading directly into the SVG path
    // (rotating the cone around the centre) so the marker icon can stay a
    // simple Symbol/icon URL — much smoother than swapping markers on every
    // `pov_changed` event.
    const h = ((heading || 0) % 360 + 360) % 360;
    const rad = (h - 90) * Math.PI / 180; // SVG 0deg points right; we want north
    // Cone half-angle in degrees → tip points along heading, base spans ±35deg.
    const half = 35 * Math.PI / 180;
    const len = 26;
    const ax = 16 + len * Math.cos(rad - half);
    const ay = 16 + len * Math.sin(rad - half);
    const bx = 16 + len * Math.cos(rad + half);
    const by = 16 + len * Math.sin(rad + half);
    const svg = [
      "<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='-6 -6 44 44'>",
        "<defs>",
          "<radialGradient id='svConeGrad' cx='50%' cy='50%' r='50%'>",
            "<stop offset='0%' stop-color='%2384cc16' stop-opacity='0.75'/>",
            "<stop offset='100%' stop-color='%2384cc16' stop-opacity='0'/>",
          "</radialGradient>",
        "</defs>",
        "<path d='M16 16 L" + ax.toFixed(1) + " " + ay.toFixed(1) + " A" + len + " " + len + " 0 0 1 " + bx.toFixed(1) + " " + by.toFixed(1) + " Z' fill='url(%23svConeGrad)' stroke='none'/>",
        "<circle cx='16' cy='16' r='7' fill='%23ffffff' stroke='%23166534' stroke-width='2'/>",
        "<circle cx='16' cy='16' r='3.5' fill='%23166534'/>",
      "</svg>"
    ].join('');
    return {
      url: 'data:image/svg+xml;utf8,' + svg,
      anchor: new google.maps.Point(22, 22),
      scaledSize: new google.maps.Size(44, 44)
    };
  }

  function _ensureDirectionMarker(position, heading) {
    const map = LeucenaMap && LeucenaMap.getMap && LeucenaMap.getMap();
    if (!map || !position) return;
    if (!_directionMarker) {
      _directionMarker = new google.maps.Marker({
        position: position,
        map: map,
        icon: _directionIcon(heading),
        // Stay above polygons and points but below modal/UI overlays.
        zIndex: 9999,
        clickable: false,
        // Smaller hitbox so it doesn't intercept clicks on overlapping cells.
        optimized: false
      });
    } else {
      _directionMarker.setPosition(position);
      _directionMarker.setIcon(_directionIcon(heading));
      if (!_directionMarker.getMap()) _directionMarker.setMap(map);
    }
  }

  function _attachDirectionMarker() {
    if (!panorama) return;
    if (_markedPanorama === panorama) {
      // Already attached — just refresh from current state.
      const pos = panorama.getPosition();
      const pov = panorama.getPov();
      _ensureDirectionMarker(pos, pov ? pov.heading : 0);
      return;
    }
    _detachDirectionMarker();
    _markedPanorama = panorama;
    const initialPos = panorama.getPosition();
    const initialPov = panorama.getPov() || { heading: 0 };
    _ensureDirectionMarker(initialPos, initialPov.heading);
    _povListener = panorama.addListener('pov_changed', () => {
      if (!_directionMarker) return;
      const pov = panorama.getPov() || { heading: 0 };
      _directionMarker.setIcon(_directionIcon(pov.heading));
    });
    _posListener = panorama.addListener('position_changed', () => {
      const p = panorama.getPosition();
      if (p && _directionMarker) _directionMarker.setPosition(p);
    });
  }

  function _detachDirectionMarker() {
    if (_povListener && google.maps.event && google.maps.event.removeListener) {
      google.maps.event.removeListener(_povListener);
    }
    if (_posListener && google.maps.event && google.maps.event.removeListener) {
      google.maps.event.removeListener(_posListener);
    }
    _povListener = null;
    _posListener = null;
    _markedPanorama = null;
    if (_directionMarker) {
      _directionMarker.setMap(null);
    }
  }

  function showAt(latLng) {
    const container = document.getElementById('streetview-container');
    container.classList.remove('hidden');
    const resizer = document.getElementById('streetview-resizer');
    if (resizer) resizer.classList.remove('hidden');

    // Nearest panorama within radius (m); toast when Street View has no coverage there.
    svService.getPanorama({ location: latLng, radius: 100 }, (data, status) => {
      if (status === google.maps.StreetViewStatus.OK) {
        if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
          LeucenaApp.logEvent('streetview_show', null, null, { lat: data.location.latLng.lat(), lng: data.location.latLng.lng() });
        }
        if (!panorama) {
          panorama = new google.maps.StreetViewPanorama(
            document.getElementById('streetview-pano'),
            {
              position: data.location.latLng,
              pov: { heading: 0, pitch: 0 },
              zoom: 1,
              addressControl: true,
              linksControl: true,
              panControl: true,
              enableCloseButton: false
            }
          );
        } else {
          panorama.setPosition(data.location.latLng);
        }
        // Attach AFTER the panorama exists so the listeners hook into the
        // current instance. Re-attach on subsequent showAt() calls is a no-op
        // because we cache `_markedPanorama`.
        _attachDirectionMarker();
      } else {
        LeucenaApp.showToast(LeucenaI18n.t('toast.svNotAvailable'), 'warning');
      }
    });
  }

  function close() {
    document.getElementById('streetview-container').classList.add('hidden');
    const resizer = document.getElementById('streetview-resizer');
    if (resizer) resizer.classList.add('hidden');
    active = false;
    document.body.classList.remove('sv-active');
    document.getElementById('tool-streetview').classList.remove('active');
    const floatBtn = document.getElementById('tool-streetview-float');
    if (floatBtn) floatBtn.classList.remove('active');
    LeucenaMap.showStreetViewCoverage(false);
    // Drop the marker so the map isn't littered with a "viewing direction" dot
    // after the user closes Street View. Listeners get unregistered too,
    // otherwise they'd keep firing if the panorama is reused later.
    _detachDirectionMarker();
  }

  return { init, isActive, showAt, close };
})();

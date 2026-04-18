window.LeucenaStreetView = (function () {
  // Wraps StreetViewService + StreetViewPanorama for map-embedded Street View (coverage + pano panel).
  let panorama = null;
  let svService = null;
  let active = false;

  function init() {
    svService = new google.maps.StreetViewService();

    document.getElementById('tool-streetview').addEventListener('click', toggleActive);
    document.getElementById('close-streetview').addEventListener('click', close);
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

  function showAt(latLng) {
    const container = document.getElementById('streetview-container');
    container.classList.remove('hidden');

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
      } else {
        LeucenaApp.showToast(LeucenaI18n.t('toast.svNotAvailable'), 'warning');
      }
    });
  }

  function close() {
    document.getElementById('streetview-container').classList.add('hidden');
    active = false;
    document.getElementById('tool-streetview').classList.remove('active');
    const floatBtn = document.getElementById('tool-streetview-float');
    if (floatBtn) floatBtn.classList.remove('active');
    LeucenaMap.showStreetViewCoverage(false);
  }

  return { init, isActive, showAt, close };
})();

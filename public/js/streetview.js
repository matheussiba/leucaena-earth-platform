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

  function toggleActive() {
    active = !active;
    const btn = document.getElementById('tool-streetview');
    const floatBtn = document.getElementById('tool-streetview-float');
    if (active) {
      const drawMode = typeof LeucenaDrawing !== 'undefined' ? LeucenaDrawing.getActiveMode() : null;
      if (drawMode === 'draw' && !LeucenaDrawing.isPolygonInProgress()) {
        LeucenaDrawing.setMode('select');
      }
      btn.classList.add('active');
      if (floatBtn) floatBtn.classList.add('active');
      LeucenaMap.showStreetViewCoverage(true);
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
        LeucenaApp.logEvent('streetview_open', null, null, null);
      }
      LeucenaApp.showToast(LeucenaI18n.t('toast.svClickHint'), 'info');
    } else {
      btn.classList.remove('active');
      if (floatBtn) floatBtn.classList.remove('active');
      LeucenaMap.showStreetViewCoverage(false);
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
        LeucenaApp.logEvent('streetview_close', null, null, null);
      }
      close();
    }
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

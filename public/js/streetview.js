window.LeucenaStreetView = (function () {
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
    if (active) {
      btn.classList.add('active');
      LeucenaMap.showStreetViewCoverage(true);
      LeucenaApp.showToast(LeucenaI18n.t('toast.svClickHint'), 'info');
    } else {
      btn.classList.remove('active');
      LeucenaMap.showStreetViewCoverage(false);
      close();
    }
  }

  function isActive() {
    return active;
  }

  function showAt(latLng) {
    const container = document.getElementById('streetview-container');
    container.classList.remove('hidden');

    svService.getPanorama({ location: latLng, radius: 100 }, (data, status) => {
      if (status === google.maps.StreetViewStatus.OK) {
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
    LeucenaMap.showStreetViewCoverage(false);
  }

  return { init, isActive, showAt, close };
})();

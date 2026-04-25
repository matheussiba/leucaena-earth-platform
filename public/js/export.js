window.LeucenaExport = (function () {
  // GeoJSON export UX: authenticated fetch + blob download for server-built FeatureCollections.
  function init() {
    const exportBtn = document.getElementById('export-btn');
    const exportMenu = document.getElementById('export-menu');

    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      updateExportState();
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.closeSiblingToolbarDropdown) {
        LeucenaApp.closeSiblingToolbarDropdown('export');
      }
      exportMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      exportMenu.classList.remove('show');
    });

    // Server bundles all polygons with cell metadata into one GeoJSON FeatureCollection.
    document.getElementById('export-geojson').addEventListener('click', (e) => {
      e.preventDefault();
      if (!LeucenaApp.isTeamOrAbove()) return;
      exportMenu.classList.remove('show');
      if (LeucenaApp.logEvent) LeucenaApp.logEvent('export_start', null, null, { type: 'masks' });
      downloadFile('/api/export/geojson', 'leucena_polygons.geojson');
    });

    document.getElementById('export-grid').addEventListener('click', (e) => {
      e.preventDefault();
      exportMenu.classList.remove('show');
      if (LeucenaApp.logEvent) LeucenaApp.logEvent('export_start', null, null, { type: 'grid' });
      downloadFile('/api/export/grid-status', 'grid_status.geojson');
    });

    // Points export: occurrence features include layer/validity fields in GeoJSON properties.
    document.getElementById('export-points').addEventListener('click', (e) => {
      e.preventDefault();
      if (!LeucenaApp.isTeamOrAbove()) return;
      exportMenu.classList.remove('show');
      if (LeucenaApp.logEvent) LeucenaApp.logEvent('export_start', null, null, { type: 'points' });
      downloadFile('/api/export/points', 'leucena_points.geojson');
    });
  }

  function updateExportState() {
    const loggedIn = LeucenaApp.isLoggedIn();
    const warn = document.getElementById('export-login-warn');
    const links = document.querySelectorAll('#export-menu a');
    const maskLink = document.getElementById('export-geojson');
    const pointsLink = document.getElementById('export-points');
    const disclaimer = document.getElementById('export-contributor-disclaimer');

    if (loggedIn) {
      warn.classList.add('hidden');
      links.forEach(a => a.classList.remove('disabled'));

      if (!LeucenaApp.isTeamOrAbove()) {
        [maskLink, pointsLink].forEach(el => {
          if (el) { el.classList.add('disabled'); el.style.opacity = '0.4'; el.style.pointerEvents = 'none'; }
        });
        if (disclaimer) disclaimer.classList.remove('hidden');
      } else {
        [maskLink, pointsLink].forEach(el => {
          if (el) { el.classList.remove('disabled'); el.style.opacity = ''; el.style.pointerEvents = ''; }
        });
        if (disclaimer) disclaimer.classList.add('hidden');
      }
    } else {
      warn.classList.remove('hidden');
      links.forEach(a => a.classList.add('disabled'));
      if (disclaimer) disclaimer.classList.add('hidden');
    }
  }

  async function downloadFile(url, filename) {
    try {
      LeucenaApp.showToast(LeucenaI18n.t('toast.exportPreparing'), 'info');
      const res = await fetch(url, { headers: LeucenaApp.authHeaders() });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Export failed'); }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      if (LeucenaApp.logEvent) LeucenaApp.logEvent('export_complete', null, null, { filename });
      LeucenaApp.showToast(LeucenaI18n.t('toast.exportDone'), 'success');
    } catch (e) {
      if (LeucenaApp.logEvent) LeucenaApp.logEvent('export_error', null, null, { filename, error: e.message || String(e) });
      LeucenaApp.showToast(LeucenaI18n.t('toast.exportFail'), 'error');
    }
  }

  return { init };
})();

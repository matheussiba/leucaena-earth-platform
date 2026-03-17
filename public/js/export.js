window.LeucenaExport = (function () {
  function init() {
    const exportBtn = document.getElementById('export-btn');
    const exportMenu = document.getElementById('export-menu');

    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      updateExportState();
      exportMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      exportMenu.classList.remove('show');
    });

    document.getElementById('export-geojson').addEventListener('click', (e) => {
      e.preventDefault();
      exportMenu.classList.remove('show');
      downloadFile('/api/export/geojson', 'leucena_polygons.geojson');
    });

    document.getElementById('export-grid').addEventListener('click', (e) => {
      e.preventDefault();
      exportMenu.classList.remove('show');
      downloadFile('/api/export/grid-status', 'grid_status.geojson');
    });

    document.getElementById('export-points').addEventListener('click', (e) => {
      e.preventDefault();
      exportMenu.classList.remove('show');
      downloadFile('/api/export/points', 'leucena_points.geojson');
    });
  }

  function updateExportState() {
    const loggedIn = LeucenaApp.isLoggedIn();
    const warn = document.getElementById('export-login-warn');
    const links = document.querySelectorAll('#export-menu a');

    if (loggedIn) {
      warn.classList.add('hidden');
      links.forEach(a => a.classList.remove('disabled'));
    } else {
      warn.classList.remove('hidden');
      links.forEach(a => a.classList.add('disabled'));
    }
  }

  async function downloadFile(url, filename) {
    try {
      LeucenaApp.showToast(LeucenaI18n.t('toast.exportPreparing'), 'info');
      const res = await fetch(url);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      LeucenaApp.showToast(LeucenaI18n.t('toast.exportDone'), 'success');
    } catch (e) {
      LeucenaApp.showToast(LeucenaI18n.t('toast.exportFail'), 'error');
    }
  }

  return { init };
})();

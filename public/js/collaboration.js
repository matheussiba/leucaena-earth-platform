window.LeucenaCollab = (function () {
  // Socket.IO client: propagates cell locks, polygon CRUD, and point CRUD to all connected clients.
  let socket = null;
  let username = null;
  let _anonSocket = null;
  let _knownBuildId = null;

  function _handleBuildId(id) {
    if (_knownBuildId && _knownBuildId !== id) {
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) LeucenaApp.logEvent('new_version_detected', null, null, { oldBuild: _knownBuildId, newBuild: id });
      _forceUpdateReload();
    }
    _knownBuildId = id;
  }

  function _forceUpdateReload() {
    if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) LeucenaApp.logEvent('version_reload', null, null, { oldBuild: _knownBuildId });
    _saveMapStateForReload();
    _autoUnlockBeforeReload();

    var modal = document.getElementById('app-update-modal');
    if (modal) modal.classList.remove('hidden');

    var remaining = 3;
    var cdEl = document.getElementById('update-countdown-text');
    function _updateCdText() {
      if (cdEl) cdEl.textContent = (typeof LeucenaI18n !== 'undefined' ? LeucenaI18n.t('update.reloading', remaining) : 'Recarregando em ' + remaining + 's...');
    }
    _updateCdText();
    var cdInterval = setInterval(function () {
      remaining--;
      _updateCdText();
      if (remaining <= 0) {
        clearInterval(cdInterval);
        window.location.reload();
      }
    }, 1000);
  }

  // Snapshot of where the user is on the map. Persisted continuously (debounced) and on
  // forced reloads so the next page load restores the same camera + UF transparently.
  function _mapStateStorageKey() {
    try {
      var u = localStorage.getItem('leucena_username');
      return u ? 'leucena_reload_state_' + u : 'leucena_reload_state';
    } catch (e) { return 'leucena_reload_state'; }
  }

  function _saveMapStateForReload() {
    try {
      var state = {};
      if (typeof LeucenaMap !== 'undefined') {
        var gmap = LeucenaMap.getMap();
        if (gmap) {
          var c = gmap.getCenter();
          state.zoom = gmap.getZoom();
          state.lat = c.lat();
          state.lng = c.lng();
        }
        state.uf = LeucenaMap.getCurrentState() || null;
      }
      state.savedAt = Date.now();
      localStorage.setItem(_mapStateStorageKey(), JSON.stringify(state));
    } catch (e) { /* best effort */ }
  }

  // Wire up a debounced 'idle' listener on the map so any pan/zoom/UF change is silently
  // captured. Safe to call multiple times: the guard avoids attaching twice.
  var _idleSaveAttached = false;
  var _idleSaveTimer = null;
  function _installContinuousStateSaver() {
    if (_idleSaveAttached) return;
    if (typeof LeucenaMap === 'undefined' || !LeucenaMap.getMap) return;
    var gmap = LeucenaMap.getMap();
    if (!gmap || typeof google === 'undefined' || !google.maps) return;
    _idleSaveAttached = true;
    gmap.addListener('idle', function () {
      if (_idleSaveTimer) clearTimeout(_idleSaveTimer);
      _idleSaveTimer = setTimeout(_saveMapStateForReload, 600);
    });
    // Last-ditch save on tab close / refresh (covers the normal F5 path too).
    window.addEventListener('beforeunload', _saveMapStateForReload);
  }

  function _autoUnlockBeforeReload() {
    try {
      if (typeof LeucenaApp === 'undefined') return;
      var cellId = LeucenaApp.getSelectedCellId && LeucenaApp.getSelectedCellId();
      var cellData = LeucenaApp.getSelectedCellData && LeucenaApp.getSelectedCellData();
      var user = LeucenaApp.getUsername && LeucenaApp.getUsername();
      if (cellId && cellData && cellData.locked_by === user) {
        fetch('/api/grid/' + cellId + '/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('leucena_token') || '') },
          body: JSON.stringify({ status: cellData.grid_status || 'not_yet_finished' })
        }).catch(function () {});
      }
    } catch (e) { /* best effort */ }
  }

  function initAnonymous() {
    if (_anonSocket || socket) return;
    _anonSocket = io();
    _anonSocket.on('app:buildId', _handleBuildId);
    _anonSocket.on('users:updated', (users) => {
      renderUsersList(users);
      document.getElementById('user-count').textContent = users.length;
    });
  }

  function init(user) {
    if (socket && username === user) return;
    username = user;
    if (_anonSocket) { _anonSocket.disconnect(); _anonSocket = null; }
    if (socket) { socket.disconnect(); }
    var authToken = localStorage.getItem('leucena_token');
    socket = io({ auth: { token: authToken || undefined } });

    socket.on('connect', () => {
      socket.emit('user:join', { username });
      if (typeof LeucenaMap !== 'undefined' && LeucenaMap.getCurrentState) {
        var currentUf = LeucenaMap.getCurrentState();
        if (currentUf) socket.emit('user:locationState', { state: currentUf });
      }
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) LeucenaApp.logEvent('socket_connect');
    });

    socket.on('disconnect', (reason) => {
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) LeucenaApp.logEvent('socket_disconnect', null, null, { reason: reason });
    });

    socket.on('connect_error', (err) => {
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) LeucenaApp.logEvent('socket_error', null, null, { error: err.message || String(err) });
    });

    socket.on('app:buildId', _handleBuildId);

    socket.on('users:updated', (users) => {
      renderUsersList(users);
      document.getElementById('user-count').textContent = users.length;
    });

    // cell:locked / cell:unlocked: remote peers update grid styling and lock UI via LeucenaMap helpers.
    socket.on('cell:locked', (data) => {
      if (data.username !== username) {
        const gd = typeof LeucenaMap !== 'undefined' ? LeucenaMap.getGridData(data.cellId) : null;
        const displayId = data.cellName || (gd && gd.grid_id) || data.cellId;
        LeucenaApp.showToast(LeucenaI18n.t('toast.userStartedEditing', data.username, displayId), 'info');
      }
      if (typeof LeucenaMap !== 'undefined') {
        LeucenaMap.onCellLocked(data.cellId, data.username);
      }
    });

    socket.on('cell:unlocked', (data) => {
      const who = data.username || data.previousUser;
      if (who !== username) {
        const gd = typeof LeucenaMap !== 'undefined' ? LeucenaMap.getGridData(data.cellId) : null;
        const displayId = data.cellName || (gd && gd.grid_id) || data.cellId;
        LeucenaApp.showToast(LeucenaI18n.t('toast.userFinishedEditing', who, displayId), 'info');
      }
      if (typeof LeucenaMap !== 'undefined') {
        LeucenaMap.onCellUnlocked(data.cellId);
      }
    });

    socket.on('cell:statusChanged', (data) => {
      if (typeof LeucenaMap !== 'undefined') {
        LeucenaMap.onCellStatusChanged(data.cellId, data.status, {
          finished_by: data.finished_by,
          worked_by: data.worked_by,
          mask_count: data.mask_count,
          mask_area_ha: data.mask_area_ha,
          mapped_by: data.mapped_by
        });
      }
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.onCellStatusChanged) {
        LeucenaApp.onCellStatusChanged(data);
      }
    });

    // Point streams: keep markers, clusterer, and validity appearance aligned without reload.
    socket.on('point:validityChanged', (data) => {
      if (typeof LeucenaMap !== 'undefined') {
        LeucenaMap.updatePointAppearance(data.id, data.status != null ? data.status : data.not_valid);
      }
    });

    socket.on('point:created', (data) => {
      if (typeof LeucenaMap !== 'undefined') {
        LeucenaMap.addPointMarker(data);
      }
    });

    socket.on('point:deleted', (data) => {
      if (typeof LeucenaMap !== 'undefined') {
        LeucenaMap.removePointMarker(data.id);
      }
    });

    // Polygon streams: remote add/edit/delete applied through LeucenaDrawing (no page refresh).
    socket.on('polygon:created', (data) => {
      if (data.cell_mask_count !== undefined && typeof LeucenaMap !== 'undefined') {
        LeucenaMap.patchCellMeta(data.grid_cell_id, {
          mask_count: data.cell_mask_count,
          mask_area_ha: data.cell_mask_area_ha,
          mapped_by: data.cell_mapped_by
        });
      }
      if (data.created_by !== username && typeof LeucenaDrawing !== 'undefined') {
        const { cell_mask_count, cell_mask_area_ha, cell_mapped_by, ...poly } = data;
        LeucenaDrawing.addRemotePolygon(poly);
      }
    });

    socket.on('polygon:updated', (data) => {
      if (typeof LeucenaDrawing !== 'undefined') {
        LeucenaDrawing.updateRemotePolygon(data);
      }
    });

    socket.on('polygon:deleted', (data) => {
      if (data.cell_mask_count !== undefined && typeof LeucenaMap !== 'undefined') {
        LeucenaMap.patchCellMeta(data.grid_cell_id, {
          mask_count: data.cell_mask_count,
          mask_area_ha: data.cell_mask_area_ha,
          mapped_by: data.cell_mapped_by
        });
      }
      if (typeof LeucenaDrawing !== 'undefined') {
        LeucenaDrawing.removeRemotePolygon(data.id);
      }
    });

    socket.on('inbox:new', (data) => {
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.onInboxNew) {
        LeucenaApp.onInboxNew(data);
      }
    });
  }

  function notifyEditingCell(cellId) {
    if (socket) {
      socket.emit('user:editingCell', { cellId });
    }
  }

  function notifyActivity(activity) {
    if (socket) {
      socket.emit('user:activity', { activity });
    }
  }

  function notifyLocationState(uf) {
    if (socket) {
      socket.emit('user:locationState', { state: uf });
    }
  }

  function renderUsersList(users) {
    const container = document.getElementById('users-list');
    container.innerHTML = '';
    if (!users || users.length === 0) {
      container.innerHTML = '<div class="users-empty">' + LeucenaI18n.t('collab.noUsersOnline') + '</div>';
      return;
    }
    const isTeamPlus = typeof LeucenaApp !== 'undefined' && LeucenaApp.isTeamOrAbove && LeucenaApp.isTeamOrAbove();
    const isAdmin = typeof LeucenaApp !== 'undefined' && LeucenaApp.isAdminUser && LeucenaApp.isAdminUser();
    const currentUser = typeof LeucenaApp !== 'undefined' && LeucenaApp.getUsername ? LeucenaApp.getUsername() : null;
    for (const user of users) {
      const el = document.createElement('div');
      el.className = 'user-item';
      if (isTeamPlus && user.editingCell) el.classList.add('user-item-zoomable');
      let editDisplay = user.editingCellName || user.editingCell;
      if (user.editingCell && !user.editingCellName && typeof LeucenaMap !== 'undefined') {
        const gd = LeucenaMap.getGridData(user.editingCell);
        if (gd && gd.grid_id) editDisplay = gd.grid_id;
      }
      let cellInfo;
      if (user.editingCell) {
        const region = user.editingCellState || '';
        cellInfo = region
          ? LeucenaI18n.t('collab.cellRegion', region, editDisplay)
          : LeucenaI18n.t('collab.cell', editDisplay);
      } else {
        cellInfo = LeucenaI18n.t('collab.idle');
      }
      var activityTag = '';
      if (isTeamPlus && user.activity) {
        var actLabel = LeucenaI18n.t('collab.activity.' + user.activity);
        if (actLabel) activityTag = '<span class="user-activity-tag">' + actLabel + '</span>';
      }
      var locationTag = '';
      if (isTeamPlus && user.locationState) {
        var safeLocState = String(user.locationState).replace(/[<>"'&]/g, '');
        locationTag = '<span class="user-location-tag">' + safeLocState + '</span>';
      }
      var msgBtn = '';
      if (isAdmin && user.username !== currentUser) {
        msgBtn = '<button class="btn-user-msg" title="' + LeucenaI18n.t('collab.sendMessage') + '">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>' +
          '</button>';
      }
      const zoomHint = isTeamPlus && user.editingCell ? LeucenaI18n.t('collab.dblclickToZoom') : '';
      if (zoomHint) el.title = zoomHint;
      el.innerHTML = `
        <span class="online-dot"></span>
        <span>${user.username}</span>
        <span class="user-cell-info">${cellInfo}</span>
        ${locationTag}${activityTag}${msgBtn}
      `;
      if (isTeamPlus && user.editingCell) {
        const cellId = user.editingCell;
        const cellState = user.editingCellState;
        el.addEventListener('dblclick', () => _zoomToUserCell(cellId, cellState));
      }
      const msgBtnEl = el.querySelector('.btn-user-msg');
      if (msgBtnEl) {
        const targetUser = user.username;
        msgBtnEl.addEventListener('click', (e) => {
          e.stopPropagation();
          document.getElementById('users-online-modal').classList.add('hidden');
          if (LeucenaApp.openComposeModalForUser) LeucenaApp.openComposeModalForUser(targetUser);
        });
      }
      container.appendChild(el);
    }
  }

  async function _zoomToUserCell(cellId, cellState) {
    if (typeof LeucenaMap === 'undefined') return;
    const currentState = LeucenaMap.getCurrentState();
    if (cellState && cellState !== currentState) {
      if (typeof LeucenaApp !== 'undefined' && LeucenaApp.selectStateFromMap) {
        LeucenaApp.selectStateFromMap(cellState);
      }
      await new Promise(r => setTimeout(r, 1500));
    }
    if (LeucenaMap.zoomToCellViewOnly) LeucenaMap.zoomToCellViewOnly(cellId);
  }

  initAnonymous();

  function leave() {
    if (socket) { socket.disconnect(); socket = null; }
    username = null;
    initAnonymous();
  }

  return {
    init, initAnonymous, notifyEditingCell, notifyActivity, notifyLocationState, leave,
    installContinuousStateSaver: _installContinuousStateSaver,
    saveMapStateNow: _saveMapStateForReload,
  };
})();

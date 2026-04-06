window.LeucenaCollab = (function () {
  // Socket.IO client: propagates cell locks, polygon CRUD, and point CRUD to all connected clients.
  let socket = null;
  let username = null;
  let _anonSocket = null;

  function initAnonymous() {
    if (_anonSocket || socket) return;
    _anonSocket = io();
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
    socket = io();

    socket.on('connect', () => {
      socket.emit('user:join', { username });
      LeucenaApp.showToast(LeucenaI18n.t('toast.connected'), 'success');
    });

    socket.on('disconnect', () => {
    });

    socket.on('users:updated', (users) => {
      renderUsersList(users);
      document.getElementById('user-count').textContent = users.length;
    });

    // cell:locked / cell:unlocked: remote peers update grid styling and lock UI via LeucenaMap helpers.
    socket.on('cell:locked', (data) => {
      if (data.username !== username) {
        const gd = typeof LeucenaMap !== 'undefined' ? LeucenaMap.getGridData(data.cellId) : null;
        const displayId = (gd && gd.grid_id) || data.cellId;
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
        const displayId = (gd && gd.grid_id) || data.cellId;
        LeucenaApp.showToast(LeucenaI18n.t('toast.userFinishedEditing', who, displayId), 'info');
      }
      if (typeof LeucenaMap !== 'undefined') {
        LeucenaMap.onCellUnlocked(data.cellId);
      }
    });

    socket.on('cell:statusChanged', (data) => {
      if (typeof LeucenaMap !== 'undefined') {
        LeucenaMap.onCellStatusChanged(data.cellId, data.status, { finished_by: data.finished_by });
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
      if (data.created_by !== username && typeof LeucenaDrawing !== 'undefined') {
        LeucenaDrawing.addRemotePolygon(data);
      }
    });

    socket.on('polygon:updated', (data) => {
      if (typeof LeucenaDrawing !== 'undefined') {
        LeucenaDrawing.updateRemotePolygon(data);
      }
    });

    socket.on('polygon:deleted', (data) => {
      if (typeof LeucenaDrawing !== 'undefined') {
        LeucenaDrawing.removeRemotePolygon(data.id);
      }
    });
  }

  function notifyEditingCell(cellId) {
    if (socket) {
      socket.emit('user:editingCell', { cellId });
    }
  }

  function renderUsersList(users) {
    const container = document.getElementById('users-list');
    container.innerHTML = '';
    const isAdmin = typeof LeucenaApp !== 'undefined' && LeucenaApp.isAdminUser && LeucenaApp.isAdminUser();
    for (const user of users) {
      const el = document.createElement('div');
      el.className = 'user-item';
      if (isAdmin && user.editingCell) el.classList.add('user-item-zoomable');
      let editDisplay = user.editingCell;
      if (user.editingCell && typeof LeucenaMap !== 'undefined') {
        const gd = LeucenaMap.getGridData(user.editingCell);
        if (gd && gd.grid_id) editDisplay = gd.grid_id;
      }
      const cellInfo = user.editingCell ? LeucenaI18n.t('collab.cell', editDisplay) : LeucenaI18n.t('collab.idle');
      const zoomHint = isAdmin && user.editingCell ? LeucenaI18n.t('collab.dblclickToZoom') : '';
      if (zoomHint) el.title = zoomHint;
      el.innerHTML = `
        <span class="online-dot"></span>
        <span>${user.username}</span>
        <span class="user-cell-info">${cellInfo}</span>
      `;
      if (isAdmin && user.editingCell && typeof LeucenaMap !== 'undefined' && LeucenaMap.zoomToCellViewOnly) {
        const cellId = user.editingCell;
        el.addEventListener('dblclick', () => LeucenaMap.zoomToCellViewOnly(cellId));
      }
      container.appendChild(el);
    }
  }

  initAnonymous();

  function leave() {
    if (socket) { socket.disconnect(); socket = null; }
    username = null;
    initAnonymous();
  }

  return { init, initAnonymous, notifyEditingCell, leave };
})();

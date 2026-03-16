window.LeucenaCollab = (function () {
  let socket = null;
  let username = null;

  function init(user) {
    if (socket && username === user) return;
    username = user;
    if (socket) { socket.disconnect(); }
    socket = io();

    socket.on('connect', () => {
      socket.emit('user:join', { username });
      LeucenaApp.showToast('Connected to server', 'success');
    });

    socket.on('disconnect', () => {
      LeucenaApp.showToast('Disconnected from server. Reconnecting...', 'warning');
    });

    socket.on('users:updated', (users) => {
      renderUsersList(users);
      document.getElementById('user-count').textContent = users.length;
    });

    socket.on('cell:locked', (data) => {
      if (data.username !== username) {
        LeucenaApp.showToast(`${data.username} started editing Cell #${data.cellId}`, 'info');
      }
      if (typeof LeucenaMap !== 'undefined') {
        LeucenaMap.onCellLocked(data.cellId, data.username);
      }
    });

    socket.on('cell:unlocked', (data) => {
      const who = data.username || data.previousUser;
      if (who !== username) {
        LeucenaApp.showToast(`${who} finished editing Cell #${data.cellId}`, 'info');
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

    socket.on('point:validityChanged', (data) => {
      if (typeof LeucenaMap !== 'undefined') {
        LeucenaMap.updatePointAppearance(data.id, data.not_valid);
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
    for (const user of users) {
      const el = document.createElement('div');
      el.className = 'user-item';
      const cellInfo = user.editingCell ? `Cell #${user.editingCell}` : 'Idle';
      el.innerHTML = `
        <span class="online-dot"></span>
        <span>${user.username}</span>
        <span class="user-cell-info">${cellInfo}</span>
      `;
      container.appendChild(el);
    }
  }

  return { init, notifyEditingCell };
})();

window.LeucenaApp = (function () {
  let username = null;
  let authToken = null;
  let selectedCellId = null;
  let selectedCellData = null;
  let mapsLoaded = false;
  let mapsInitialized = false;

  function getUsername() { return username; }
  function getAuthToken() { return authToken; }
  function isLoggedIn() { return !!username && !!authToken; }
  const ADMIN_USERS = ['msb', 'mpf'];
  function isAdminUser() { return ADMIN_USERS.includes(username); }
  function getSelectedCellId() { return selectedCellId; }
  function getSelectedCellData() { return selectedCellData; }

  function authHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (authToken) h['Authorization'] = `Bearer ${authToken}`;
    return h;
  }

  function init() {
    document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);
    document.getElementById('login-btn').addEventListener('click', () => openAuthModal('login'));
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('auth-modal-close').addEventListener('click', closeAuthModal);
    document.getElementById('auth-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeAuthModal();
    });

    document.getElementById('tool-unlock').addEventListener('click', openUnlockModal);
    document.getElementById('unlock-finished').addEventListener('click', () => confirmUnlock('finished'));
    document.getElementById('unlock-not-finished').addEventListener('click', () => confirmUnlock('not_yet_finished'));
    document.getElementById('unlock-no-points').addEventListener('click', () => confirmUnlock('no_points'));
    document.getElementById('unlock-cancel').addEventListener('click', closeUnlockModal);
    document.getElementById('unlock-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeUnlockModal();
    });

    setupAuthForm();
    tryRestoreSession();
  }

  // ── Auth modal ──

  let authMode = 'login';

  function setupAuthForm() {
    document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);
    document.getElementById('auth-switch-link').addEventListener('click', (e) => {
      e.preventDefault();
      openAuthModal(authMode === 'login' ? 'register' : 'login');
    });
  }

  function openAuthModal(mode) {
    authMode = mode;
    const modal = document.getElementById('auth-modal');
    modal.classList.remove('hidden');

    document.getElementById('auth-error').classList.add('hidden');
    document.getElementById('auth-username').value = '';
    document.getElementById('auth-password').value = '';

    const passcodeGroup = document.getElementById('passcode-group');
    const passcodeInput = document.getElementById('auth-passcode');
    passcodeInput.value = '';

    if (mode === 'login') {
      document.getElementById('auth-modal-title').textContent = 'Login';
      document.getElementById('auth-modal-subtitle').textContent = 'Login to edit the map';
      document.getElementById('auth-submit-btn').textContent = 'Login';
      document.getElementById('auth-switch-text').textContent = "Don't have an account?";
      document.getElementById('auth-switch-link').textContent = 'Register';
      passcodeGroup.classList.add('hidden');
      passcodeInput.removeAttribute('required');
    } else {
      document.getElementById('auth-modal-title').textContent = 'Register';
      document.getElementById('auth-modal-subtitle').textContent = 'Create an account to start mapping';
      document.getElementById('auth-submit-btn').textContent = 'Create Account';
      document.getElementById('auth-switch-text').textContent = 'Already have an account?';
      document.getElementById('auth-switch-link').textContent = 'Login';
      passcodeGroup.classList.remove('hidden');
      passcodeInput.setAttribute('required', 'required');
    }
    document.getElementById('auth-username').focus();
  }

  function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    const user = document.getElementById('auth-username').value.trim();
    const pass = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    errorEl.classList.add('hidden');

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = { username: user, password: pass };
    if (authMode === 'register') {
      payload.passcode = document.getElementById('auth-passcode').value.trim();
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        errorEl.textContent = data.error;
        errorEl.classList.remove('hidden');
        return;
      }

      authToken = data.token;
      username = data.username;
      localStorage.setItem('leucena_token', authToken);
      localStorage.setItem('leucena_username', username);

      closeAuthModal();
      onLoginSuccess();
    } catch (err) {
      errorEl.textContent = 'Connection error. Try again.';
      errorEl.classList.remove('hidden');
    }
  }

  async function tryRestoreSession() {
    const storedToken = localStorage.getItem('leucena_token');
    if (!storedToken) return;

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${storedToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        authToken = storedToken;
        username = data.username;
        onLoginSuccess();
      } else {
        localStorage.removeItem('leucena_token');
        localStorage.removeItem('leucena_username');
      }
    } catch (e) {
      // Server not reachable or token expired
    }
  }

  function onLoginSuccess() {
    document.getElementById('login-btn').classList.add('hidden');
    document.getElementById('user-badge').classList.remove('hidden');
    document.getElementById('logout-btn').classList.remove('hidden');
    document.getElementById('user-display-name').textContent = username;
    document.getElementById('user-avatar').textContent = username.charAt(0).toUpperCase();

    LeucenaCollab.init(username);
    showAdminTools();
    showToast(`Welcome, ${username}!`, 'success');

    if (selectedCellId && selectedCellData) {
      selectCell(selectedCellId, selectedCellData);
    }
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: authHeaders()
      });
    } catch (e) { /* ignore */ }

    if (selectedCellId && selectedCellData && selectedCellData.locked_by === username) {
      try {
        await fetch(`/api/grid/${selectedCellId}/unlock`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ status: 'not_yet_finished' })
        });
        LeucenaMap.releasePanRestriction();
      } catch (e) { /* ignore */ }
    }

    authToken = null;
    username = null;
    localStorage.removeItem('leucena_token');
    localStorage.removeItem('leucena_username');

    document.getElementById('login-btn').classList.remove('hidden');
    document.getElementById('user-badge').classList.add('hidden');
    document.getElementById('logout-btn').classList.add('hidden');
    document.getElementById('edit-mode-badge').classList.add('hidden');

    hideAdminTools();
    deselectCell();
    enableTools(false);
    showToast('Logged out', 'info');
  }

  // ── Sidebar ──

  function toggleSidebar() {
    const main = document.getElementById('main-content');
    const isOpen = main.classList.toggle('sidebar-open');
    updateToggleArrow(isOpen);
    if (!isOpen) {
      clearCellSelection();
    }
  }

  function closeSidebar() {
    document.getElementById('main-content').classList.remove('sidebar-open');
    updateToggleArrow(false);
    clearCellSelection();
  }

  function updateToggleArrow(isOpen) {
    const arrow = document.querySelector('.toggle-arrow');
    if (arrow) arrow.textContent = isOpen ? '\u00AB' : '\u00BB';
  }

  // ── Map init ──

  function onMapsReady() {
    mapsLoaded = true;
    initMapModules();
  }

  function initMapModules() {
    if (mapsInitialized || !mapsLoaded) return;
    mapsInitialized = true;
    LeucenaMap.init();
    LeucenaDrawing.init();
    LeucenaStreetView.init();
    LeucenaExport.init();
  }

  // ── Cell selection ──

  function selectCell(cellId, cellData) {
    if (cellId === selectedCellId && !(selectedCellData && selectedCellData.locked_by === username)) {
      clearCellSelection();
      const main = document.getElementById('main-content');
      main.classList.remove('sidebar-open');
      updateToggleArrow(false);
      return;
    }

    selectedCellId = cellId;
    selectedCellData = cellData;

    if (typeof LeucenaMap !== 'undefined') {
      LeucenaMap.setSelectedCell(cellId);
    }

    const main = document.getElementById('main-content');
    if (!main.classList.contains('sidebar-open')) {
      main.classList.add('sidebar-open');
      updateToggleArrow(true);
    }

    const panel = document.getElementById('cell-actions');
    panel.classList.remove('hidden');
    document.getElementById('cell-id-display').textContent = cellId;

    document.getElementById('cell-status-display').textContent = formatStatus(cellData.grid_status);

    const workedBy = cellData.worked_by || '--';
    document.getElementById('cell-worked-by').textContent = workedBy === '--' ? '--' : workedBy.split(',').join(', ');

    document.getElementById('cell-finished-by').textContent = cellData.finished_by || '--';

    const lockBtn = document.getElementById('lock-cell-btn');
    const unlockToolBtn = document.getElementById('tool-unlock');

    const infoEl = document.getElementById('selected-cell-info');
    infoEl.classList.remove('hidden');
    infoEl.textContent = `Cell #${cellId} - ${formatStatus(cellData.grid_status)}`;

    if (!isLoggedIn()) {
      lockBtn.textContent = 'Login to Edit';
      lockBtn.disabled = false;
      lockBtn.classList.remove('hidden');
      lockBtn.onclick = () => openAuthModal('login');
      unlockToolBtn.disabled = true;
      enableTools(false);
      return;
    }

    if (cellData.locked_by === username) {
      lockBtn.classList.add('hidden');
      unlockToolBtn.disabled = false;
      enableTools(true);
    } else if (cellData.locked_by) {
      lockBtn.textContent = `Locked by ${cellData.locked_by}`;
      lockBtn.disabled = true;
      lockBtn.classList.remove('hidden');
      unlockToolBtn.disabled = true;
      enableTools(false);
    } else if (cellData.grid_status === 'no_points') {
      lockBtn.textContent = 'No points to edit';
      lockBtn.disabled = true;
      lockBtn.classList.remove('hidden');
      unlockToolBtn.disabled = true;
      enableTools(false);
    } else {
      lockBtn.textContent = 'Lock & Edit';
      lockBtn.disabled = false;
      lockBtn.classList.remove('hidden');
      lockBtn.onclick = () => lockCell(cellId);
      unlockToolBtn.disabled = true;
      enableTools(false);
    }
  }

  function deselectCell() {
    if (selectedCellId && selectedCellData && selectedCellData.locked_by && selectedCellData.locked_by === username) {
      openUnlockModal();
      return;
    }
    clearCellSelection();
  }

  function clearCellSelection() {
    if (typeof LeucenaMap !== 'undefined') {
      LeucenaMap.setSelectedCell(null);
    }
    selectedCellId = null;
    selectedCellData = null;
    document.getElementById('cell-actions').classList.add('hidden');
    document.getElementById('selected-cell-info').classList.add('hidden');
    document.getElementById('tool-unlock').disabled = true;
    enableTools(false);
    if (typeof LeucenaDrawing !== 'undefined') LeucenaDrawing.deactivate();
  }

  function enableTools(enabled) {
    document.getElementById('tool-draw').disabled = !enabled;
    document.getElementById('tool-edit').disabled = !enabled;
    document.getElementById('tool-delete').disabled = !enabled;
    const pointMode = insertionMode || deletionMode;
    document.getElementById('tool-streetview').disabled = !(enabled || pointMode);
    if (!enabled && !pointMode && typeof LeucenaStreetView !== 'undefined' && LeucenaStreetView.isActive()) {
      LeucenaStreetView.close();
    }
    if (typeof LeucenaMap !== 'undefined') {
      LeucenaMap.setFeaturesClickable(enabled);
    }
  }

  // ── Unlock modal ──

  function openUnlockModal() {
    if (!selectedCellId || !selectedCellData || selectedCellData.locked_by !== username) {
      showToast('No cell locked by you', 'warning');
      return;
    }
    document.getElementById('unlock-error').classList.add('hidden');
    document.getElementById('unlock-modal').classList.remove('hidden');
  }

  function closeUnlockModal() {
    document.getElementById('unlock-modal').classList.add('hidden');
  }

  async function confirmUnlock(status) {
    if (!selectedCellId) return;
    const cellId = selectedCellId;

    try {
      const res = await fetch(`/api/grid/${cellId}/unlock`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        const err = await res.json();
        const unlockErr = document.getElementById('unlock-error');
        unlockErr.textContent = err.error;
        unlockErr.classList.remove('hidden');
        return;
      }
      closeUnlockModal();

      if (selectedCellData) {
        selectedCellData.locked_by = null;
        selectedCellData.grid_status = status;
        if (status === 'finished') selectedCellData.finished_by = username;
      }

      LeucenaMap.updateCellAppearance(cellId, selectedCellData || {});
      LeucenaMap.releasePanRestriction();
      LeucenaCollab.notifyEditingCell(null);

      const lockBtn = document.getElementById('lock-cell-btn');
      lockBtn.textContent = 'Lock & Edit';
      lockBtn.disabled = false;
      lockBtn.classList.remove('hidden');
      lockBtn.onclick = () => lockCell(cellId);

      document.getElementById('tool-unlock').disabled = true;
      document.getElementById('edit-mode-badge').classList.add('hidden');
      enableTools(false);
      LeucenaDrawing.deactivate();

      if (selectedCellData) {
        document.getElementById('cell-status-display').textContent = formatStatus(status);
        if (status === 'finished') {
          document.getElementById('cell-finished-by').textContent = username;
        }
      }

      showToast(`Cell #${cellId} unlocked - ${formatStatus(status)}`, 'success');
    } catch (e) {
      showToast('Failed to unlock cell', 'error');
    }
  }

  async function lockCell(cellId) {
    try {
      const res = await fetch(`/api/grid/${cellId}/lock`, {
        method: 'POST',
        headers: authHeaders()
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error, 'error');
        return;
      }
      const result = await res.json();

      selectedCellData.locked_by = username;
      selectedCellData.grid_status = 'mapping';
      if (result.worked_by) selectedCellData.worked_by = result.worked_by;

      selectCell(cellId, selectedCellData);
      LeucenaMap.updateCellAppearance(cellId, selectedCellData);
      LeucenaMap.zoomToCell(cellId);
      LeucenaCollab.notifyEditingCell(cellId);

      document.getElementById('main-content').classList.remove('sidebar-open');
      updateToggleArrow(false);

      const badge = document.getElementById('edit-mode-badge');
      document.getElementById('edit-mode-text').textContent = `Editing Cell #${cellId}`;
      badge.classList.remove('hidden');

      showToast(`Cell #${cellId} locked for editing`, 'success');
    } catch (e) {
      showToast('Failed to lock cell', 'error');
    }
  }

  function formatStatus(s) {
    const labels = {
      not_yet_finished: 'Not yet finished',
      mapping: 'Mapping',
      no_points: 'No points',
      finished: 'Finished'
    };
    return labels[s] || s;
  }

  // ── Toast notifications ──
  let toastContainer = null;

  function showToast(message, type = 'info', duration = 4000) {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ── Point Insertion / Deletion Modes ──

  let insertionMode = false;
  let deletionMode = false;
  const insertionHistory = [];
  const deletionHistory = [];

  function setupPointModes() {
    const insertCb = document.getElementById('tool-insertion');
    const deleteCb = document.getElementById('tool-deletion');

    insertCb.addEventListener('change', () => {
      if (!isLoggedIn()) { insertCb.checked = false; return; }
      if (insertCb.checked) {
        insertCb.checked = false;
        openAddPointsModal();
      } else {
        setInsertionMode(false);
      }
    });

    document.getElementById('addpoints-yes').addEventListener('click', () => {
      closeAddPointsModal();
      setDeletionMode(false);
      setInsertionMode(true);
    });
    document.getElementById('addpoints-cancel').addEventListener('click', () => {
      closeAddPointsModal();
    });
    document.getElementById('addpoints-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeAddPointsModal();
    });

    deleteCb.addEventListener('change', () => {
      if (!isLoggedIn() || !isAdminUser()) { deleteCb.checked = false; return; }
      if (deleteCb.checked) {
        setInsertionMode(false);
        setDeletionMode(true);
      } else {
        setDeletionMode(false);
      }
    });

    document.addEventListener('keydown', handlePointModeKey);
  }

  function setInsertionMode(active) {
    insertionMode = active;
    document.getElementById('tool-insertion').checked = active;
    updatePointModeBanner();
    updatePointModeVisuals();
    if (!active) restoreEditingState();
  }

  function setDeletionMode(active) {
    deletionMode = active;
    document.getElementById('tool-deletion').checked = active;
    updatePointModeBanner();
    updatePointModeVisuals();
    if (!active) restoreEditingState();
  }

  function restoreEditingState() {
    if (insertionMode || deletionMode) return;
    if (selectedCellData && selectedCellData.locked_by === username) {
      enableTools(true);
    }
  }

  function isDeletionMode() { return deletionMode; }

  function updatePointModeBanner() {
    const banner = document.getElementById('insertion-banner');
    const bannerText = banner.querySelector('span:last-child');
    if (insertionMode) {
      bannerText.textContent = 'POINT INSERTION MODE — Press H to add point, Ctrl+Z to undo';
      banner.classList.remove('hidden');
    } else if (deletionMode) {
      bannerText.textContent = 'POINT DELETION MODE — Click near a point to delete, Ctrl+Z to undo';
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  }

  function updatePointModeVisuals() {
    const anyActive = insertionMode || deletionMode;
    if (typeof LeucenaMap !== 'undefined') {
      LeucenaMap.setGridsHollow(anyActive);
      LeucenaMap.setMapBorder(anyActive);
    }
    const cellLocked = selectedCellData && selectedCellData.locked_by === username;
    document.getElementById('tool-streetview').disabled = !(anyActive || cellLocked);
  }

  function isPointModeActive() {
    return insertionMode || deletionMode;
  }

  function openAddPointsModal() {
    document.getElementById('addpoints-modal').classList.remove('hidden');
  }

  function closeAddPointsModal() {
    document.getElementById('addpoints-modal').classList.add('hidden');
  }

  function showAdminTools() {
    document.getElementById('insertion-sep').classList.remove('hidden');
    document.getElementById('insertion-toggle').classList.remove('hidden');
    if (isAdminUser()) {
      document.getElementById('deletion-toggle').classList.remove('hidden');
    }
  }

  function hideAdminTools() {
    document.getElementById('insertion-sep').classList.add('hidden');
    document.getElementById('insertion-toggle').classList.add('hidden');
    document.getElementById('deletion-toggle').classList.add('hidden');
    if (insertionMode) setInsertionMode(false);
    if (deletionMode) setDeletionMode(false);
  }

  async function handleDeletionClick(latLng) {
    if (!deletionMode) return;
    const nearest = LeucenaMap.findNearestPoint(latLng, 20);
    if (!nearest) {
      showToast('No point nearby', 'info');
      return;
    }

    const pointData = LeucenaMap.getPointData(nearest.id);
    if (!pointData) return;

    try {
      const res = await fetch(`/api/points/${nearest.id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error, 'error');
        return;
      }
      LeucenaMap.removePointMarker(nearest.id);
      deletionHistory.push(pointData);
      showToast(`Point #${pointData.fid} deleted`, 'info');
    } catch (err) {
      showToast('Failed to delete point', 'error');
    }
  }

  async function handlePointModeKey(e) {
    if (insertionMode) {
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        const coords = LeucenaMap.getLastCoords();
        if (!coords) { showToast('Move your mouse over the map first', 'warning'); return; }
        const parts = coords.split(',').map(s => parseFloat(s.trim()));
        if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return;
        const [lat, lng] = parts;

        try {
          const res = await fetch('/api/points', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ lat, lng })
          });
          if (!res.ok) { const err = await res.json(); showToast(err.error, 'error'); return; }
          const pt = await res.json();
          insertionHistory.push(pt.id);
          showToast(`Point #${pt.fid} added`, 'success');
        } catch (err) { showToast('Failed to add point', 'error'); }
      }

      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (insertionHistory.length === 0) { showToast('Nothing to undo', 'info'); return; }
        const lastId = insertionHistory.pop();
        try {
          const res = await fetch(`/api/points/${lastId}`, { method: 'DELETE', headers: authHeaders() });
          if (!res.ok) { const err = await res.json(); showToast(err.error, 'error'); insertionHistory.push(lastId); return; }
          LeucenaMap.removePointMarker(lastId);
          showToast('Last point removed (undo)', 'info');
        } catch (err) { showToast('Failed to undo point', 'error'); insertionHistory.push(lastId); }
      }
    }

    if (deletionMode) {
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (deletionHistory.length === 0) { showToast('Nothing to undo', 'info'); return; }
        const lastPt = deletionHistory.pop();
        try {
          const res = await fetch('/api/points', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ lat: lastPt.lat, lng: lastPt.lng, not_valid: lastPt.not_valid })
          });
          if (!res.ok) { const err = await res.json(); showToast(err.error, 'error'); deletionHistory.push(lastPt); return; }
          const pt = await res.json();
          showToast(`Point #${pt.fid} restored`, 'success');
        } catch (err) { showToast('Failed to restore point', 'error'); deletionHistory.push(lastPt); }
      }
    }
  }

  setupPointModes();

  init();

  return {
    getUsername,
    getAuthToken,
    isLoggedIn,
    authHeaders,
    getSelectedCellId,
    getSelectedCellData,
    selectCell,
    deselectCell,
    onMapsReady,
    showToast,
    formatStatus,
    enableTools,
    openAuthModal,
    isDeletionMode,
    isPointModeActive,
    handleDeletionClick
  };
})();

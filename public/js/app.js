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
    document.getElementById('unlock-cancel').addEventListener('click', closeUnlockModal);
    document.getElementById('unlock-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeUnlockModal();
    });

    document.getElementById('docs-modal-close').addEventListener('click', closeDocsModal);
    document.getElementById('docs-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeDocsModal();
    });

    setupLangDropdown();

    document.getElementById('guide-btn').addEventListener('click', openGuideModal);
    document.getElementById('guide-modal-close').addEventListener('click', closeGuideModal);
    document.getElementById('guide-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeGuideModal();
    });
    document.getElementById('guide-go-docs').addEventListener('click', () => {
      closeGuideModal();
      openDocsModal();
    });
    document.getElementById('guide-go-leucena').addEventListener('click', () => showGuidePage('leucena'));
    document.getElementById('guide-go-howto').addEventListener('click', () => showGuidePage('howto'));
    document.getElementById('guide-go-media').addEventListener('click', () => showGuidePage('media'));
    document.getElementById('guide-back-leucena').addEventListener('click', () => showGuidePage('main'));
    document.getElementById('guide-back-howto').addEventListener('click', () => showGuidePage('main'));
    document.getElementById('guide-back-media').addEventListener('click', () => showGuidePage('main'));

    document.getElementById('tool-home').addEventListener('click', handleHomeClick);

    document.getElementById('legend-toggle').addEventListener('click', toggleLegend);

    setupAuthForm();
    tryRestoreSession();

    LeucenaI18n.translatePage();
  }

  // ── Language dropdown ──

  function setupLangDropdown() {
    const btn = document.getElementById('lang-btn');
    const menu = document.getElementById('lang-menu');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      updateLangMenuActive();
      menu.classList.toggle('show');
    });

    document.addEventListener('click', () => menu.classList.remove('show'));

    document.querySelectorAll('.lang-option').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const lang = a.getAttribute('data-lang');
        LeucenaI18n.setLang(lang);
        menu.classList.remove('show');
        refreshDynamicTexts();
      });
    });
  }

  function updateLangMenuActive() {
    const lang = LeucenaI18n.getLang();
    document.querySelectorAll('.lang-option').forEach(a => {
      a.classList.toggle('active-lang', a.getAttribute('data-lang') === lang);
    });
  }

  function refreshDynamicTexts() {
    const t = LeucenaI18n.t;
    if (selectedCellId && selectedCellData) {
      document.getElementById('cell-status-display').textContent = formatStatus(selectedCellData.grid_status);
      const infoEl = document.getElementById('selected-cell-info');
      if (!infoEl.classList.contains('hidden')) {
        infoEl.textContent = t('edit.cellInfo', selectedCellId, formatStatus(selectedCellData.grid_status));
      }
      const lockBtn = document.getElementById('lock-cell-btn');
      if (!isLoggedIn()) {
        lockBtn.textContent = t('auth.loginToEdit');
      } else if (selectedCellData.locked_by && selectedCellData.locked_by !== username) {
        lockBtn.textContent = t('toast.lockedBy', selectedCellData.locked_by);
      } else if (selectedCellData.grid_status === 'no_points' && !selectedCellData.locked_by) {
        lockBtn.textContent = t('toast.noPointsToEdit');
      } else if (!selectedCellData.locked_by) {
        lockBtn.textContent = t('sidebar.lockEdit');
      }
    }
    if (insertionMode || deletionMode) updatePointModeBanner();

    const badge = document.getElementById('edit-mode-badge');
    if (!badge.classList.contains('hidden') && selectedCellId) {
      document.getElementById('edit-mode-text').textContent = t('edit.badge', selectedCellId);
    }

    const mapTypeBtn = document.getElementById('maptype-label');
    if (mapTypeBtn && typeof LeucenaMap !== 'undefined') {
      const map = LeucenaMap.getMap();
      if (map) {
        mapTypeBtn.textContent = map.getMapTypeId() === 'satellite' || map.getMapTypeId() === 'hybrid'
          ? LeucenaI18n.t('tool.map') : LeucenaI18n.t('tool.satellite');
      }
    }
  }

  // ── Docs modal ──

  function openDocsModal() {
    LeucenaI18n.translatePage();
    document.getElementById('docs-modal').classList.remove('hidden');
  }

  function closeDocsModal() {
    document.getElementById('docs-modal').classList.add('hidden');
  }

  // ── Guide modal ──

  function openGuideModal() {
    LeucenaI18n.translatePage();
    showGuidePage('main');
    document.getElementById('guide-modal').classList.remove('hidden');
  }

  function closeGuideModal() {
    document.getElementById('guide-modal').classList.add('hidden');
  }

  function showGuidePage(page) {
    document.getElementById('guide-main').classList.add('hidden');
    document.getElementById('guide-leucena').classList.add('hidden');
    document.getElementById('guide-howto').classList.add('hidden');
    const mediaEl = document.getElementById('guide-media');
    if (mediaEl) mediaEl.classList.add('hidden');
    document.getElementById('guide-' + page).classList.remove('hidden');
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

    const t = LeucenaI18n.t;
    if (mode === 'login') {
      document.getElementById('auth-modal-title').textContent = t('auth.login');
      document.getElementById('auth-modal-subtitle').textContent = t('auth.loginSubtitle');
      document.getElementById('auth-submit-btn').textContent = t('auth.login');
      document.getElementById('auth-switch-text').textContent = t('auth.noAccount');
      document.getElementById('auth-switch-link').textContent = t('auth.register');
      passcodeGroup.classList.add('hidden');
      passcodeInput.removeAttribute('required');
    } else {
      document.getElementById('auth-modal-title').textContent = t('auth.register');
      document.getElementById('auth-modal-subtitle').textContent = t('auth.registerSubtitle');
      document.getElementById('auth-submit-btn').textContent = t('auth.createAccount');
      document.getElementById('auth-switch-text').textContent = t('auth.hasAccount');
      document.getElementById('auth-switch-link').textContent = t('auth.login');
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
      errorEl.textContent = LeucenaI18n.t('auth.connectionError');
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
    showToast(LeucenaI18n.t('auth.welcome', username), 'success');

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
    showToast(LeucenaI18n.t('auth.disconnected'), 'info');
  }

  // ── Sidebar ──

  function isEditing() {
    return selectedCellData && selectedCellData.locked_by && selectedCellData.locked_by === username;
  }

  function toggleSidebar() {
    if (isEditing()) {
      showToast(LeucenaI18n.t('toast.exitEditFirst'), 'warning');
      return;
    }
    const main = document.getElementById('main-content');
    const isOpen = main.classList.toggle('sidebar-open');
    updateToggleArrow(isOpen);
    updateLegendVisibility(isOpen);
    if (!isOpen) {
      clearCellSelection();
    }
  }

  function closeSidebar() {
    document.getElementById('main-content').classList.remove('sidebar-open');
    updateToggleArrow(false);
    updateLegendVisibility(false);
    clearCellSelection();
  }

  function updateToggleArrow(isOpen) {
    const arrow = document.querySelector('.toggle-arrow');
    if (arrow) arrow.textContent = isOpen ? '\u00AB' : '\u00BB';
  }

  // ── Legend accordion ──

  let legendUserControlled = false;

  function toggleLegend() {
    legendUserControlled = true;
    document.getElementById('map-legend').classList.toggle('collapsed');
  }

  function collapseLegendOnFirstZoom() {
    if (legendUserControlled) return;
    legendUserControlled = true;
    document.getElementById('map-legend').classList.add('collapsed');
  }

  function updateLegendVisibility(sidebarOpen) {
    const legend = document.getElementById('map-legend');
    if (sidebarOpen) {
      legend.classList.add('legend-hidden');
    } else {
      legend.classList.remove('legend-hidden');
    }
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
      updateLegendVisibility(false);
      return;
    }

    selectedCellId = cellId;
    selectedCellData = cellData;

    if (typeof LeucenaMap !== 'undefined') {
      LeucenaMap.setSelectedCell(cellId);
    }

    const main = document.getElementById('main-content');
    if (!main.classList.contains('sidebar-open') && !isEditing()) {
      main.classList.add('sidebar-open');
      updateToggleArrow(true);
      updateLegendVisibility(true);
    }

    const panel = document.getElementById('cell-actions');
    panel.classList.remove('hidden');
    const displayId = cellData.grid_id || cellId;
    document.getElementById('cell-id-display').textContent = displayId;

    const t = LeucenaI18n.t;
    document.getElementById('cell-status-display').textContent = formatStatus(cellData.grid_status);

    const numpoints = cellData.numpoints != null ? cellData.numpoints : '--';
    const numpointsEl = document.getElementById('cell-numpoints');
    if (numpointsEl) numpointsEl.textContent = numpoints;

    const workedBy = cellData.worked_by || '--';
    document.getElementById('cell-worked-by').textContent = workedBy === '--' ? '--' : workedBy.split(',').join(', ');

    document.getElementById('cell-finished-by').textContent = cellData.finished_by || '--';

    const lockBtn = document.getElementById('lock-cell-btn');
    const unlockToolBtn = document.getElementById('tool-unlock');

    const infoEl = document.getElementById('selected-cell-info');
    infoEl.classList.remove('hidden');
    infoEl.textContent = t('edit.cellInfo', displayId, formatStatus(cellData.grid_status));

    if (!isLoggedIn()) {
      lockBtn.textContent = t('auth.loginToEdit');
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
      lockBtn.textContent = t('toast.lockedBy', cellData.locked_by);
      lockBtn.disabled = true;
      lockBtn.classList.remove('hidden');
      unlockToolBtn.disabled = true;
      enableTools(false);
    } else if (cellData.grid_status === 'no_points') {
      lockBtn.textContent = t('toast.noPointsToEdit');
      lockBtn.disabled = true;
      lockBtn.classList.remove('hidden');
      unlockToolBtn.disabled = true;
      enableTools(false);
    } else {
      lockBtn.textContent = t('sidebar.lockEdit');
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
    const editPanel = document.getElementById('edit-tools-panel');
    if (enabled) {
      editPanel.classList.remove('hidden');
    } else {
      editPanel.classList.add('hidden');
    }
    const selectBtn = document.getElementById('tool-select');
    selectBtn.disabled = false;
    selectBtn.classList.add('active');
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
      showToast(LeucenaI18n.t('toast.noCellLocked'), 'warning');
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
      lockBtn.textContent = LeucenaI18n.t('sidebar.lockEdit');
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

      showToast(LeucenaI18n.t('toast.cellUnlocked', cellId, formatStatus(status)), 'success');
    } catch (e) {
      showToast(LeucenaI18n.t('toast.unlockFail'), 'error');
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
      updateLegendVisibility(false);

      const badge = document.getElementById('edit-mode-badge');
      const displayId = selectedCellData.grid_id || cellId;
      document.getElementById('edit-mode-text').textContent = LeucenaI18n.t('edit.badge', displayId);
      badge.classList.remove('hidden');

      showToast(LeucenaI18n.t('toast.cellLocked', displayId), 'success');
    } catch (e) {
      showToast(LeucenaI18n.t('toast.lockFail'), 'error');
    }
  }

  function handleHomeClick() {
    if (selectedCellData && selectedCellData.locked_by === username && selectedCellId) {
      LeucenaMap.zoomToCell(selectedCellId);
    } else {
      LeucenaMap.zoomToInitialView();
    }
  }

  function formatStatus(s) {
    const key = 'status.' + s;
    const result = LeucenaI18n.t(key);
    return result !== key ? result : s;
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
      bannerText.textContent = LeucenaI18n.t('banner.insertion');
      banner.classList.remove('hidden');
    } else if (deletionMode) {
      bannerText.textContent = LeucenaI18n.t('banner.deletion');
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
      showToast(LeucenaI18n.t('toast.noNearbyPoint'), 'info');
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
      showToast(LeucenaI18n.t('toast.pointDeleted', pointData.fid), 'info');
    } catch (err) {
      showToast(LeucenaI18n.t('toast.deleteFail'), 'error');
    }
  }

  async function handlePointModeKey(e) {
    if (insertionMode) {
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        const coords = LeucenaMap.getLastCoords();
        if (!coords) { showToast(LeucenaI18n.t('toast.moveMouseFirst'), 'warning'); return; }
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
          showToast(LeucenaI18n.t('toast.pointAdded', pt.fid), 'success');
        } catch (err) { showToast(LeucenaI18n.t('toast.addFail'), 'error'); }
      }

      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (insertionHistory.length === 0) { showToast(LeucenaI18n.t('toast.nothingToUndo'), 'info'); return; }
        const lastId = insertionHistory.pop();
        try {
          const res = await fetch(`/api/points/${lastId}`, { method: 'DELETE', headers: authHeaders() });
          if (!res.ok) { const err = await res.json(); showToast(err.error, 'error'); insertionHistory.push(lastId); return; }
          LeucenaMap.removePointMarker(lastId);
          showToast(LeucenaI18n.t('toast.lastPointRemoved'), 'info');
        } catch (err) { showToast(LeucenaI18n.t('toast.undoFail'), 'error'); insertionHistory.push(lastId); }
      }
    }

    if (deletionMode) {
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (deletionHistory.length === 0) { showToast(LeucenaI18n.t('toast.nothingToUndo'), 'info'); return; }
        const lastPt = deletionHistory.pop();
        try {
          const res = await fetch('/api/points', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ lat: lastPt.lat, lng: lastPt.lng, status: lastPt.status || 0, layer: lastPt.layer || 'crowdmapping' })
          });
          if (!res.ok) { const err = await res.json(); showToast(err.error, 'error'); deletionHistory.push(lastPt); return; }
          const pt = await res.json();
          showToast(LeucenaI18n.t('toast.pointRestored', pt.fid), 'success');
        } catch (err) { showToast(LeucenaI18n.t('toast.restoreFail'), 'error'); deletionHistory.push(lastPt); }
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
    handleDeletionClick,
    collapseLegendOnFirstZoom,
    isEditing
  };
})();

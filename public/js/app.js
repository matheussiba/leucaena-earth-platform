// IIFE app shell: init() wires auth, sidebar, admin panel, document hotkeys, and modals (runs at script load).
window.LeucenaApp = (function () {
  let username = null;
  let authToken = null;
  let userRole = 'contributor';
  let testerMode = 'contributor';
  let selectedCellId = null;
  let selectedCellData = null;
  let lockHeartbeatInterval = null;
  let pendingUncoveredPointIds = null;
  let mapsLoaded = false;
  let mapsInitialized = false;
  let _adminViewMode = false;

  function getUsername() { return username; }
  function getAuthToken() { return authToken; }
  function getUserRole() { return userRole; }
  function getEffectiveRole() {
    if (userRole === 'tester') return testerMode;
    return userRole;
  }
  function isLoggedIn() { return !!username && !!authToken; }
  function isSuperAdmin() { return userRole === 'superadmin'; }
  function isAdminUser() { return userRole === 'admin' || userRole === 'superadmin'; }
  function isTeamOrAbove() {
    const eff = getEffectiveRole();
    return eff === 'superadmin' || eff === 'admin' || eff === 'team';
  }
  function getSelectedCellId() { return selectedCellId; }
  function getSelectedCellData() { return selectedCellData; }

  function authHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (authToken) h['Authorization'] = `Bearer ${authToken}`;
    return h;
  }

  const _logQueue = [];
  let _logTimer = null;
  function logEvent(action, cellId, objectId, details) {
    if (!authToken) return;
    _logQueue.push({ action, cell_id: cellId || null, object_id: objectId || null, details: details || null });
    if (!_logTimer) {
      _logTimer = setTimeout(_flushLogs, 3000);
    }
  }
  function _flushLogs() {
    _logTimer = null;
    if (_logQueue.length === 0 || !authToken) return;
    const batch = _logQueue.splice(0, 50);
    fetch('/api/log', { method: 'POST', headers: authHeaders(), body: JSON.stringify(batch) }).catch(() => {});
  }

  function init() {
    document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
    document.getElementById('login-btn').addEventListener('click', () => openAuthModal('login'));
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('auth-modal-close').addEventListener('click', closeAuthModal);
    document.getElementById('auth-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeAuthModal();
    });

    document.getElementById('top-bar').addEventListener('click', () => {
      if (typeof LeucenaMap !== 'undefined') LeucenaMap.deselectPoint();
    });
    document.getElementById('toolbar').addEventListener('click', () => {
      if (typeof LeucenaMap !== 'undefined') LeucenaMap.deselectPoint();
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
    document.getElementById('docs-back-guide').addEventListener('click', () => {
      closeDocsModal();
      openGuideModal('main');
    });

    setupLangDropdown();

    document.getElementById('guide-btn').addEventListener('click', openGuideModal);
    document.getElementById('guide-start-tour').addEventListener('click', () => {
      closeGuideModal();
      Onboarding.startTour('manual');
    });
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
    document.getElementById('guide-go-collaborate').addEventListener('click', () => showGuidePage('collaborate'));
    document.getElementById('guide-go-about').addEventListener('click', () => {
      loadQuemSomosContent();
      showGuidePage('about');
    });
    document.getElementById('guide-back-leucena').addEventListener('click', () => showGuidePage('main'));
    document.getElementById('guide-back-howto').addEventListener('click', () => showGuidePage('main'));
    document.getElementById('guide-back-media').addEventListener('click', () => showGuidePage('main'));
    document.getElementById('guide-back-collaborate').addEventListener('click', () => showGuidePage('main'));
    document.getElementById('guide-back-about').addEventListener('click', () => showGuidePage('main'));

    document.getElementById('admin-users-btn').addEventListener('click', openAdminUsersModal);
    document.getElementById('admin-users-close').addEventListener('click', closeAdminUsersModal);
    document.getElementById('admin-users-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeAdminUsersModal();
    });

    const closePwModal = () => document.getElementById('admin-pw-modal').classList.add('hidden');
    document.getElementById('admin-pw-modal-close').addEventListener('click', closePwModal);
    document.getElementById('admin-pw-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closePwModal();
    });
    document.getElementById('admin-pw-modal-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('admin-pw-modal-confirm').click();
    });

    const closeRenameModal = () => document.getElementById('admin-rename-modal').classList.add('hidden');
    document.getElementById('admin-rename-modal-close').addEventListener('click', closeRenameModal);
    document.getElementById('admin-rename-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeRenameModal();
    });
    document.getElementById('admin-rename-modal-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('admin-rename-modal-confirm').click();
    });

    const adminDebugToggle = document.getElementById('admin-debug-toggle');
    if (adminDebugToggle) {
      adminDebugToggle.addEventListener('change', (e) => {
        const vc = document.getElementById('view-counter');
        vc.classList.toggle('debug-active', e.target.checked);
        vc.title = e.target.checked ? 'Debug — clique para info do mapa' : 'Visualizações do site';
      });
    }
    const viewCounterEl = document.getElementById('view-counter');
    viewCounterEl.addEventListener('click', () => openDebugModal());
    viewCounterEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDebugModal();
      }
    });
    document.getElementById('debug-modal-close').addEventListener('click', closeDebugModal);
    document.getElementById('debug-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeDebugModal();
    });
    document.getElementById('debug-copy-all').addEventListener('click', () => {
      const body = document.getElementById('debug-info-body');
      const lines = Array.from(body.querySelectorAll('.debug-row')).map(r => {
        return r.querySelector('.debug-key').textContent + ' ' + r.querySelector('.debug-val').textContent;
      });
      const text = lines.join('\n');
      try {
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(() => showToast('Copiado!', 'success', 2000)).catch(() => { fallbackCopy(text); showToast('Copiado!', 'success', 2000); });
        } else { fallbackCopy(text); showToast('Copiado!', 'success', 2000); }
      } catch (_) { fallbackCopy(text); showToast('Copiado!', 'success', 2000); }
    });

    document.getElementById('user-badge').addEventListener('click', () => openProfileModal());
    document.getElementById('profile-modal-close').addEventListener('click', closeProfileModal);
    document.getElementById('profile-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeProfileModal();
    });
    document.getElementById('profile-form').addEventListener('submit', saveProfile);
    document.getElementById('profile-description').addEventListener('input', updateProfileCharCount);
    document.getElementById('profile-photo-input').addEventListener('change', handleProfilePhotoSelect);
    document.getElementById('profile-change-pw-btn').addEventListener('click', changeOwnPassword);

    document.querySelectorAll('.pw-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        const showing = input.type === 'password';
        input.type = showing ? 'text' : 'password';
        btn.querySelector('.pw-eye-open').classList.toggle('hidden', showing);
        btn.querySelector('.pw-eye-closed').classList.toggle('hidden', !showing);
      });
    });

    // Ranking widget & modal
    const rankWidget = document.getElementById('sidebar-ranking-widget');
    if (rankWidget) {
      rankWidget.addEventListener('click', () => {
        const data = window._rankingData;
        if (isLoggedIn() && data && data.user_mask_count === 0) {
          openGuideModal('howto');
        } else {
          openRankingModal();
        }
      });
    }
    document.getElementById('ranking-modal-close').addEventListener('click', closeRankingModal);
    document.getElementById('ranking-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeRankingModal();
    });
    document.getElementById('ranking-howto-btn').addEventListener('click', () => {
      closeRankingModal();
      openGuideModal('howto');
    });
    document.getElementById('ranking-choose-cell-btn').addEventListener('click', () => {
      closeRankingModal();
      const main = document.getElementById('main-content');
      if (!main.classList.contains('sidebar-open')) toggleSidebar();
    });
    document.getElementById('celebration-modal-close').addEventListener('click', closeCelebration);
    document.getElementById('celebration-ok').addEventListener('click', closeCelebration);
    document.getElementById('celebration-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeCelebration();
    });

    document.getElementById('tour-next').addEventListener('click', () => Onboarding.nextStep());
    document.getElementById('tour-skip').addEventListener('click', () => Onboarding.endTour());
    document.getElementById('tour-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget || e.target.classList.contains('tour-overlay')) Onboarding.endTour();
    });

    document.getElementById('welcome-ok').addEventListener('click', () => Onboarding.closeWelcome(false));
    document.getElementById('welcome-dismiss-forever').addEventListener('click', () => Onboarding.closeWelcome(true));
    document.getElementById('welcome-go-video').addEventListener('click', (e) => {
      e.preventDefault();
      Onboarding.closeWelcome(false);
      openGuideModal('howto');
    });
    document.getElementById('welcome-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) Onboarding.closeWelcome(false);
    });

    trackPageView();

    document.getElementById('tool-home').addEventListener('click', handleHomeClick);
    document.getElementById('btn-my-location').addEventListener('click', handleMyLocation);

    document.getElementById('legend-toggle').addEventListener('click', toggleLegend);

    document.getElementById('toggle-users-btn').addEventListener('click', () => {
      const main = document.getElementById('main-content');
      if (!main.classList.contains('sidebar-open')) toggleSidebar();
      const panel = document.getElementById('users-panel');
      if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    if (typeof LeucenaCollab !== 'undefined' && LeucenaCollab.initAnonymous) {
      LeucenaCollab.initAnonymous();
    }

    setupAuthForm();
    setupGoogleAuth();
    setupMigrationBanner();
    setupVerificationBanner();
    tryRestoreSession();
    loadRankingWidget();

    LeucenaI18n.translatePage();

    handleHash();
    window.addEventListener('hashchange', handleHash);
    window.addEventListener('beforeunload', _flushLogs);

    // Escape: close the first visible modal in modalCloseMap (global dismiss, not a stack).
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const modalCloseMap = [
        ['admin-rename-modal', closeRenameModal],
        ['admin-pw-modal', closePwModal],
        ['auth-modal', closeAuthModal],
        ['reset-modal', closeResetModal],
        ['unlock-modal', closeUnlockModal],
        ['tool-switch-modal', () => { document.getElementById('tool-switch-modal').classList.add('hidden'); }],
        ['delete-warn-modal', () => { document.getElementById('delete-warn-modal').classList.add('hidden'); }],
        ['addpoints-modal', () => { document.getElementById('addpoints-modal').classList.add('hidden'); }],
        ['docs-modal', closeDocsModal],
        ['admin-users-modal', closeAdminUsersModal],
        ['welcome-modal', () => Onboarding.closeWelcome(false)],
        ['debug-modal', closeDebugModal],
        ['profile-modal', closeProfileModal],
        ['guide-modal', closeGuideModal],
        ['dedup-modal', () => { document.getElementById('dedup-modal').classList.add('hidden'); }],
        ['ranking-modal', closeRankingModal],
        ['celebration-modal', closeCelebration],
      ];
      for (const [id, closeFn] of modalCloseMap) {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('hidden')) {
          e.preventDefault();
          closeFn();
          return;
        }
      }
    });

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

  // ── Deep-linking (hash) ──

  const GUIDE_PAGES = ['main', 'leucena', 'howto', 'media', 'collaborate', 'about'];
  const VALID_HASHES = new Set(['docs', 'guide', ...Object.keys({ leucena:1, howto:1, media:1, collaborate:1, about:1 })]);

  function setHash(h) { history.replaceState(null, '', h ? '#' + h : window.location.pathname + window.location.search); }

  // ── Docs modal ──

  function openDocsModal() {
    logEvent('docs_open');
    LeucenaI18n.translatePage();
    document.getElementById('docs-modal').classList.remove('hidden');
    setHash('docs');
  }

  function closeDocsModal() {
    document.getElementById('docs-modal').classList.add('hidden');
    setHash('');
  }

  // ── Guide modal ──

  function openGuideModal(page) {
    const target = (typeof page === 'string') ? page : 'main';
    logEvent('guide_open', null, null, { page: target });
    LeucenaI18n.translatePage();
    showGuidePage(target);
    document.getElementById('guide-modal').classList.remove('hidden');
    if (target === 'about') loadQuemSomosContent();
  }

  function closeGuideModal() {
    document.getElementById('guide-modal').classList.add('hidden');
    setHash('');
  }

  function showGuidePage(page) {
    logEvent('guide_page', null, null, { page: page });
    GUIDE_PAGES.forEach(p => {
      const el = document.getElementById('guide-' + p);
      if (el) el.classList.add('hidden');
    });
    document.getElementById('guide-' + page).classList.remove('hidden');
    if (page !== 'main') setHash(page);
    else if (!document.getElementById('guide-modal').classList.contains('hidden')) setHash('guide');
  }

  function handleHash() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    if (hash === 'docs') { openDocsModal(); return; }
    if (hash === 'guide') { openGuideModal('main'); return; }
    if (VALID_HASHES.has(hash)) { openGuideModal(hash); return; }
  }

  // ── Auth modal ──

  let authMode = 'login';

  function setupAuthForm() {
    document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);
    const usernameInput = document.getElementById('auth-username');
    usernameInput.addEventListener('input', () => {
      if (authMode === 'login' && usernameInput.value.includes('@')) return;
      usernameInput.value = usernameInput.value
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9.]/g, '');
    });
    document.getElementById('auth-switch-link').addEventListener('click', (e) => {
      e.preventDefault();
      openAuthModal(authMode === 'login' ? 'register' : 'login');
    });
    document.getElementById('auth-forgot-link').addEventListener('click', (e) => {
      e.preventDefault();
      closeAuthModal();
      openResetModal();
    });
    document.getElementById('reset-modal-close').addEventListener('click', closeResetModal);
    document.getElementById('reset-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeResetModal();
    });
    document.getElementById('reset-form').addEventListener('submit', handleResetSubmit);
    document.getElementById('reset-back-login').addEventListener('click', (e) => {
      e.preventDefault();
      closeResetModal();
      openAuthModal('login');
    });
  }

  function openAuthModal(mode) {
    logEvent('auth_modal_open', null, null, { mode: mode });
    authMode = mode;
    const modal = document.getElementById('auth-modal');
    modal.classList.remove('hidden');

    document.getElementById('auth-error').classList.add('hidden');
    const authSuccess = document.getElementById('auth-success');
    if (authSuccess) authSuccess.classList.add('hidden');
    document.getElementById('auth-form').classList.remove('hidden');
    document.querySelector('.auth-switch').classList.remove('hidden');
    const googleBtn = document.getElementById('auth-google-btn');
    if (googleBtn) googleBtn.classList.remove('hidden');
    const divider = document.querySelector('.auth-divider');
    if (divider) divider.classList.remove('hidden');
    document.getElementById('auth-username').value = '';
    document.getElementById('auth-password').value = '';

    const emailGroup = document.getElementById('email-group');
    const emailInput = document.getElementById('auth-email');
    emailInput.value = '';
    const usernameHint = document.getElementById('auth-username-hint');

    const t = LeucenaI18n.t;
    const forgotGroup = document.getElementById('auth-forgot-group');
    const contactHint = document.getElementById('auth-contact-hint');
    const googleLabel = document.getElementById('auth-google-label');
    if (mode === 'login') {
      document.getElementById('auth-modal-title').textContent = t('auth.login');
      document.getElementById('auth-modal-subtitle').textContent = t('auth.loginSubtitle');
      document.getElementById('auth-submit-btn').textContent = t('auth.login');
      document.getElementById('auth-switch-text').textContent = t('auth.noAccount');
      document.getElementById('auth-switch-link').textContent = t('auth.register');
      emailGroup.classList.add('hidden');
      emailInput.removeAttribute('required');
      usernameHint.classList.add('hidden');
      forgotGroup.classList.remove('hidden');
      if (contactHint) contactHint.classList.add('hidden');
      const u = document.getElementById('auth-username');
      if (u) u.removeAttribute('pattern');
      if (googleLabel) googleLabel.textContent = t('auth.googleSignIn');
    } else {
      document.getElementById('auth-modal-title').textContent = t('auth.register');
      document.getElementById('auth-modal-subtitle').textContent = t('auth.registerSubtitle');
      document.getElementById('auth-submit-btn').textContent = t('auth.createAccount');
      document.getElementById('auth-switch-text').textContent = t('auth.hasAccount');
      document.getElementById('auth-switch-link').textContent = t('auth.login');
      emailGroup.classList.remove('hidden');
      emailInput.setAttribute('required', 'required');
      usernameHint.classList.remove('hidden');
      forgotGroup.classList.add('hidden');
      if (contactHint) contactHint.classList.remove('hidden');
      const u = document.getElementById('auth-username');
      if (u) u.setAttribute('pattern', '[a-z0-9.]+');
      if (googleLabel) googleLabel.textContent = t('auth.googleSignUp');
    }
    document.getElementById('auth-username').focus();
  }

  function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
  }

  function openResetModal() {
    logEvent('reset_modal_open');
    const modal = document.getElementById('reset-modal');
    document.getElementById('reset-error').classList.add('hidden');
    document.getElementById('reset-success').classList.add('hidden');
    document.getElementById('reset-email').value = '';
    document.getElementById('reset-form').classList.remove('hidden');
    modal.classList.remove('hidden');
    document.getElementById('reset-email').focus();
  }

  function closeResetModal() {
    document.getElementById('reset-modal').classList.add('hidden');
  }

  async function handleResetSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('reset-email').value.trim();
    const errorEl = document.getElementById('reset-error');
    const successEl = document.getElementById('reset-success');
    errorEl.classList.add('hidden');
    successEl.classList.add('hidden');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        errorEl.textContent = data.error;
        errorEl.classList.remove('hidden');
        return;
      }
      if (data.google) {
        errorEl.textContent = LeucenaI18n.t('reset.googleOnly');
        errorEl.classList.remove('hidden');
        return;
      }
      successEl.textContent = LeucenaI18n.t('reset.emailSent');
      successEl.classList.remove('hidden');
      document.getElementById('reset-form').classList.add('hidden');
    } catch (err) {
      errorEl.textContent = LeucenaI18n.t('auth.connectionError');
      errorEl.classList.remove('hidden');
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    const user = document.getElementById('auth-username').value.trim().toLowerCase();
    const pass = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    errorEl.classList.add('hidden');

    if (authMode === 'register' && !/^[a-z0-9.]{2,30}$/.test(user)) {
      errorEl.textContent = LeucenaI18n.t('auth.usernameInvalid');
      errorEl.classList.remove('hidden');
      return;
    }
    if (authMode === 'register' && !/[a-z]/.test(user)) {
      errorEl.textContent = LeucenaI18n.t('auth.usernameNeedsLetter');
      errorEl.classList.remove('hidden');
      return;
    }

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = authMode === 'login'
      ? { identifier: user, username: user, password: pass }
      : { username: user, password: pass };
    if (authMode === 'register') {
      payload.email = document.getElementById('auth-email').value.trim();
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'EMAIL_NOT_VERIFIED' && authMode === 'login') {
          errorEl.classList.add('hidden');
          const successEl = document.getElementById('auth-success');
          if (successEl) {
            successEl.textContent = data.error;
            successEl.classList.remove('hidden');
          }
        } else {
          errorEl.textContent = data.error;
          errorEl.classList.remove('hidden');
        }
        return;
      }

      if (data.needs_verification && !data.token) {
        const email = document.getElementById('auth-email') ? document.getElementById('auth-email').value.trim() : '';
        const successEl = document.getElementById('auth-success');
        if (successEl) {
          successEl.textContent = LeucenaI18n.t('auth.verifyEmailSent', email);
          successEl.classList.remove('hidden');
        }
        document.getElementById('auth-form').classList.add('hidden');
        document.querySelector('.auth-switch').classList.add('hidden');
        const forgotGroup = document.getElementById('auth-forgot-group');
        if (forgotGroup) forgotGroup.classList.add('hidden');
        const googleBtn = document.getElementById('auth-google-btn');
        if (googleBtn) googleBtn.classList.add('hidden');
        const divider = document.querySelector('.auth-divider');
        if (divider) divider.classList.add('hidden');
        return;
      }

      authToken = data.token;
      username = data.username;
      userRole = data.role || 'contributor';
      testerMode = data.tester_mode || 'contributor';
      localStorage.setItem('leucena_token', authToken);
      localStorage.setItem('leucena_username', username);

      _userAuthInfo = {
        auth_provider: data.auth_provider || 'local',
        email_verified: !!data.email_verified,
        has_google: !!data.has_google,
        login_count: data.login_count || 0,
        mask_count: data.mask_count || 0,
        role: data.role || 'contributor'
      };

      if (data.show_migration_banner) {
        _showMigrationBanner = true;
      }

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
        userRole = data.role || 'contributor';
        testerMode = data.tester_mode || 'contributor';
        if (data.show_migration_banner) _showMigrationBanner = true;
        _userAuthInfo = { auth_provider: data.auth_provider, email_verified: data.email_verified, has_google: data.has_google, login_count: data.login_count || 0, mask_count: data.mask_count || 0, role: data.role || 'contributor' };
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
    const avatarEl = document.getElementById('user-avatar');
    avatarEl.innerHTML = '';
    avatarEl.textContent = username.charAt(0).toUpperCase();

    LeucenaCollab.init(username);
    showAdminTools();
    loadUserProfile();
    if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.refreshPolyStyles) {
      LeucenaDrawing.refreshPolyStyles();
    }
    if (typeof LeucenaMap !== 'undefined' && LeucenaMap.updateFilterCounts) {
      LeucenaMap.updateFilterCounts();
    }
    showToast(LeucenaI18n.t('auth.welcome', username), 'success');
    Onboarding.onLogin();

    if (_showMigrationBanner && !localStorage.getItem('leucena_migration_dismissed')) {
      const banner = document.getElementById('migration-banner');
      if (banner) banner.classList.remove('hidden');
    }

    showVerificationBannerIfNeeded();
    loadRankingWidget();
    checkProfileNudge();

    if (selectedCellId && selectedCellData) {
      const canLock = !selectedCellData.locked_by;
      if (canLock) {
        lockCell(selectedCellId);
      } else {
        selectCell(selectedCellId, selectedCellData);
      }
    }
  }

  function showVerificationBannerIfNeeded() {
    const banner = document.getElementById('verification-banner');
    if (!banner) return;
    if (_userAuthInfo.auth_provider === 'google' || _userAuthInfo.email_verified) {
      banner.classList.add('hidden');
    } else if (isLoggedIn()) {
      banner.classList.remove('hidden');
    }
  }

  // ── Ranking Widget & Modal ──

  async function loadRankingWidget() {
    const widget = document.getElementById('sidebar-ranking-widget');
    if (!widget) return;
    const role = _userAuthInfo.role || userRole;
    const isContrib = role === 'contributor' && isLoggedIn();
    try {
      const url = isContrib ? '/api/my-ranking' : '/api/ranking';
      const opts = isContrib ? { headers: authHeaders() } : {};
      const res = await fetch(url, opts);
      if (!res.ok) { widget.classList.add('hidden'); return; }
      const data = await res.json();
      if (data.user_position === undefined) data.user_position = 0;
      if (data.user_mask_count === undefined) data.user_mask_count = -1;
      if (data.user_area_ha === undefined) data.user_area_ha = 0;
      window._rankingData = data;
      const textEl = document.getElementById('ranking-widget-text');
      if (isContrib && data.user_mask_count === 0) {
        textEl.textContent = LeucenaI18n.t('ranking.widgetZero');
      } else if (isContrib && data.user_mask_count > 0) {
        textEl.textContent = LeucenaI18n.t('ranking.widgetPosition', data.user_position, data.total_contributors);
      } else {
        textEl.textContent = LeucenaI18n.t('ranking.widgetPublic');
      }
      widget.classList.remove('hidden');
    } catch (e) {
      widget.classList.add('hidden');
    }
  }

  function openRankingModal() {
    logEvent('ranking_open');
    const data = window._rankingData;
    if (!data) return;

    const top3El = document.getElementById('ranking-top3');
    const posEl = document.getElementById('ranking-user-position');
    const zeroEl = document.getElementById('ranking-zero-cta');
    const t = LeucenaI18n.t;
    const role = _userAuthInfo.role || userRole;
    const isContrib = role === 'contributor' && isLoggedIn();

    const medalClasses = ['gold', 'silver', 'bronze'];
    let top3Html = '';
    data.top3.forEach((u, i) => {
      const cls = medalClasses[i] || '';
      top3Html += '<div class="ranking-top3-item ' + cls + '">' +
        '<div class="ranking-medal ' + cls + '">' + (i + 1) + '</div>' +
        '<div class="ranking-top3-name">' + escapeHtmlRanking(u.name) + '</div>' +
        '<div class="ranking-top3-stats">' + t('ranking.maskCount', u.mask_count) + '<br>' + u.area_ha + ' ha</div>' +
        '</div>';
    });
    top3El.innerHTML = top3Html;

    if (isContrib && data.user_mask_count === 0) {
      posEl.innerHTML = '';
      posEl.style.display = 'none';
      zeroEl.classList.remove('hidden');
    } else if (isContrib && data.user_mask_count > 0) {
      posEl.style.display = '';
      posEl.innerHTML =
        '<div class="ranking-user-position-text">' + t('ranking.position', data.user_position, data.total_contributors) + '</div>' +
        '<div class="ranking-user-stats">' + t('ranking.stats', data.user_mask_count, data.user_area_ha) + '</div>';
      zeroEl.classList.add('hidden');
    } else {
      posEl.innerHTML = '';
      posEl.style.display = 'none';
      zeroEl.classList.add('hidden');
    }

    document.getElementById('ranking-modal').classList.remove('hidden');
  }

  function closeRankingModal() {
    document.getElementById('ranking-modal').classList.add('hidden');
  }

  function escapeHtmlRanking(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function showCelebration(emoji, titleKey, msgKey, msgArgs) {
    const t = LeucenaI18n.t;
    document.getElementById('celebration-emoji').textContent = emoji;
    document.getElementById('celebration-title').textContent = t(titleKey);
    document.getElementById('celebration-msg').textContent = msgArgs ? t(msgKey, ...msgArgs) : t(msgKey);
    document.getElementById('celebration-modal').classList.remove('hidden');
  }

  function closeCelebration() {
    document.getElementById('celebration-modal').classList.add('hidden');
  }

  async function onPolygonSaved() {
    if (!isLoggedIn()) return;
    const role = _userAuthInfo.role || userRole;
    if (role !== 'contributor') { loadRankingWidget(); return; }

    const prevPosition = window._rankingData ? window._rankingData.user_position : 0;
    const prevMaskCount = window._rankingData ? window._rankingData.user_mask_count : 0;

    try {
      const res = await fetch('/api/my-ranking', { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      window._rankingData = data;

      const textEl = document.getElementById('ranking-widget-text');
      const widget = document.getElementById('sidebar-ranking-widget');
      if (data.user_mask_count === 0) {
        textEl.textContent = LeucenaI18n.t('ranking.widgetZero');
      } else {
        textEl.textContent = LeucenaI18n.t('ranking.widgetPosition', data.user_position, data.total_contributors);
      }
      if (widget) widget.classList.remove('hidden');

      if (prevMaskCount === 0 && data.user_mask_count === 1) {
        showCelebration('🎉', 'ranking.firstMaskTitle', 'ranking.firstMaskMsg');
      } else if (prevPosition > 0 && data.user_position > 0 && data.user_position < prevPosition) {
        showCelebration('🏆', 'ranking.rankUpTitle', 'ranking.rankUpMsg', [data.user_position]);
      }
    } catch (e) { /* ignore */ }
  }

  // ── Profile Nudge ──

  function checkProfileNudge() {
    const role = _userAuthInfo.role || userRole;
    if (role !== 'contributor') return;
    if (localStorage.getItem('leucena_profile_nudge') === 'v1') return;
    const loginCount = _userAuthInfo.login_count || 0;
    const maskCount = _userAuthInfo.mask_count || 0;
    if (loginCount >= 2 || maskCount >= 1) {
      setTimeout(() => {
        openProfileModal();
        localStorage.setItem('leucena_profile_nudge', 'v1');
      }, 1500);
    }
  }

  // ── Google OAuth + Migration Banner ──

  let _showMigrationBanner = false;
  let _userAuthInfo = {};

  function isEmailVerified() {
    if (_userAuthInfo.auth_provider === 'google') return true;
    return !!_userAuthInfo.email_verified;
  }

  function setupGoogleAuth() {
    const googleBtn = document.getElementById('auth-google-btn');
    if (googleBtn) {
      googleBtn.addEventListener('click', () => {
        window.location.href = '/auth/google';
      });
    }
    handleGoogleAuthReturn();
  }

  function handleGoogleAuthReturn() {
    const params = new URLSearchParams(window.location.search);
    const googleToken = params.get('google_auth_token');
    const authError = params.get('auth_error');

    if (googleToken) {
      authToken = googleToken;
      localStorage.setItem('leucena_token', authToken);
      window.history.replaceState({}, '', window.location.pathname);
      tryRestoreSession();
    } else if (authError) {
      window.history.replaceState({}, '', window.location.pathname);
      const errorMap = {
        no_code: 'Erro na autenticação Google (sem código)',
        token_failed: 'Falha ao obter token do Google',
        profile_failed: 'Falha ao obter perfil do Google',
        server_error: 'Erro interno na autenticação Google'
      };
      showToast(errorMap[authError] || 'Erro na autenticação', 'error');
    }
  }

  function setupMigrationBanner() {
    const linkBtn = document.getElementById('migration-banner-link');
    const dismissBtn = document.getElementById('migration-banner-dismiss');
    if (linkBtn) {
      linkBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/auth/google';
      });
    }
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        const banner = document.getElementById('migration-banner');
        if (banner) banner.classList.add('hidden');
        localStorage.setItem('leucena_migration_dismissed', '1');
      });
    }
  }

  function setupVerificationBanner() {
    const resendBtn = document.getElementById('verification-banner-resend');
    if (resendBtn) {
      resendBtn.addEventListener('click', async () => {
        try {
          const res = await fetch('/api/auth/resend-verification', { method: 'POST', headers: authHeaders() });
          const data = await res.json();
          if (res.ok) {
            showToast(LeucenaI18n.t('auth.resendSuccess'), 'success');
          } else {
            showToast(data.error || 'Erro', 'error');
          }
        } catch (e) { showToast(LeucenaI18n.t('auth.connectionError'), 'error'); }
      });
    }
  }

  // ── Onboarding Controller ──
  // Guided tour: dim overlay + spotlight on target + tooltip positioned within the viewport.
  const WELCOME_VERSION = 'v1_howto_video';
  const TOUR_VERSION = 'v3';
  let _tourStartedFrom = null;
  let _tourStep = 0;
  let _tourSpotlight = null;

  const TOUR_STEPS = [
    { target: '#guide-btn',       text: 'tour.step1' },
    { target: '#user-badge',      text: 'tour.step2' },
    { target: '#sidebar-toggle',  text: 'tour.step3' },
    { target: '#tool-maptools',   text: 'tour.step4' },
    { target: '#btn-my-location', text: 'tour.step5' },
    { target: '#map',             text: 'tour.step6' },
  ];

  const Onboarding = {
    isTourCompleted()  { return localStorage.getItem('leucena_tour_completed') === TOUR_VERSION; },
    isWelcomeShown()   { return localStorage.getItem('leucena_welcome_dismissed') === WELCOME_VERSION; },
    setTourCompleted() { localStorage.setItem('leucena_tour_completed', TOUR_VERSION); },
    setWelcomeShown()  { localStorage.setItem('leucena_welcome_dismissed', WELCOME_VERSION); },

    onLogin() {
      if (!this.isTourCompleted()) {
        setTimeout(() => this.startTour('auto'), 800);
      } else if (!this.isWelcomeShown()) {
        this.showWelcome();
      }
    },

    startTour(source) {
      _tourStartedFrom = source;
      _tourStep = 0;
      if (!_tourSpotlight) {
        _tourSpotlight = document.createElement('div');
        _tourSpotlight.className = 'tour-spotlight';
        document.body.appendChild(_tourSpotlight);
      }
      document.getElementById('tour-overlay').classList.remove('hidden');
      document.getElementById('tour-tooltip').classList.remove('hidden');
      this._renderStep();
    },

    _renderStep() {
      const t = LeucenaI18n.t;
      const step = TOUR_STEPS[_tourStep];
      const tooltip = document.getElementById('tour-tooltip');
      const textEl = document.getElementById('tour-text');
      const nextBtn = document.getElementById('tour-next');
      const isLast = _tourStep === TOUR_STEPS.length - 1;

      textEl.textContent = t(step.text);
      nextBtn.textContent = isLast ? t('tour.finish') : t('tour.next');

      const indicator = document.getElementById('tour-step-indicator');
      indicator.innerHTML = TOUR_STEPS.map((_, i) =>
        `<span class="tour-dot${i === _tourStep ? ' active' : ''}"></span>`
      ).join('');

      const el = document.querySelector(step.target);
      if (!el || el.classList.contains('hidden') || el.offsetParent === null) {
        _tourStep++;
        if (_tourStep >= TOUR_STEPS.length) { this.endTour(); return; }
        this._renderStep();
        return;
      }

      const rect = el.getBoundingClientRect();
      const pad = 8;

      _tourSpotlight.style.top    = (rect.top - pad) + 'px';
      _tourSpotlight.style.left   = (rect.left - pad) + 'px';
      _tourSpotlight.style.width  = (rect.width + pad * 2) + 'px';
      _tourSpotlight.style.height = (rect.height + pad * 2) + 'px';
      _tourSpotlight.style.display = 'block';

      tooltip.style.top = '0px';
      tooltip.style.left = '0px';
      tooltip.style.visibility = 'hidden';

      requestAnimationFrame(() => {
        const tw = tooltip.offsetWidth;
        const th = tooltip.offsetHeight;
        const gap = 14;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const spaceBelow = vh - rect.bottom - pad;
        const spaceAbove = rect.top - pad;
        const spaceRight = vw - rect.right - pad;
        const spaceLeft  = rect.left - pad;

        let ttop, tleft;

        if (spaceBelow >= th + gap) {
          ttop = rect.bottom + pad + gap;
          tleft = rect.left + rect.width / 2 - tw / 2;
        } else if (spaceAbove >= th + gap) {
          ttop = rect.top - pad - gap - th;
          tleft = rect.left + rect.width / 2 - tw / 2;
        } else if (spaceRight >= tw + gap) {
          tleft = rect.right + pad + gap;
          ttop = rect.top + rect.height / 2 - th / 2;
        } else if (spaceLeft >= tw + gap) {
          tleft = rect.left - pad - gap - tw;
          ttop = rect.top + rect.height / 2 - th / 2;
        } else {
          ttop = vh / 2 - th / 2;
          tleft = vw / 2 - tw / 2;
        }

        tleft = Math.max(10, Math.min(tleft, vw - tw - 10));
        ttop  = Math.max(10, Math.min(ttop, vh - th - 10));

        tooltip.style.top  = ttop + 'px';
        tooltip.style.left = tleft + 'px';
        tooltip.style.visibility = 'visible';
      });
    },

    nextStep() {
      _tourStep++;
      if (_tourStep >= TOUR_STEPS.length) {
        this.endTour();
      } else {
        this._renderStep();
      }
    },

    endTour() {
      document.getElementById('tour-overlay').classList.add('hidden');
      document.getElementById('tour-tooltip').classList.add('hidden');
      if (_tourSpotlight) _tourSpotlight.style.display = 'none';
      this.setTourCompleted();
      if (_tourStartedFrom === 'auto' && !this.isWelcomeShown()) {
        setTimeout(() => this.showWelcome(), 400);
      }
      _tourStartedFrom = null;
    },

    showWelcome() {
      LeucenaI18n.translatePage();
      setTimeout(() => {
        document.getElementById('welcome-modal').classList.remove('hidden');
      }, 300);
    },

    closeWelcome(dismiss) {
      document.getElementById('welcome-modal').classList.add('hidden');
      if (dismiss) this.setWelcomeShown();
    }
  };

  function applyProfileToUI(profile) {
    const nameEl = document.getElementById('user-display-name');
    const avatarEl = document.getElementById('user-avatar');
    const displayName = profile && profile.full_name ? profile.full_name.split(' ')[0] : username;
    nameEl.textContent = displayName;
    if (profile && profile.photo) {
      avatarEl.innerHTML = '<img src="' + profile.photo + '" alt="">';
    } else {
      avatarEl.innerHTML = '';
      avatarEl.textContent = (displayName || username).toString().charAt(0).toUpperCase();
    }
  }

  async function loadUserProfile() {
    if (!isLoggedIn()) return;
    try {
      const res = await fetch('/api/auth/me', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        _userAuthInfo = { auth_provider: data.auth_provider, email_verified: data.email_verified, has_google: data.has_google, login_count: data.login_count || 0, mask_count: data.mask_count || 0, role: data.role || 'contributor' };
        showVerificationBannerIfNeeded();
        loadRankingWidget();
      }
      const profRes = await fetch('/api/profile', { headers: authHeaders() });
      if (profRes.ok) {
        const profile = await profRes.json();
        applyProfileToUI(profile);
      }
    } catch (e) { /* ignore */ }
  }

  let profilePhotoDataUrl = null;
  let adminEditingUser = null;

  async function openProfileModal(targetUser) {
    if (!isLoggedIn()) return;
    logEvent('profile_open', null, null, targetUser ? { target: targetUser.username } : null);
    document.getElementById('profile-error').classList.add('hidden');
    profilePhotoDataUrl = null;

    const titleEl = document.getElementById('profile-modal').querySelector('h2');
    const pwSection = document.getElementById('profile-pw-section');
    const socialSection = document.getElementById('profile-social-section');
    const subtitleEl = document.getElementById('profile-subtitle');
    const t = LeucenaI18n.t;

    const emailInput = document.getElementById('profile-email');

    if (targetUser) {
      adminEditingUser = targetUser;
      titleEl.textContent = t('admin.editProfileTitle', targetUser.username);
      if (pwSection) pwSection.style.display = 'none';
      if (socialSection) socialSection.style.display = '';
      if (subtitleEl) subtitleEl.textContent = t('profile.subtitleMember');
      document.getElementById('profile-full-name').value = targetUser.full_name || '';
      document.getElementById('profile-description').value = targetUser.description || '';
      emailInput.value = targetUser.email || '';
      emailInput.disabled = false;
      document.getElementById('profile-linkedin').value = targetUser.linkedin || '';
      document.getElementById('profile-scholar').value = targetUser.scholar || '';
      updateProfileCharCount();
      const preview = document.getElementById('profile-photo-preview');
      if (targetUser.photo) {
        preview.innerHTML = '<img src="' + targetUser.photo + '" alt="">';
        profilePhotoDataUrl = targetUser.photo;
      } else {
        preview.innerHTML = '';
        preview.textContent = (targetUser.full_name || targetUser.username).toString().charAt(0).toUpperCase();
      }
      document.getElementById('profile-photo-input').value = '';
      const googleSectionOther = document.getElementById('profile-google-section');
      if (googleSectionOther) googleSectionOther.style.display = 'none';
      const emailStatusOther = document.getElementById('profile-email-status-section');
      if (emailStatusOther) emailStatusOther.classList.add('hidden');
    } else {
      adminEditingUser = null;
      titleEl.textContent = t('profile.title');
      if (pwSection) pwSection.style.display = '';
      const effRole = getEffectiveRole();
      if (socialSection) socialSection.style.display = (effRole === 'contributor') ? 'none' : '';
      if (subtitleEl) subtitleEl.textContent = t((effRole === 'contributor') ? 'profile.subtitleContributor' : 'profile.subtitleMember');
      emailInput.disabled = true;
      try {
        const res = await fetch('/api/profile', { headers: authHeaders() });
        if (!res.ok) return;
        const p = await res.json();
        document.getElementById('profile-full-name').value = p.full_name || '';
        document.getElementById('profile-description').value = p.description || '';
        emailInput.value = p.email || '';
        document.getElementById('profile-linkedin').value = p.linkedin || '';
        document.getElementById('profile-scholar').value = p.scholar || '';
        updateProfileCharCount();
        const preview = document.getElementById('profile-photo-preview');
        if (p.photo) {
          preview.innerHTML = '<img src="' + p.photo + '" alt="">';
          profilePhotoDataUrl = p.photo;
        } else {
          preview.innerHTML = '';
          preview.textContent = (p.full_name || username).toString().charAt(0).toUpperCase();
        }
        document.getElementById('profile-photo-input').value = '';
        document.getElementById('profile-new-password').value = '';

        updateProfileAuthUI(p);
        const googleSection = document.getElementById('profile-google-section');
        if (googleSection) googleSection.style.display = '';
        const emailStatusSection = document.getElementById('profile-email-status-section');
        if (emailStatusSection) emailStatusSection.style.display = '';
      } catch (e) { /* ignore */ }
    }
    document.getElementById('profile-modal').classList.remove('hidden');
  }

  function updateProfileAuthUI(profile) {
    const t = LeucenaI18n.t;
    const googleSection = document.getElementById('profile-google-section');
    const googleStatus = document.getElementById('profile-google-status');
    const emailStatusSection = document.getElementById('profile-email-status-section');
    const emailBadge = document.getElementById('profile-email-badge');
    const resendBtn = document.getElementById('profile-resend-verify');

    if (googleSection && googleStatus) {
      if (profile.has_google) {
        googleStatus.innerHTML = '<span class="profile-google-linked">✓ ' + t('profile.googleLinked') + '</span>';
      } else {
        googleStatus.innerHTML = '<button type="button" class="btn btn-secondary btn-small" id="profile-link-google-btn">' + t('profile.linkGoogle') + '</button>';
        const linkBtn = document.getElementById('profile-link-google-btn');
        if (linkBtn) linkBtn.addEventListener('click', () => { window.location.href = '/auth/google'; });
      }
    }

    if (emailStatusSection && emailBadge) {
      if (profile.email_verified) {
        emailBadge.className = 'profile-email-badge verified';
        emailBadge.textContent = '✓ ' + t('profile.emailVerified');
        emailStatusSection.classList.remove('hidden');
        if (resendBtn) resendBtn.classList.add('hidden');
      } else if (profile.email) {
        emailBadge.className = 'profile-email-badge unverified';
        emailBadge.textContent = '✗ ' + t('profile.emailNotVerified');
        emailStatusSection.classList.remove('hidden');
        if (resendBtn) {
          resendBtn.classList.remove('hidden');
          resendBtn.onclick = async () => {
            try {
              const res = await fetch('/api/auth/resend-verification', { method: 'POST', headers: authHeaders() });
              const data = await res.json();
              if (res.ok) showToast(t('auth.resendSuccess'), 'success');
              else showToast(data.error || 'Erro', 'error');
            } catch (e) { showToast(t('auth.connectionError'), 'error'); }
          };
        }
      } else {
        emailStatusSection.classList.add('hidden');
      }
    }
  }

  function closeProfileModal() {
    document.getElementById('profile-modal').classList.add('hidden');
    const wasAdminEditing = !!adminEditingUser;
    adminEditingUser = null;
    if (wasAdminEditing) openAdminUsersModal();

    const badge = document.getElementById('user-badge');
    if (badge && !wasAdminEditing) {
      badge.classList.add('user-badge-pulse');
      setTimeout(() => badge.classList.remove('user-badge-pulse'), 3200);
    }
  }

  async function changeOwnPassword() {
    logEvent('password_change_attempt');
    const pwInput = document.getElementById('profile-new-password');
    const pw = pwInput.value;
    if (!pw || pw.length < 3) {
      showToast(LeucenaI18n.t('profile.pwTooShort'), 'warning');
      return;
    }
    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify({ password: pw })
      });
      if (res.ok) {
        showToast(LeucenaI18n.t('profile.pwChanged'), 'success');
        pwInput.value = '';
      } else {
        const err = await res.json();
        showToast(err.error, 'error');
      }
    } catch (e) { showToast('Erro de conexão', 'error'); }
  }

  function updateProfileCharCount() {
    const n = document.getElementById('profile-description').value.length;
    document.getElementById('profile-char-n').textContent = n;
  }

  function handleProfilePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 200000) {
      showToast(LeucenaI18n.t('profile.photoTooBig'), 'warning');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      profilePhotoDataUrl = reader.result;
      const preview = document.getElementById('profile-photo-preview');
      preview.innerHTML = '<img src="' + profilePhotoDataUrl + '" alt="">';
    };
    reader.readAsDataURL(file);
  }

  async function saveProfile(e) {
    e.preventDefault();
    logEvent('profile_save');
    const full_name = document.getElementById('profile-full-name').value.trim() || null;
    const description = document.getElementById('profile-description').value.trim() || null;
    const emailInput = document.getElementById('profile-email');
    const email = adminEditingUser ? (emailInput.value.trim() || null) : undefined;
    const linkedin = document.getElementById('profile-linkedin').value.trim() || null;
    const scholar = document.getElementById('profile-scholar').value.trim() || null;
    const errorEl = document.getElementById('profile-error');
    errorEl.classList.add('hidden');
    if (description && description.length > 400) {
      errorEl.textContent = 'Descrição deve ter no máximo 400 caracteres.';
      errorEl.classList.remove('hidden');
      return;
    }
    try {
      const url = adminEditingUser
        ? `/api/admin/users/${adminEditingUser.id}/profile`
        : '/api/profile';
      const payload = { full_name, description, photo: profilePhotoDataUrl, linkedin, scholar };
      if (adminEditingUser) payload.email = email;
      const res = await fetch(url, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        errorEl.textContent = err.error || 'Erro ao salvar';
        errorEl.classList.remove('hidden');
        return;
      }
      const wasAdmin = !!adminEditingUser;
      closeProfileModal();
      if (!wasAdmin) loadUserProfile();
      showToast(wasAdmin ? LeucenaI18n.t('admin.profileUpdated') : LeucenaI18n.t('profile.saved'), 'success');
    } catch (err) {
      errorEl.textContent = 'Erro de conexão.';
      errorEl.classList.remove('hidden');
    }
  }

  async function loadQuemSomosContent() {
    const container = document.getElementById('guide-about-content');
    if (!container) return;
    const t = LeucenaI18n.t;
    container.innerHTML = '<p class="guide-loading">Carregando...</p>';
    try {
      const res = await fetch('/api/quem-somos');
      if (!res.ok) {
        container.innerHTML = '<p>Não foi possível carregar.</p>';
        return;
      }
      const data = await res.json();

      function cardHtml(person, medalIndex) {
        const name = person.full_name || person.username;
        const desc = person.description || '';
        const thumb = person.photo
          ? '<img src="' + person.photo + '" alt="">'
          : name.toString().charAt(0).toUpperCase();
        let rankBadgeHtml = '';
        if (medalIndex !== undefined && medalIndex < 3) {
          const cls = medalIndex === 0
            ? 'team-rank-badge team-rank-badge--gold'
            : medalIndex === 1
              ? 'team-rank-badge team-rank-badge--silver'
              : 'team-rank-badge team-rank-badge--bronze';
          rankBadgeHtml = '<div class="' + cls + '">Top ' + (medalIndex + 1) + '</div>';
        }
        const areaStr = person.area_ha ? ' · ' + person.area_ha + ' ha' : '';
        return '<div class="about-card"><div class="about-card-thumb">' + thumb + '</div><div class="about-card-info">' + rankBadgeHtml + '<div class="about-card-name">' + escapeHtml(name) + '</div><div class="about-card-desc">' + escapeHtml(desc) + areaStr + '</div></div></div>';
      }

      function escapeHtml(s) {
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
      }

      const lang = typeof LeucenaI18n !== 'undefined' && LeucenaI18n.getLang ? LeucenaI18n.getLang() : 'pt';
      let html = '<h2>' + (lang === 'en' ? 'About Us' : lang === 'es' ? 'Quiénes Somos' : 'Quem Somos') + '</h2>';
      const equipe = data.equipe || [];
      const colaboradores = data.colaboradores || [];
      if (equipe.length > 0) {
        html += '<div class="about-section-title">' + t('about.equipe') + '</div><div class="about-cards">';
        equipe.forEach(p => { html += cardHtml(p); });
        html += '</div>';
      }
      if (colaboradores.length > 0) {
        html += '<div class="about-section-title">' + t('about.colaboradores') + '</div><div class="about-cards">';
        colaboradores.forEach((p, i) => { html += cardHtml(p, i); });
        html += '</div>';
      }
      if (!equipe.length && !colaboradores.length) {
        html += '<p class="text-muted">Nenhum perfil publicado ainda.</p>';
      }
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = '<p>Erro ao carregar.</p>';
    }
  }

  async function logout() {
    _flushLogs();

    // Unlock cell before invalidating the token
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

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: authHeaders()
      });
    } catch (e) { /* ignore */ }

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
    if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.refreshPolyStyles) {
      LeucenaDrawing.refreshPolyStyles();
    }
    if (typeof LeucenaMap !== 'undefined' && LeucenaMap.updateFilterCounts) {
      LeucenaMap.updateFilterCounts();
    }

    _userAuthInfo = {};
    window._rankingData = null;
    const vBanner = document.getElementById('verification-banner');
    if (vBanner) vBanner.classList.add('hidden');
    const mBanner = document.getElementById('migration-banner');
    if (mBanner) mBanner.classList.add('hidden');
    loadRankingWidget();

    showToast(LeucenaI18n.t('auth.disconnected'), 'info');
  }

  // ── Sidebar ──

  function isEditing() {
    return selectedCellData && selectedCellData.locked_by && selectedCellData.locked_by === username;
  }

  function toggleSidebar() {
    const main = document.getElementById('main-content');
    const isOpen = main.classList.toggle('sidebar-open');
    logEvent(isOpen ? 'sidebar_open' : 'sidebar_close');
    updateToggleArrow(isOpen);
    updateLegendVisibility(isOpen);
    if (!isOpen && !isEditing()) {
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
    const collapsed = document.getElementById('map-legend').classList.toggle('collapsed');
    logEvent(collapsed ? 'legend_collapse' : 'legend_expand');
  }

  function collapseLegendOnFirstZoom() {
    if (legendUserControlled) return;
    legendUserControlled = true;
    document.getElementById('map-legend').classList.add('collapsed');
  }

  function updateLegendVisibility(sidebarOpen) {
    const legend = document.getElementById('map-legend');
    const locBtn = document.getElementById('btn-my-location');
    // Sidebar should not hide legend/location; legend is shifted via CSS when sidebar is open.
    if (legend) legend.classList.remove('legend-hidden');
    if (locBtn) locBtn.classList.remove('legend-hidden');
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
    logEvent('cell_select', cellId, null, { status: cellData ? cellData.grid_status : null });

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
    const editBadge = document.getElementById('edit-mode-badge');
    if (editBadge && !editBadge.classList.contains('hidden')) {
      infoEl.classList.add('hidden');
    } else {
      infoEl.classList.remove('hidden');
      infoEl.textContent = t('edit.cellInfo', displayId, formatStatus(cellData.grid_status));
    }

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
    if (lockHeartbeatInterval) { clearInterval(lockHeartbeatInterval); lockHeartbeatInterval = null; }
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
    const unlockBtn = document.getElementById('tool-unlock');
    if (enabled) {
      editPanel.classList.remove('hidden');
      unlockBtn.classList.remove('hidden');
      applyRoleRestrictions();
    } else {
      editPanel.classList.add('hidden');
      unlockBtn.classList.add('hidden');
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
    logEvent('unlock_modal_open', selectedCellId);
    document.getElementById('unlock-error').classList.add('hidden');

    const finBtn = document.getElementById('unlock-finished');
    const notice = document.getElementById('unlock-crowdmapping-notice');
    const isContributor = getEffectiveRole() === 'contributor';
    const hasCrowd = isContributor && LeucenaMap.cellHasCrowdmapping(selectedCellId);

    finBtn.classList.toggle('hidden', hasCrowd);
    notice.classList.toggle('hidden', !hasCrowd);

    document.getElementById('unlock-modal').classList.remove('hidden');
  }

  function closeUnlockModal() {
    document.getElementById('unlock-modal').classList.add('hidden');
    if (pendingUncoveredPointIds && pendingUncoveredPointIds.length > 0) {
      LeucenaMap.selectPointsPreview(pendingUncoveredPointIds);
      pendingUncoveredPointIds = null;
    }
  }

  async function confirmUnlock(status) {
    if (!selectedCellId) return;
    logEvent('cell_unlock_confirm', selectedCellId, null, { status: status });
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
        if (err.uncoveredPointIds && err.uncoveredPointIds.length > 0) {
          pendingUncoveredPointIds = err.uncoveredPointIds;
        }
        return;
      }
      const data = await res.json();
      const finalStatus = data.status || status;
      closeUnlockModal();

      if (selectedCellData) {
        selectedCellData.locked_by = null;
        selectedCellData.grid_status = finalStatus;
        if (finalStatus === 'finished') selectedCellData.finished_by = username;
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
      LeucenaDrawing.setAreaLabelsVisible(false);
      LeucenaDrawing.deactivate();
      if (typeof LeucenaMap !== 'undefined' && LeucenaMap.updateAreaLabelsForZoom) LeucenaMap.updateAreaLabelsForZoom();

      if (selectedCellData) {
        document.getElementById('cell-status-display').textContent = formatStatus(finalStatus);
        if (finalStatus === 'finished') {
          document.getElementById('cell-finished-by').textContent = username;
        }
      }

      const displayId = selectedCellData ? (selectedCellData.grid_id || cellId) : cellId;
      let msg = LeucenaI18n.t('toast.cellUnlocked', displayId, formatStatus(finalStatus));

      if (data.maskCount > 0) {
        const areaHa = data.areaHa || 0;
        let areaStr;
        if (areaHa < 0.1) {
          const m2 = Math.round(areaHa * 10000);
          areaStr = m2.toLocaleString() + ' m²';
        } else {
          areaStr = areaHa.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' ha';
        }
        msg += ` — ${data.maskCount} ${data.maskCount === 1 ? 'máscara' : 'máscaras'}, ${areaStr}`;
      }

      showToast(msg, 'success', 6000);
    } catch (e) {
      showToast(LeucenaI18n.t('toast.unlockFail'), 'error');
    }
  }

  async function lockCell(cellId) {
    if (!isEmailVerified()) {
      showToast(LeucenaI18n.t('auth.emailNotVerifiedAction'), 'error');
      return;
    }
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
      selectedCellData.grid_status = 'in_use';
      if (result.worked_by) selectedCellData.worked_by = result.worked_by;

      selectCell(cellId, selectedCellData);
      LeucenaMap.updateCellAppearance(cellId, selectedCellData);
      LeucenaMap.zoomToCell(cellId);
      LeucenaCollab.notifyEditingCell(cellId);

      document.getElementById('main-content').classList.remove('sidebar-open');
      updateToggleArrow(false);
      updateLegendVisibility(false);

      document.getElementById('selected-cell-info').classList.add('hidden');

      const badge = document.getElementById('edit-mode-badge');
      const displayId = selectedCellData.grid_id || cellId;
      document.getElementById('edit-mode-text').textContent = LeucenaI18n.t('edit.badge', displayId);
      badge.classList.remove('hidden');

      showToast(LeucenaI18n.t('toast.cellLocked', displayId), 'success');
      if (typeof LeucenaMap !== 'undefined' && LeucenaMap.updateAreaLabelsForZoom) LeucenaMap.updateAreaLabelsForZoom();

      if (lockHeartbeatInterval) clearInterval(lockHeartbeatInterval);
      lockHeartbeatInterval = setInterval(() => {
        if (selectedCellId) {
          fetch(`/api/grid/${selectedCellId}/heartbeat`, { method: 'POST', headers: authHeaders() }).catch(() => {});
        }
      }, 2 * 60 * 1000);
    } catch (e) {
      showToast(LeucenaI18n.t('toast.lockFail'), 'error');
    }
  }

  function handleHomeClick() {
    logEvent('home_click', selectedCellId);
    if (selectedCellData && selectedCellData.locked_by === username && selectedCellId) {
      LeucenaMap.zoomToCell(selectedCellId);
    } else {
      LeucenaMap.zoomToInitialView();
    }
  }

  let _locationMarker = null;
  function handleMyLocation() {
    if (!navigator.geolocation) {
      showToast(LeucenaI18n.t('map.geoNotSupported'), 'error');
      return;
    }
    const btn = document.getElementById('btn-my-location');
    btn.classList.add('locating');

    logEvent('geolocation_click');

    function onSuccess(pos) {
      btn.classList.remove('locating');
      const gMap = LeucenaMap.getMap();
      if (!gMap) return;
      const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const isMobile = window.innerWidth <= 768;
      gMap.setCenter(latlng);
      gMap.setZoom(isMobile ? 13 : 12);
      logEvent('geolocation_success', null, null, { lat: latlng.lat, lng: latlng.lng, accuracy: pos.coords.accuracy });
      if (_locationMarker) _locationMarker.setMap(null);
      _locationMarker = new google.maps.Marker({
        position: latlng,
        map: gMap,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3b82f6',
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2.5
        },
        title: LeucenaI18n.t('map.youAreHere'),
        zIndex: 9999
      });
      setTimeout(() => { if (_locationMarker) _locationMarker.setMap(null); _locationMarker = null; }, 30000);
    }

    function onError(err) {
      btn.classList.remove('locating');
      var reason = err.code === 1 ? 'permission_denied' : err.code === 2 ? 'position_unavailable' : 'timeout';
      logEvent('geolocation_error', null, null, { reason: reason, code: err.code });
      if (err.code === 1) {
        showToast(LeucenaI18n.t('map.geoDenied'), 'error');
      } else {
        showToast(LeucenaI18n.t('map.geoError'), 'error');
      }
    }

    navigator.geolocation.getCurrentPosition(onSuccess, function(err) {
      if (err.code === 2 || err.code === 3) {
        navigator.geolocation.getCurrentPosition(onSuccess, onError,
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
      } else {
        onError(err);
      }
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
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
      if (!isLoggedIn() || !isTeamOrAbove()) { deleteCb.checked = false; return; }
      if (deleteCb.checked) {
        setInsertionMode(false);
        setDeletionMode(true);
      } else {
        setDeletionMode(false);
      }
    });

    // Point modes: L / Ctrl+Z here; Shift+C/V/E etc. live in drawing.js (gated by cell lock + not typing in inputs).
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
    if (isTeamOrAbove()) {
      document.getElementById('insertion-sep').classList.remove('hidden');
      document.getElementById('insertion-toggle').classList.remove('hidden');
      document.getElementById('deletion-toggle').classList.remove('hidden');
    }
    if (isAdminUser()) {
      document.getElementById('admin-users-btn').classList.remove('hidden');
      loadViewCount();
      
      const maskSub = document.getElementById('mask-subcategories');
      if (maskSub) maskSub.classList.remove('hidden');
      
      const legendDefault = document.getElementById('legend-mask-default');
      if (legendDefault) legendDefault.classList.add('hidden');
      
      const legendMember = document.getElementById('legend-mask-member');
      if (legendMember) legendMember.classList.remove('hidden');
      
      const legendContrib = document.getElementById('legend-mask-contributor');
      if (legendContrib) legendContrib.classList.remove('hidden');
    }
    applyRoleRestrictions();
  }
  
  function hideAdminTools() {
    document.getElementById('insertion-sep').classList.add('hidden');
    document.getElementById('insertion-toggle').classList.add('hidden');
    document.getElementById('deletion-toggle').classList.add('hidden');
    document.getElementById('admin-users-btn').classList.add('hidden');
    document.getElementById('view-counter').classList.add('hidden');
    
    const maskSub = document.getElementById('mask-subcategories');
    if (maskSub) maskSub.classList.add('hidden');
    
    const legendDefault = document.getElementById('legend-mask-default');
    if (legendDefault) legendDefault.classList.remove('hidden');
    
    const legendMember = document.getElementById('legend-mask-member');
    if (legendMember) legendMember.classList.add('hidden');
    
    const legendContrib = document.getElementById('legend-mask-contributor');
    if (legendContrib) legendContrib.classList.add('hidden');

    if (insertionMode) setInsertionMode(false);
    if (deletionMode) setDeletionMode(false);
    userRole = 'contributor';
    testerMode = 'contributor';
  }

  // ── View counter ──

  function trackPageView() {
    fetch('/api/stats/view', { method: 'POST' }).catch(() => {});
  }

  async function loadViewCount() {
    try {
      const res = await fetch('/api/stats/views', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        document.getElementById('view-count').textContent = data.views;
        document.getElementById('view-counter').classList.remove('hidden');
      }
    } catch (e) { /* ignore */ }
  }

  // ── Admin user management ──
  // User CRUD + role hierarchy: superadmin-only affordances for admin-tier users and privileged actions.

  function fallbackCopy(text) { // execCommand copy path when navigator.clipboard is missing or blocked (e.g. non-HTTPS).
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  function formatDuration(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${totalSec}s`;
  }

  function closeDebugModal() {
    document.getElementById('debug-modal').classList.add('hidden');
    const vc = document.getElementById('view-counter');
    if (vc) vc.classList.remove('view-counter-modal-open');
  }

  function escDebugHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderDebugRows(rows) {
    const body = document.getElementById('debug-info-body');
    body.innerHTML = rows.map(r => {
      const v = String(r.val);
      return `<div class="debug-row${r.section ? ' debug-section' : ''}">
        <span class="debug-key">${escDebugHtml(r.key)}:</span>
        <span class="debug-val">${escDebugHtml(v)}</span>
        <button type="button" class="debug-copy-btn" data-copy="${escDebugHtml(v)}" title="Copiar">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        </button>
      </div>`;
    }).join('');
    body.querySelectorAll('.debug-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-copy');
        try {
          if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(val).then(() => showToast('Copiado!', 'success', 1500)).catch(() => { fallbackCopy(val); showToast('Copiado!', 'success', 1500); });
          } else { fallbackCopy(val); showToast('Copiado!', 'success', 1500); }
        } catch (_) { fallbackCopy(val); showToast('Copiado!', 'success', 1500); }
      });
    });
  }

  function openDebugModal() {
    logEvent('debug_modal_open');
    const map = LeucenaMap.getMap();
    const viewsEl = document.getElementById('view-count');
    const viewsVal = viewsEl ? viewsEl.textContent.trim() : '—';

    const rows = [
      { key: LeucenaI18n.t('debug.siteViews'), val: viewsVal },
    ];

    if (map) {
      const bounds = map.getBounds();
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const center = map.getCenter();
      const mapType = map.getMapTypeId();
      const polyCount = (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.getPolygonCount) ? LeucenaDrawing.getPolygonCount() : '—';
      rows.push(
        { key: 'Zoom', val: map.getZoom() },
        { key: 'Center', val: `${center.lat().toFixed(6)}, ${center.lng().toFixed(6)}` },
        { key: 'Top-Left (NW)', val: `${ne.lat().toFixed(6)}, ${sw.lng().toFixed(6)}` },
        { key: 'Bottom-Right (SE)', val: `${sw.lat().toFixed(6)}, ${ne.lng().toFixed(6)}` },
        { key: 'Bbox (W,S,E,N)', val: `${sw.lng().toFixed(6)}, ${sw.lat().toFixed(6)}, ${ne.lng().toFixed(6)}, ${ne.lat().toFixed(6)}` },
        { key: 'Map Type', val: mapType },
        { key: 'Viewport (px)', val: `${map.getDiv().offsetWidth} × ${map.getDiv().offsetHeight}` },
        { key: 'Polígonos', val: polyCount },
        { key: 'Célula', val: selectedCellId || '—' },
        { key: 'Usuário', val: username || '—' },
        { key: 'Role', val: userRole || '—' },
      );
    } else {
      rows.push(
        { key: 'Mapa', val: LeucenaI18n.t('debug.mapNotReady') },
        { key: 'Célula', val: selectedCellId || '—' },
        { key: 'Usuário', val: username || '—' },
        { key: 'Role', val: userRole || '—' },
      );
    }

    renderDebugRows(rows);
    const vc = document.getElementById('view-counter');
    if (vc) vc.classList.add('view-counter-modal-open');
    document.getElementById('debug-modal').classList.remove('hidden');

    if (isAdminUser()) {
      fetch('/api/stats/platform', { headers: authHeaders() })
        .then(r => r.ok ? r.json() : null)
        .then(stats => {
          if (!stats) return;
          const fmt = n => (n || 0).toLocaleString();
          const extra = [
            { key: '── Acessos ──', val: '', section: true },
            { key: 'Total', val: fmt(stats.views.total) },
            { key: 'Desktop', val: fmt(stats.views.desktop) },
            { key: 'Mobile', val: fmt(stats.views.mobile) },
            { key: '── Logins ──', val: '', section: true },
            { key: 'Desktop', val: fmt(stats.logins.desktop) },
            { key: 'Mobile', val: fmt(stats.logins.mobile) },
            { key: '── Máscaras criadas ──', val: '', section: true },
            { key: 'Total', val: fmt(stats.masks_created.total) },
            { key: 'Desktop', val: fmt(stats.masks_created.desktop) },
            { key: 'Mobile', val: fmt(stats.masks_created.mobile) },
          ];
          renderDebugRows(rows.concat(extra));
        })
        .catch(() => {});
    }
  }

  async function openAdminUsersModal() {
    if (!isAdminUser()) return;
    logEvent('admin_users_open');
    const t = LeucenaI18n.t;
    const modal = document.getElementById('admin-users-modal');
    modal.classList.remove('hidden');

    try {
      const res = await fetch('/api/admin/users', { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const callerIsSuperAdmin = data.callerRole === 'superadmin';

      const isMember = u => ['superadmin','admin','team'].includes(u.role);
      const isCollab = u => !isMember(u);
      const members = data.users.filter(isMember);
      const collabs = data.users.filter(isCollab);
      const memberMasks = members.reduce((s, u) => s + (u.mask_count || 0), 0);
      const collabMasks = collabs.reduce((s, u) => s + (u.mask_count || 0), 0);
      const memberArea = members.reduce((s, u) => s + (u.mask_area_ha || 0), 0);
      const collabArea = collabs.reduce((s, u) => s + (u.mask_area_ha || 0), 0);
      const fmtArea = v => v.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});

      const metricsEl = document.getElementById('admin-global-metrics');
      metricsEl.innerHTML = `
        <div class="admin-metric">
          <span class="admin-metric-value">${data.users.length}</span>
          <span class="admin-metric-label">${t('admin.totalUsers')}</span>
          <span class="admin-metric-sub">${members.length} ${t('admin.members')}</span>
          <span class="admin-metric-sub">${collabs.length} ${t('admin.collaborators')}</span>
        </div>
        <div class="admin-metric">
          <span class="admin-metric-value">${data.globalMasks.toLocaleString()}</span>
          <span class="admin-metric-label">${t('admin.totalMasks')}</span>
          <span class="admin-metric-sub">${memberMasks.toLocaleString()} ${t('admin.members')}</span>
          <span class="admin-metric-sub">${collabMasks.toLocaleString()} ${t('admin.collaborators')}</span>
        </div>
        <div class="admin-metric">
          <span class="admin-metric-value">${fmtArea(data.globalAreaHa)} ha</span>
          <span class="admin-metric-label">${t('admin.totalArea')}</span>
          <span class="admin-metric-sub">${fmtArea(memberArea)} ha ${t('admin.members')}</span>
          <span class="admin-metric-sub">${fmtArea(collabArea)} ha ${t('admin.collaborators')}</span>
        </div>`;

      // Superadmin can toggle to see the panel as a regular admin would
      const viewToggleEl = document.getElementById('admin-view-toggle');
      if (data.callerRole === 'superadmin') {
        viewToggleEl.classList.remove('hidden');
        const cb = document.getElementById('admin-view-as-admin-cb');
        cb.checked = _adminViewMode;
        cb.onchange = () => { _adminViewMode = cb.checked; openAdminUsersModal(); };
      } else {
        viewToggleEl.classList.add('hidden');
      }
      const effectiveSuperAdmin = callerIsSuperAdmin && !_adminViewMode;

      const listEl = document.getElementById('admin-users-list');
      listEl.innerHTML = '';

      const toolsGrid = document.createElement('div');
      toolsGrid.className = 'admin-tools-grid';

      let gridHtml = '';

      // Section: Logs & Export
      gridHtml += `<div class="admin-tools-section">
        <div class="admin-tools-label">${t('admin.sectionLogs')}</div>
        <div class="admin-tools-buttons">
          <button id="admin-export-csv" class="admin-tool-btn admin-tool-secondary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> ${t('admin.exportCsv')}</button>
          <button id="admin-export-logs" class="admin-tool-btn admin-tool-secondary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> ${t('admin.exportLogs')}</button>
          <button id="admin-copy-recent-logs" class="admin-tool-btn admin-tool-ghost"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> ${t('admin.copyRecentLogs')}</button>
        </div>
      </div>`;

      if (effectiveSuperAdmin) {
        // Section: Users & Data
        gridHtml += `<div class="admin-tools-section">
          <div class="admin-tools-label">${t('admin.sectionData')}</div>
          <div class="admin-tools-buttons">
            <button id="admin-create-user-btn" class="admin-tool-btn admin-tool-primary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> ${t('admin.createUser')}</button>
            <button id="admin-import-points-btn" class="admin-tool-btn admin-tool-primary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> ${t('admin.importPoints')}</button>
            <button id="admin-backup-db" class="admin-tool-btn admin-tool-secondary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> ${t('admin.backupDb')}</button>
          </div>
        </div>`;

        // Section: Maintenance
        gridHtml += `<div class="admin-tools-section">
          <div class="admin-tools-label">${t('admin.sectionMaintenance')}</div>
          <div class="admin-tools-buttons">
            <button id="admin-dedup-btn" class="admin-tool-btn admin-tool-danger"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg> ${t('admin.dedupBtn')}</button>
          </div>
        </div>`;
      }

      toolsGrid.innerHTML = gridHtml;
      listEl.appendChild(toolsGrid);
      document.getElementById('admin-export-csv').addEventListener('click', async () => {
        try {
          const r = await fetch('/api/admin/users/export-csv', { headers: authHeaders() });
          if (!r.ok) { showToast('Export failed', 'error'); return; }
          const blob = await r.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'leucena_users_stats.csv';
          a.click();
          URL.revokeObjectURL(url);
        } catch (e) { showToast('Export failed', 'error'); }
      });
      document.getElementById('admin-export-logs').addEventListener('click', async () => {
        try {
          const r = await fetch('/api/admin/logs?format=csv', { headers: authHeaders() });
          if (!r.ok) { showToast('Export failed', 'error'); return; }
          const blob = await r.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'activity_logs_48h.csv';
          a.click();
          URL.revokeObjectURL(url);
        } catch (e) { showToast('Export failed', 'error'); }
      });
      document.getElementById('admin-copy-recent-logs').addEventListener('click', async () => {
        try {
          const r = await fetch('/api/admin/logs?minutes=5', { headers: authHeaders() });
          if (!r.ok) { showToast('Export failed', 'error'); return; }
          const logs = await r.json();
          if (logs.length === 0) { showToast(t('admin.noRecentLogs'), 'info'); return; }
          const text = logs.map(l => {
            let line = `[${l.timestamp}] ${l.username || '?'} — ${l.action}`;
            if (l.cell_id) line += ` | cell:${l.cell_id}`;
            if (l.object_id) line += ` | obj:${l.object_id}`;
            if (l.details) { try { line += ` | ${l.details}`; } catch (_) {} }
            return line;
          }).join('\n');
          try {
            if (navigator.clipboard && window.isSecureContext) {
              await navigator.clipboard.writeText(text);
            } else { fallbackCopy(text); }
          } catch (_) { fallbackCopy(text); }
          showToast(t('admin.logsCopied'), 'success');
        } catch (e) { showToast('Erro ao copiar logs', 'error'); }
      });

      const backupBtn = document.getElementById('admin-backup-db');
      if (backupBtn) {
        backupBtn.addEventListener('click', async () => {
          try {
            const r = await fetch('/api/admin/backup', { headers: authHeaders() });
            if (!r.ok) { showToast('Backup failed', 'error'); return; }
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `leucena_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
            a.click();
            URL.revokeObjectURL(url);
            showToast(t('admin.backupDone'), 'success');
          } catch (e) { showToast('Backup failed', 'error'); }
        });
      }

      const importPointsBtn = document.getElementById('admin-import-points-btn');
      if (importPointsBtn) {
        const fileInput = document.getElementById('admin-import-geojson-input');
        importPointsBtn.addEventListener('click', () => {
          fileInput.value = '';
          fileInput.click();
        });
        // GeoJSON import: validate FeatureCollection, POST features batch, toast imported / duplicate / skipped counts.
        fileInput.addEventListener('change', async () => {
          const file = fileInput.files[0];
          if (!file) return;

          if (file.size > 20 * 1024 * 1024) {
            showToast(t('admin.importFileTooLarge'), 'error');
            return;
          }

          try {
            const text = await file.text();
            let geojson;
            try {
              geojson = JSON.parse(text);
            } catch (e) {
              showToast(t('admin.importInvalidJson'), 'error');
              return;
            }

            if (!geojson || geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
              showToast(t('admin.importNotFeatureCollection'), 'error');
              return;
            }

            const count = geojson.features.length;
            if (count === 0) {
              showToast(t('admin.importEmpty'), 'warning');
              return;
            }

            if (!confirm(t('admin.importConfirm', count))) return;

            showToast(t('admin.importUploading'), 'info', 10000);

            const r = await fetch('/api/admin/points/import', {
              method: 'POST',
              headers: authHeaders(),
              body: JSON.stringify(geojson)
            });
            const data = await r.json();
            if (!r.ok) {
              showToast(data.error || 'Erro na importação', 'error', 8000);
              return;
            }

            if (data.imported > 0) {
              showToast(t('admin.importSuccess', data.imported), 'success', 6000);
            }
            if (data.duplicates > 0) {
              showToast(t('admin.importDuplicates', data.duplicates), 'warning', 6000);
            }
            if (data.skipped > 0) {
              showToast(t('admin.importSkippedMsg', data.skipped), 'error', 6000);
            }
            if (data.imported === 0 && data.duplicates > 0) {
              showToast(t('admin.importAllDuplicates'), 'warning', 6000);
            }

          } catch (e) {
            showToast('Erro ao ler arquivo', 'error');
          }
        });
      }

      // Dedup button: preview → confirm modal → execute → undo toast
      const dedupBtn = document.getElementById('admin-dedup-btn');
      if (dedupBtn) {
        dedupBtn.addEventListener('click', async () => {
          dedupBtn.disabled = true;
          dedupBtn.textContent = `⏳ ${t('admin.dedupScanning')}`;
          try {
            const r = await fetch('/api/admin/points/duplicates/preview', { headers: authHeaders() });
            if (!r.ok) { showToast('Error', 'error'); return; }
            const data = await r.json();
            if (data.duplicate_count === 0) {
              showToast(t('admin.dedupNone'), 'success');
              return;
            }
            const modal = document.getElementById('dedup-modal');
            document.getElementById('dedup-modal-text').textContent = t('admin.dedupConfirm', data.duplicate_count);
            const confirmBtn = document.getElementById('dedup-modal-confirm');
            confirmBtn.disabled = false;
            confirmBtn.textContent = t('admin.dedupModalConfirm');
            modal.classList.remove('hidden');

            const onConfirm = async () => {
              confirmBtn.removeEventListener('click', onConfirm);
              cancelBtn.removeEventListener('click', onCancel);
              confirmBtn.disabled = true;
              confirmBtn.textContent = `⏳ ${t('admin.dedupRemoving')}`;
              try {
                const res = await fetch('/api/admin/points/duplicates/remove', { method: 'POST', headers: authHeaders() });
                const result = await res.json();
                modal.classList.add('hidden');
                if (res.ok && result.removed > 0) {
                  showToast(t('admin.dedupSuccess', result.removed), 'success', 10000);
                  showDedupUndoToast(result.removed);
                } else if (res.ok && result.removed === 0) {
                  showToast(t('admin.dedupNone'), 'info');
                } else {
                  showToast(result.error || t('admin.dedupFail'), 'error');
                }
              } catch (e) {
                modal.classList.add('hidden');
                showToast(t('admin.dedupFail'), 'error');
              }
            };
            const cancelBtn = document.getElementById('dedup-modal-cancel');
            const onCancel = () => {
              confirmBtn.removeEventListener('click', onConfirm);
              cancelBtn.removeEventListener('click', onCancel);
              modal.classList.add('hidden');
            };
            confirmBtn.addEventListener('click', onConfirm);
            cancelBtn.addEventListener('click', onCancel);
            document.getElementById('dedup-modal-close').onclick = onCancel;
          } catch (e) {
            showToast(t('admin.dedupFail'), 'error');
          } finally {
            dedupBtn.disabled = false;
            dedupBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg> ${t('admin.dedupBtn')}`;
          }
        });
      }

      function showDedupUndoToast(count) {
        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:12px 20px;border-radius:10px;display:flex;align-items:center;gap:12px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3);font-size:14px;';
        container.innerHTML = `<span>${t('admin.dedupSuccess', count)}</span>`;
        const undoBtn = document.createElement('button');
        undoBtn.textContent = `↩ ${t('admin.dedupUndo')}`;
        undoBtn.style.cssText = 'background:#3b82f6;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;';
        undoBtn.addEventListener('click', async () => {
          undoBtn.disabled = true;
          undoBtn.textContent = '⏳';
          try {
            const res = await fetch('/api/admin/points/duplicates/undo', { method: 'POST', headers: authHeaders() });
            const result = await res.json();
            if (res.ok && result.restored > 0) {
              showToast(t('admin.dedupUndoSuccess', result.restored), 'success', 6000);
            } else {
              showToast(result.error || t('admin.dedupUndoFail'), 'error');
            }
          } catch (e) {
            showToast(t('admin.dedupUndoFail'), 'error');
          }
          container.remove();
        });
        container.appendChild(undoBtn);
        document.body.appendChild(container);
        setTimeout(() => { if (container.parentNode) container.remove(); }, 30000);
      }

      const createUserBtn = document.getElementById('admin-create-user-btn');
      if (createUserBtn) {
        createUserBtn.addEventListener('click', () => {
          const section = document.getElementById('admin-create-user');
          section.classList.toggle('hidden');
          if (!section.classList.contains('hidden')) {
            document.getElementById('admin-create-username').value = '';
            document.getElementById('admin-create-email').value = '';
            document.getElementById('admin-create-password').value = '';
            document.getElementById('admin-create-error').classList.add('hidden');
            document.getElementById('admin-create-username').focus();
          }
        });
      }

      const createUsernameInput = document.getElementById('admin-create-username');
      createUsernameInput.addEventListener('input', () => {
        createUsernameInput.value = createUsernameInput.value
          .toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9.]/g, '');
      });

      document.getElementById('admin-create-submit').addEventListener('click', async () => {
        const u = document.getElementById('admin-create-username').value.trim();
        const e = document.getElementById('admin-create-email').value.trim();
        const p = document.getElementById('admin-create-password').value;
        const errEl = document.getElementById('admin-create-error');
        errEl.classList.add('hidden');

        if (!u || !e || !p) {
          errEl.textContent = t('admin.createUserAllFields');
          errEl.classList.remove('hidden');
          return;
        }

        try {
          const r = await fetch('/api/admin/users/create', {
            method: 'POST', headers: authHeaders(),
            body: JSON.stringify({ username: u, email: e, password: p })
          });
          const data = await r.json();
          if (!r.ok) {
            errEl.textContent = data.error;
            errEl.classList.remove('hidden');
            return;
          }
          document.getElementById('admin-create-user').classList.add('hidden');
          showToast(t('admin.createUserSuccess', u), 'success');
          openAdminUsersModal();
        } catch (err) {
          errEl.textContent = 'Erro de conexão';
          errEl.classList.remove('hidden');
        }
      });

      document.getElementById('admin-create-cancel').addEventListener('click', () => {
        document.getElementById('admin-create-user').classList.add('hidden');
      });

      const roleLabelMap = { superadmin: 'Super Admin', admin: 'Admin', team: 'Membro', contributor: 'Colaborador', tester: 'Tester' };
      const allRoles = ['superadmin', 'admin', 'team', 'contributor', 'tester'];

      const onlineSet = new Set(data.onlineUsers || []);

      function formatLastActive(isoDate, username) {
        if (onlineSet.has(username)) return `<span class="admin-active-now">● ${t('admin.activeNow')}</span>`;
        if (!isoDate) return t('admin.never');
        const diff = Date.now() - new Date(isoDate).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return `<span class="admin-active-now">● ${t('admin.activeNow')}</span>`;
        if (mins < 60) return t('admin.minutesAgo', mins);
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return t('admin.hoursAgo', hrs);
        const days = Math.floor(hrs / 24);
        return t('admin.daysAgo', days);
      }

      for (const user of data.users) {
        const role = user.role || 'contributor';
        const totalMs = user.total_time_ms || 0;
        const timeStr = formatDuration(totalMs);
        const isOnline = onlineSet.has(user.username);
        const row = document.createElement('div');
        row.className = 'admin-user-card' + (isOnline ? ' admin-user-online' : '');

        let roleSelectHtml = '';
        let founderCheckboxHtml = '';
        if (effectiveSuperAdmin) {
          roleSelectHtml = `<select class="admin-role-select" data-user-id="${user.id}">${allRoles.map(r => `<option value="${r}"${role === r ? ' selected' : ''}>${roleLabelMap[r]}</option>`).join('')}</select>`;
          if (role === 'superadmin' || role === 'admin' || role === 'team') {
            const isFounder = user.is_founder ? 'checked' : '';
            founderCheckboxHtml = `<label class="admin-founder-label"><input type="checkbox" class="admin-founder-cb" ${isFounder}> Idealizador</label>`;
          }
        }
        let testerRadioHtml = '';
        if (role === 'tester') {
          const tm = user.tester_mode || 'contributor';
          testerRadioHtml = `<div class="admin-tester-mode">
            <label><input type="radio" name="tester-mode-${user.id}" value="team"${tm === 'team' ? ' checked' : ''}> Membro</label>
            <label><input type="radio" name="tester-mode-${user.id}" value="contributor"${tm === 'contributor' ? ' checked' : ''}> Colaborador</label>
          </div>`;
        }

        const canDelete = effectiveSuperAdmin && role !== 'superadmin';
        const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : '—';
        const lastActiveHtml = formatLastActive(user.last_active, user.username);
        const initial = user.username.charAt(0).toUpperCase();
        const photoHtml = user.photo
          ? `<img src="${user.photo}" class="admin-card-photo" alt="">`
          : `<div class="admin-card-avatar">${initial}</div>`;

        row.innerHTML = `
          <div class="admin-card-header">
            ${photoHtml}
            <div class="admin-card-identity">
              <div class="admin-card-name-row">
                ${founderCheckboxHtml}
                <span class="admin-user-name">${user.username}</span>
                ${isOnline ? '<span class="admin-online-dot"></span>' : ''}
                <span class="admin-user-badge admin-role-${role}">${roleLabelMap[role]}</span>
                ${roleSelectHtml}
              </div>
              <div class="admin-card-meta">
                ${user.full_name ? `<span class="admin-card-fullname">${user.full_name}</span>` : ''}
                ${user.email ? `<span class="admin-user-email">${user.email}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="admin-card-stats">
            <div class="admin-card-stat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>${user.mask_count || 0} ${t('admin.masks')}</span>
            </div>
            <div class="admin-card-stat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
              <span>${(user.mask_area_ha || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ha</span>
            </div>
            <div class="admin-card-stat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              <span>${user.login_count || 0} logins</span>
            </div>
            <div class="admin-card-stat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>${timeStr}</span>
            </div>
          </div>
          <div class="admin-card-footer">
            <div class="admin-card-dates">
              <span>${t('admin.createdAt')}: ${createdDate}</span>
              <span>${t('admin.lastAccess')}: ${lastActiveHtml}</span>
            </div>
            ${testerRadioHtml}
            <div class="admin-user-actions">
              <button class="admin-profile-btn">${t('admin.editProfile')}</button>
              <button class="admin-pw-btn">${t('admin.changePassword')}</button>
              
              ${effectiveSuperAdmin ? `<button class="admin-rename-btn">${t('admin.renameUser')}</button>` : ''}
              ${canDelete ? `<button class="admin-del-btn btn-danger-sm">${t('admin.deleteUser')}</button>` : ''}
            </div>
          </div>
        `;

        const roleSelect = row.querySelector('.admin-role-select');
        if (roleSelect) {
          roleSelect.addEventListener('change', async () => {
            const newRole = roleSelect.value;
            try {
              const r = await fetch(`/api/admin/users/${user.id}/role`, {
                method: 'PUT', headers: authHeaders(), body: JSON.stringify({ role: newRole })
              });
              if (r.ok) {
                showToast('Role atualizado', 'success');
                openAdminUsersModal();
              } else { const err = await r.json(); showToast(err.error, 'error'); roleSelect.value = role; }
            } catch (e) { showToast('Erro de conexão', 'error'); roleSelect.value = role; }
          });
        }

        const testerRadios = row.querySelectorAll('input[name="tester-mode-' + user.id + '"]');
        testerRadios.forEach(radio => {
          radio.addEventListener('change', async () => {
            try {
              const r = await fetch(`/api/admin/users/${user.id}/tester-mode`, {
                method: 'PUT', headers: authHeaders(), body: JSON.stringify({ tester_mode: radio.value })
              });
              if (r.ok) showToast('Modo tester atualizado', 'success');
              else { const err = await r.json(); showToast(err.error, 'error'); }
            } catch (e) { showToast('Erro de conexão', 'error'); }
          });
        });

        const founderCb = row.querySelector('.admin-founder-cb');
        if (founderCb) {
          founderCb.addEventListener('change', async () => {
            try {
              const r = await fetch(`/api/admin/users/${user.id}/founder`, {
                method: 'PUT', headers: authHeaders(), body: JSON.stringify({ is_founder: founderCb.checked })
              });
              if (r.ok) showToast('Idealizador atualizado', 'success');
              else { const err = await r.json(); showToast(err.error, 'error'); founderCb.checked = !founderCb.checked; }
            } catch (e) { showToast('Erro de conexão', 'error'); founderCb.checked = !founderCb.checked; }
          });
        }

        const profileBtn = row.querySelector('.admin-profile-btn');
        profileBtn.addEventListener('click', () => {
          closeAdminUsersModal();
          openProfileModal({
            id: user.id,
            username: user.username,
            full_name: user.full_name || '',
            description: user.description || '',
            photo: user.photo || null,
            email: user.email || '',
            linkedin: user.linkedin || '',
            scholar: user.scholar || ''
          });
        });

        const pwBtn = row.querySelector('.admin-pw-btn');
        pwBtn.addEventListener('click', () => {
          const modal = document.getElementById('admin-pw-modal');
          const titleEl = document.getElementById('admin-pw-modal-title');
          const input = document.getElementById('admin-pw-modal-input');
          const confirmBtn = document.getElementById('admin-pw-modal-confirm');
          titleEl.textContent = t('admin.changePasswordTitle', user.username);
          input.value = '';
          input.type = 'password';
          const eyeOpen = modal.querySelector('.pw-eye-open');
          const eyeClosed = modal.querySelector('.pw-eye-closed');
          if (eyeOpen) eyeOpen.classList.remove('hidden');
          if (eyeClosed) eyeClosed.classList.add('hidden');
          modal.classList.remove('hidden');
          setTimeout(() => input.focus(), 100);
          const handler = async () => {
            const newPw = input.value;
            if (!newPw || newPw.length < 3) { showToast(LeucenaI18n.t('profile.pwTooShort'), 'warning'); return; }
            const r = await fetch(`/api/admin/users/${user.id}/password`, {
              method: 'PUT', headers: authHeaders(), body: JSON.stringify({ password: newPw })
            });
            if (r.ok) { showToast(t('admin.passwordChanged'), 'success'); }
            else { const err = await r.json(); showToast(err.error, 'error'); }
            modal.classList.add('hidden');
            confirmBtn.removeEventListener('click', handler);
          };
          confirmBtn.onclick = null;
          confirmBtn.addEventListener('click', handler);
        });

        const renameBtn = row.querySelector('.admin-rename-btn');
        if (renameBtn) {
          renameBtn.addEventListener('click', () => {
            const modal = document.getElementById('admin-rename-modal');
            const titleEl = document.getElementById('admin-rename-modal-title');
            const input = document.getElementById('admin-rename-modal-input');
            const confirmBtn = document.getElementById('admin-rename-modal-confirm');
            const errorEl = document.getElementById('admin-rename-modal-error');
            titleEl.textContent = t('admin.renamePrompt', user.username);
            input.value = user.username;
            errorEl.style.display = 'none';
            modal.classList.remove('hidden');
            setTimeout(() => { input.focus(); input.select(); }, 100);
            const handler = async () => {
              const newName = input.value.trim();
              if (!newName || newName === user.username) { modal.classList.add('hidden'); return; }
              if (!/^[a-z0-9.]+$/.test(newName) || !/[a-z]/.test(newName)) {
                errorEl.textContent = 'Use apenas letras minúsculas, números e ponto.';
                errorEl.style.display = 'block';
                return;
              }
              try {
                const r = await fetch(`/api/admin/users/${user.id}/username`, {
                  method: 'PUT', headers: authHeaders(), body: JSON.stringify({ new_username: newName })
                });
                if (r.ok) {
                  modal.classList.add('hidden');
                  showToast(t('admin.renameSuccess', user.username, newName), 'success');
                  openAdminUsersModal();
                } else { const err = await r.json(); errorEl.textContent = err.error; errorEl.style.display = 'block'; }
              } catch (e) { errorEl.textContent = 'Erro de conexão'; errorEl.style.display = 'block'; }
            };
            confirmBtn.onclick = handler;
          });
        }

        const delBtn = row.querySelector('.admin-del-btn');
        if (delBtn) {
          delBtn.addEventListener('click', async () => {
            if (!confirm(t('admin.confirmDelete', user.username))) return;
            const r = await fetch(`/api/admin/users/${user.id}`, {
              method: 'DELETE', headers: authHeaders()
            });
            if (r.ok) {
              showToast(t('admin.userDeleted'), 'success');
              row.remove();
            } else { const err = await r.json(); showToast(err.error, 'error'); }
          });
        }

        listEl.appendChild(row);
      }
    } catch (e) {
      showToast('Failed to load users', 'error');
    }
  }

  function closeAdminUsersModal() {
    document.getElementById('admin-users-modal').classList.add('hidden');
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
      if (e.key === 'l' || e.key === 'L') {
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

  function applyRoleRestrictions() {
  }

  setupPointModes();

  init();

  return {
    getUsername,
    getAuthToken,
    getUserRole,
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
    isEditing,
    isAdminUser,
    isSuperAdmin,
    isTeamOrAbove,
    getEffectiveRole,
    logEvent,
    flushLogs: _flushLogs,
    onPolygonSaved
  };
})();

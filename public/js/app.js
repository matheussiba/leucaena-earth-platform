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

    document.getElementById('guide-btn').addEventListener('click', () => {
      if (!Onboarding.isTourCompleted()) {
        Onboarding.startTour('manual');
      } else {
        openGuideModal();
      }
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
      navigator.clipboard.writeText(text).then(() => showToast('Copiado!', 'success', 2000)).catch(() => showToast(text, 'info', 6000));
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

    document.getElementById('legend-toggle').addEventListener('click', toggleLegend);

    setupAuthForm();
    tryRestoreSession();

    LeucenaI18n.translatePage();

    handleHash();
    window.addEventListener('hashchange', handleHash);
    window.addEventListener('beforeunload', _flushLogs);
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
    LeucenaI18n.translatePage();
    const target = (typeof page === 'string') ? page : 'main';
    showGuidePage(target);
    document.getElementById('guide-modal').classList.remove('hidden');
    if (target === 'about') loadQuemSomosContent();
  }

  function closeGuideModal() {
    document.getElementById('guide-modal').classList.add('hidden');
    setHash('');
  }

  function showGuidePage(page) {
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
    authMode = mode;
    const modal = document.getElementById('auth-modal');
    modal.classList.remove('hidden');

    document.getElementById('auth-error').classList.add('hidden');
    document.getElementById('auth-username').value = '';
    document.getElementById('auth-password').value = '';

    const passcodeGroup = document.getElementById('passcode-group');
    const passcodeInput = document.getElementById('auth-passcode');
    passcodeInput.value = '';
    const emailGroup = document.getElementById('email-group');
    const emailInput = document.getElementById('auth-email');
    emailInput.value = '';
    const usernameHint = document.getElementById('auth-username-hint');

    const t = LeucenaI18n.t;
    const forgotGroup = document.getElementById('auth-forgot-group');
    if (mode === 'login') {
      document.getElementById('auth-modal-title').textContent = t('auth.login');
      document.getElementById('auth-modal-subtitle').textContent = t('auth.loginSubtitle');
      document.getElementById('auth-submit-btn').textContent = t('auth.login');
      document.getElementById('auth-switch-text').textContent = t('auth.noAccount');
      document.getElementById('auth-switch-link').textContent = t('auth.register');
      passcodeGroup.classList.add('hidden');
      passcodeInput.removeAttribute('required');
      emailGroup.classList.add('hidden');
      emailInput.removeAttribute('required');
      usernameHint.classList.add('hidden');
      forgotGroup.classList.remove('hidden');
    } else {
      document.getElementById('auth-modal-title').textContent = t('auth.register');
      document.getElementById('auth-modal-subtitle').textContent = t('auth.registerSubtitle');
      document.getElementById('auth-submit-btn').textContent = t('auth.createAccount');
      document.getElementById('auth-switch-text').textContent = t('auth.hasAccount');
      document.getElementById('auth-switch-link').textContent = t('auth.login');
      passcodeGroup.classList.remove('hidden');
      passcodeInput.setAttribute('required', 'required');
      emailGroup.classList.remove('hidden');
      emailInput.setAttribute('required', 'required');
      usernameHint.classList.remove('hidden');
      forgotGroup.classList.add('hidden');
    }
    document.getElementById('auth-username').focus();
  }

  function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
  }

  function openResetModal() {
    const modal = document.getElementById('reset-modal');
    document.getElementById('reset-error').classList.add('hidden');
    document.getElementById('reset-success').classList.add('hidden');
    document.getElementById('reset-username').value = '';
    document.getElementById('reset-code').value = '';
    document.getElementById('reset-password').value = '';
    modal.classList.remove('hidden');
    document.getElementById('reset-username').focus();
  }

  function closeResetModal() {
    document.getElementById('reset-modal').classList.add('hidden');
  }

  async function handleResetSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('reset-username').value.trim();
    const code = document.getElementById('reset-code').value.trim();
    const password = document.getElementById('reset-password').value;
    const errorEl = document.getElementById('reset-error');
    const successEl = document.getElementById('reset-success');
    errorEl.classList.add('hidden');
    successEl.classList.add('hidden');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, code, password })
      });
      const data = await res.json();
      if (!res.ok) {
        errorEl.textContent = data.error;
        errorEl.classList.remove('hidden');
        return;
      }
      successEl.textContent = LeucenaI18n.t('reset.success');
      successEl.classList.remove('hidden');
      document.getElementById('reset-form').reset();
      setTimeout(() => {
        closeResetModal();
        openAuthModal('login');
      }, 2000);
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
    const payload = { username: user, password: pass };
    if (authMode === 'register') {
      payload.passcode = document.getElementById('auth-passcode').value.trim();
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
        errorEl.textContent = data.error;
        errorEl.classList.remove('hidden');
        return;
      }

      authToken = data.token;
      username = data.username;
      userRole = data.role || 'contributor';
      testerMode = data.tester_mode || 'contributor';
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
        userRole = data.role || 'contributor';
        testerMode = data.tester_mode || 'contributor';
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

    if (selectedCellId && selectedCellData) {
      const canLock = !selectedCellData.locked_by;
      if (canLock) {
        lockCell(selectedCellId);
      } else {
        selectCell(selectedCellId, selectedCellData);
      }
    }
  }

  // ── Onboarding Controller ──
  const WELCOME_VERSION = 'v1_howto_video';
  let _tourStartedFrom = null;
  let _tourStep = 0;
  let _tourSpotlight = null;

  const TOUR_STEPS = [
    { target: '#top-bar',       text: 'tour.step1', position: 'bottom' },
    { target: '#map',           text: 'tour.step2', position: 'center' },
    { target: '#legend-toggle', text: 'tour.step3', position: 'left'   },
    { target: '#guide-btn',     text: 'tour.step4', position: 'bottom' },
    { target: '#login-btn',     text: 'tour.step5', position: 'bottom' },
  ];

  const Onboarding = {
    isTourCompleted()  { return localStorage.getItem('leucena_tour_completed') === 'true'; },
    isWelcomeShown()   { return localStorage.getItem('leucena_welcome_dismissed') === WELCOME_VERSION; },
    setTourCompleted() { localStorage.setItem('leucena_tour_completed', 'true'); },
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
      this._renderStep();
    },

    _renderStep() {
      const t = LeucenaI18n.t;
      const step = TOUR_STEPS[_tourStep];
      const overlay = document.getElementById('tour-overlay');
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
      const pad = 6;

      _tourSpotlight.style.top    = (rect.top - pad) + 'px';
      _tourSpotlight.style.left   = (rect.left - pad) + 'px';
      _tourSpotlight.style.width  = (rect.width + pad * 2) + 'px';
      _tourSpotlight.style.height = (rect.height + pad * 2) + 'px';
      _tourSpotlight.style.display = 'block';

      const tw = 340;
      const th = 180;
      let ttop, tleft;

      if (step.position === 'center') {
        ttop = rect.top + rect.height / 2 - th / 2;
        tleft = rect.left + rect.width / 2 - tw / 2;
      } else if (step.position === 'bottom') {
        ttop = rect.bottom + pad + 12;
        tleft = rect.left + rect.width / 2 - tw / 2;
      } else if (step.position === 'left') {
        ttop = rect.top + rect.height / 2 - th / 2;
        tleft = rect.left - tw - pad - 12;
      }

      tleft = Math.max(12, Math.min(tleft, window.innerWidth - tw - 12));
      ttop = Math.max(12, Math.min(ttop, window.innerHeight - th - 12));

      tooltip.style.top = ttop + 'px';
      tooltip.style.left = tleft + 'px';
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
    const displayName = profile && profile.full_name ? profile.full_name : username;
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
      const res = await fetch('/api/profile', { headers: authHeaders() });
      if (res.ok) {
        const profile = await res.json();
        applyProfileToUI(profile);
      }
    } catch (e) { /* ignore */ }
  }

  let profilePhotoDataUrl = null;
  let adminEditingUser = null;

  async function openProfileModal(targetUser) {
    if (!isLoggedIn()) return;
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
      } catch (e) { /* ignore */ }
    }
    document.getElementById('profile-modal').classList.remove('hidden');
  }

  function closeProfileModal() {
    document.getElementById('profile-modal').classList.add('hidden');
    const wasAdminEditing = !!adminEditingUser;
    adminEditingUser = null;
    if (wasAdminEditing) openAdminUsersModal();
  }

  async function changeOwnPassword() {
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

      function cardHtml(person) {
        const name = person.full_name || person.username;
        const desc = person.description || '';
        const thumb = person.photo
          ? '<img src="' + person.photo + '" alt="">'
          : name.toString().charAt(0).toUpperCase();
        return '<div class="about-card"><div class="about-card-thumb">' + thumb + '</div><div class="about-card-info"><div class="about-card-name">' + escapeHtml(name) + '</div><div class="about-card-desc">' + escapeHtml(desc) + '</div></div></div>';
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
        colaboradores.forEach(p => { html += cardHtml(p); });
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
    if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.refreshPolyStyles) {
      LeucenaDrawing.refreshPolyStyles();
    }
    if (typeof LeucenaMap !== 'undefined' && LeucenaMap.updateFilterCounts) {
      LeucenaMap.updateFilterCounts();
    }
    showToast(LeucenaI18n.t('auth.disconnected'), 'info');
  }

  // ── Sidebar ──

  function isEditing() {
    return selectedCellData && selectedCellData.locked_by && selectedCellData.locked_by === username;
  }

  function toggleSidebar() {
    const main = document.getElementById('main-content');
    const isOpen = main.classList.toggle('sidebar-open');
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
      LeucenaDrawing.setAreaLabelsVisible(true);

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
      if (!isLoggedIn() || !isTeamOrAbove()) { deleteCb.checked = false; return; }
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

  function toRoman(n) {
    if (n === 0) return 'X';
    const vals = [10, 9, 5, 4, 1];
    const syms = ['X', 'IX', 'V', 'IV', 'I'];
    let result = '';
    for (let i = 0; i < vals.length; i++) {
      while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
    }
    return result;
  }

  function passcodeToRoman(code) {
    return code.split('').map(d => toRoman(parseInt(d))).join('.');
  }

  function fallbackCopy(text) {
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

  function openDebugModal() {
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

    function escHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
    const body = document.getElementById('debug-info-body');
    body.innerHTML = rows.map(r => {
      const v = String(r.val);
      const vJs = JSON.stringify(v);
      return `<div class="debug-row">
        <span class="debug-key">${escHtml(r.key)}:</span>
        <span class="debug-val">${escHtml(v)}</span>
        <button type="button" class="debug-copy-btn" title="Copiar" onclick="navigator.clipboard.writeText(${vJs}).then(function(){LeucenaApp.showToast('Copiado!','success',1500);})">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        </button>
      </div>`;
    }).join('');
    const vc = document.getElementById('view-counter');
    if (vc) vc.classList.add('view-counter-modal-open');
    document.getElementById('debug-modal').classList.remove('hidden');
  }

  async function openAdminUsersModal() {
    if (!isAdminUser()) return;
    const t = LeucenaI18n.t;
    const modal = document.getElementById('admin-users-modal');
    modal.classList.remove('hidden');

    try {
      const res = await fetch('/api/admin/users', { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const callerIsSuperAdmin = data.callerRole === 'superadmin';

      const pcBox = document.getElementById('admin-passcode-display');
      if (data.nextPasscode) {
        const romanCode = passcodeToRoman(data.nextPasscode);
        pcBox.innerHTML = `<strong>${t('admin.nextPasscode')}</strong> <span class="admin-passcode-roman">${romanCode}</span><button type="button" class="admin-copy-btn" id="admin-copy-passcode" title="${t('admin.copyPasscode')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>`;
        document.getElementById('admin-copy-passcode').addEventListener('click', (e) => {
          const code = String(data.nextPasscode);
          const btn = e.currentTarget;
          const showCopyFeedback = () => {
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
            showToast('Código copiado!', 'success');
            setTimeout(() => { btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>'; }, 1500);
          };
          try {
            if (navigator.clipboard && window.isSecureContext) {
              navigator.clipboard.writeText(code).then(showCopyFeedback).catch(() => { fallbackCopy(code); showCopyFeedback(); });
            } else { fallbackCopy(code); showCopyFeedback(); }
          } catch (err) { fallbackCopy(code); showCopyFeedback(); }
        });
      } else {
        pcBox.innerHTML = '';
      }

      const metricsEl = document.getElementById('admin-global-metrics');
      metricsEl.innerHTML = `<div class="admin-metric"><span class="admin-metric-value">${data.globalMasks.toLocaleString()}</span><span class="admin-metric-label">${t('admin.totalMasks')}</span></div><div class="admin-metric"><span class="admin-metric-value">${data.globalAreaHa.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ha</span><span class="admin-metric-label">${t('admin.totalArea')}</span></div>`;

      const listEl = document.getElementById('admin-users-list');
      listEl.innerHTML = '';

      const exportRow = document.createElement('div');
      exportRow.className = 'admin-export-row';
      const backupBtnHtml = callerIsSuperAdmin ? `<button id="admin-backup-db" class="admin-export-btn">💾 ${t('admin.backupDb')}</button>` : '';
      const createUserBtnHtml = callerIsSuperAdmin ? `<button id="admin-create-user-btn" class="admin-export-btn admin-create-user-btn">➕ ${t('admin.createUser')}</button>` : '';
      exportRow.innerHTML = `${createUserBtnHtml}<button id="admin-export-csv" class="admin-export-btn">${t('admin.exportCsv')}</button>
        <button id="admin-export-logs" class="admin-export-btn">📋 ${t('admin.exportLogs')}</button>
        <button id="admin-copy-recent-logs" class="admin-export-btn admin-copy-log-btn">📄 ${t('admin.copyRecentLogs')}</button>
        ${backupBtnHtml}`;
      listEl.appendChild(exportRow);
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
        const row = document.createElement('div');
        row.className = 'admin-user-row';

        let roleSelectHtml = '';
        let founderCheckboxHtml = '';
        if (callerIsSuperAdmin) {
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

        const canDelete = callerIsSuperAdmin && role !== 'superadmin';
        const emailDisplay = user.email ? `<span class="admin-user-email">${user.email}</span>` : '';
        const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : '—';
        const lastActiveHtml = formatLastActive(user.last_active, user.username);

        row.innerHTML = `
          <div class="admin-row-line1">
            ${founderCheckboxHtml}
            <span class="admin-user-name">${user.username}</span>
            <span class="admin-user-badge admin-role-${role}">${roleLabelMap[role]}</span>
            ${roleSelectHtml}
            ${emailDisplay}
          </div>
          <div class="admin-row-line2">
            <span class="admin-meta">${t('admin.createdAt')}: ${createdDate}</span>
            <span class="admin-meta-sep">·</span>
            <span class="admin-meta">${t('admin.lastAccess')}: ${lastActiveHtml}</span>
          </div>
          <div class="admin-row-line-stats">
            <span class="admin-stat" title="${t('admin.masks')}">🗺 ${user.mask_count || 0}</span>
            <span class="admin-stat" title="${t('admin.area')}">📐 ${(user.mask_area_ha || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ha</span>
            <span class="admin-stat" title="${t('admin.logins')}">🔑 ${user.login_count || 0}</span>
            <span class="admin-stat" title="${t('admin.timeOnline')}">⏱ ${timeStr}</span>
          </div>
          ${testerRadioHtml}
          <div class="admin-user-actions">
            <button class="admin-profile-btn">${t('admin.editProfile')}</button>
            <button class="admin-pw-btn">${t('admin.changePassword')}</button>
            <button class="admin-reset-btn">${t('admin.generateResetCode')}</button>
            ${canDelete ? `<button class="admin-del-btn btn-danger-sm">${t('admin.deleteUser')}</button>` : ''}
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
        pwBtn.addEventListener('click', async () => {
          const newPw = prompt(t('admin.newPassword', user.username));
          if (!newPw || newPw.length < 3) return;
          const r = await fetch(`/api/admin/users/${user.id}/password`, {
            method: 'PUT', headers: authHeaders(), body: JSON.stringify({ password: newPw })
          });
          if (r.ok) { showToast(t('admin.passwordChanged'), 'success'); }
          else { const err = await r.json(); showToast(err.error, 'error'); }
        });

        const resetBtn = row.querySelector('.admin-reset-btn');
        resetBtn.addEventListener('click', async () => {
          try {
            const r = await fetch(`/api/admin/users/${user.id}/reset-token`, {
              method: 'POST', headers: authHeaders()
            });
            const data = await r.json();
            if (r.ok) {
              const msg = `${t('admin.resetCodeGenerated', user.username)}\n\n${data.code}\n\n${t('admin.resetCodeExpires', data.expiresInMinutes)}`;
              try {
                if (navigator.clipboard && window.isSecureContext) {
                  await navigator.clipboard.writeText(data.code);
                } else { fallbackCopy(data.code); }
              } catch (_) { fallbackCopy(data.code); }
              alert(msg);
              showToast(t('admin.resetCodeCopied'), 'success');
            } else { showToast(data.error, 'error'); }
          } catch (e) { showToast('Erro de conexão', 'error'); }
        });

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
    flushLogs: _flushLogs
  };
})();

// IIFE app shell: init() wires auth, sidebar, admin panel, document hotkeys, and modals (runs at script load).
window.LeucenaApp = (function () {
  let username = null;
  let authToken = null;
  let userRole = 'contributor';
  let testerMode = 'contributor';
  let selectedCellId = null;
  let _maskBreakdownSeq = 0;
  let selectedCellData = null;
  let lockHeartbeatInterval = null;
  let pendingUncoveredPointIds = null;
  let mapsLoaded = false;
  let mapsInitialized = false;
  let _adminViewMode = false;
  /** Superadmin permanent delete: { id, expectedPhrase, rowEl } */
  let _pendingPermanentDelete = null;

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

  function displayCellId(cellData, fallbackId) {
    return (cellData && cellData.grid_id) || fallbackId;
  }

  function safePhotoSrc(url) {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('data:image/') || url.startsWith('https://')) return url;
    return '';
  }

  function _goToCell(raw) {
    if (!isTeamOrAbove()) return;
    const rawTrim = (raw || '').trim();
    if (!rawTrim) return;
    if (typeof LeucenaMap === 'undefined') return;
    const qNorm = LeucenaMap.normalizeCellSearchQuery(rawTrim);
    const results = LeucenaMap.findCellsByGridId(rawTrim);
    logEvent('cell_search', null, null, { query: rawTrim, normalized: qNorm, results: results.length });
    if (results.length === 0) {
      showToast(LeucenaI18n.t('cellSearch.notFound', qNorm || rawTrim), 'warning');
      return;
    }
    const ids = results.map(r => r.id);
    if (results.length > 1) {
      if (isEditing()) {
        showToast(LeucenaI18n.t('cellSearch.unlockFirstMulti'), 'warning');
        return;
      }
      clearCellSelection();
      LeucenaMap.zoomToCells(ids);
      showToast(LeucenaI18n.t('cellSearch.multipleFound', results.length), 'info');
      return;
    }
    const onlyId = ids[0];
    if (isEditing() && selectedCellId !== onlyId) {
      showToast(LeucenaI18n.t('cellSearch.unlockFirst'), 'warning');
      return;
    }
    LeucenaMap.zoomToCells(ids);
    const data = LeucenaMap.getGridData(onlyId);
    if (data && selectedCellId !== onlyId) selectCell(onlyId, data);
  }

  function authHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (authToken) h['Authorization'] = `Bearer ${authToken}`;
    return h;
  }

  let _sessionExpiredShown = false;
  function handleSessionExpired(response) {
    if (response.status === 401 && !_sessionExpiredShown) {
      response.clone().json().then(data => {
        if (data.code === 'SESSION_EXPIRED') {
          _sessionExpiredShown = true;
          logEvent('session_expired');
          localStorage.removeItem('leucena_token');
          localStorage.removeItem('leucena_username');
          showToast(LeucenaI18n.t('auth.sessionExpired'), 'warning', 6000);
          setTimeout(() => window.location.reload(), 3000);
        }
      }).catch(() => {});
    }
    return response;
  }

  const _logQueue = [];
  const _logRing = [];
  const _LOG_RING_MAX = 500;
  let _logTimer = null;
  function logEvent(action, cellId, objectId, details) {
    if (!authToken) return;
    const entry = { action, cell_id: cellId || null, object_id: objectId || null, details: details || null };
    _logQueue.push(entry);
    _logRing.push({ ts: new Date().toISOString(), ...entry });
    if (_logRing.length > _LOG_RING_MAX) _logRing.shift();
    if (!_logTimer) {
      _logTimer = setTimeout(_flushLogs, 3000);
    }
  }

  function _copyRecentLogs(minutes) {
    const cutoff = Date.now() - (minutes || 5) * 60 * 1000;
    const recent = _logRing.filter(e => new Date(e.ts).getTime() >= cutoff);
    const lines = recent.map(e => {
      const d = e.details ? (' | ' + JSON.stringify(e.details)) : '';
      return '[' + e.ts + '] ' + (username || '?') + ' (' + getEffectiveRole() + '): ' + e.action + d;
    });
    const text = lines.join('\n') || '(nenhum log nos últimos ' + minutes + ' minutos)';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => showToast(LeucenaI18n.t('tester.logsCopied', recent.length), 'success'),
        () => showToast('Erro ao copiar', 'error')
      );
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(LeucenaI18n.t('tester.logsCopied', recent.length), 'success');
    }
  }
  function _flushLogs() {
    _logTimer = null;
    if (_logQueue.length === 0 || !authToken) return;
    const batch = _logQueue.splice(0, 50);
    fetch('/api/log', { method: 'POST', headers: authHeaders(), body: JSON.stringify(batch) })
      .then(r => { handleSessionExpired(r); })
      .catch(() => {});
  }

  /** Close only when press+release both target the overlay (not when text selection starts inside the card and ends on the dimmed area). */
  function bindBackdropClose(overlay, closeFn) {
    let pointerDownOnBackdrop = false;
    overlay.addEventListener('pointerdown', (e) => {
      pointerDownOnBackdrop = (e.target === overlay);
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && pointerDownOnBackdrop) closeFn();
      pointerDownOnBackdrop = false;
    });
  }

  function closePermanentDeleteUserModal() {
    const m = document.getElementById('admin-delete-user-modal');
    if (m) m.classList.add('hidden');
    _pendingPermanentDelete = null;
    const input = document.getElementById('admin-delete-user-phrase-input');
    const err = document.getElementById('admin-delete-user-phrase-error');
    const confirmBtn = document.getElementById('admin-delete-user-confirm');
    if (input) input.value = '';
    if (err) {
      err.classList.add('hidden');
      err.textContent = '';
    }
    if (confirmBtn) confirmBtn.disabled = true;
  }

  function syncPermanentDeletePhraseInput() {
    const input = document.getElementById('admin-delete-user-phrase-input');
    const confirmBtn = document.getElementById('admin-delete-user-confirm');
    const err = document.getElementById('admin-delete-user-phrase-error');
    if (err) err.classList.add('hidden');
    if (!_pendingPermanentDelete || !input || !confirmBtn) return;
    confirmBtn.disabled = input.value.trim() !== _pendingPermanentDelete.expectedPhrase;
  }

  function openPermanentDeleteUserModal(user, rowEl) {
    const t = LeucenaI18n.t;
    const expectedPhrase = t('admin.permanentDeleteExpectedPhrase', user.username);
    _pendingPermanentDelete = { id: user.id, expectedPhrase, rowEl };
    document.getElementById('admin-delete-user-modal-title').textContent = t('admin.permanentDeleteModalTitle');
    document.getElementById('admin-delete-user-modal-warning').textContent = t('admin.permanentDeleteModalWarning', user.username);
    document.getElementById('admin-delete-user-type-instruction').textContent = t('admin.permanentDeleteTypeInstruction');
    document.getElementById('admin-delete-user-phrase-display').textContent = expectedPhrase;
    const input = document.getElementById('admin-delete-user-phrase-input');
    input.value = '';
    document.getElementById('admin-delete-user-phrase-error').classList.add('hidden');
    document.getElementById('admin-delete-user-cancel').textContent = t('admin.permanentDeleteModalCancel');
    const confirmBtn = document.getElementById('admin-delete-user-confirm');
    confirmBtn.textContent = t('admin.permanentDeleteConfirmBtn');
    confirmBtn.disabled = true;
    document.getElementById('admin-delete-user-modal').classList.remove('hidden');
    input.focus();
  }

  function init() {
    logEvent('app_init', null, null, { url: window.location.href, userAgent: navigator.userAgent, screen: window.innerWidth + 'x' + window.innerHeight });
    document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);

    _initSidebarSwipe();

    setupCollapsibleFilters();

    document.getElementById('login-btn').addEventListener('click', () => openAuthModal('login'));
    document.getElementById('signup-btn').addEventListener('click', () => openAuthModal('register'));
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('auth-modal-close').addEventListener('click', closeAuthModal);
    bindBackdropClose(document.getElementById('auth-modal'), closeAuthModal);

    document.getElementById('top-bar').addEventListener('click', () => {
      if (typeof LeucenaMap !== 'undefined') LeucenaMap.deselectPoint();
    });
    document.getElementById('toolbar').addEventListener('click', () => {
      if (typeof LeucenaMap !== 'undefined') LeucenaMap.deselectPoint();
    });

    document.getElementById('tool-unlock').addEventListener('click', openUnlockModal);
    document.getElementById('badge-unlock-btn').addEventListener('click', openUnlockModal);
    document.getElementById('tool-unlock-float').addEventListener('click', openUnlockModal);
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

    document.getElementById('admin-users-btn').addEventListener('click', () => {
      if (userRole === 'tester') { openTesterRoleModal(); return; }
      openAdminUsersModal();
    });
    document.getElementById('admin-users-close').addEventListener('click', closeAdminUsersModal);
    document.getElementById('admin-users-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeAdminUsersModal();
    });

    document.getElementById('tester-role-close').addEventListener('click', closeTesterRoleModal);
    document.getElementById('tester-role-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeTesterRoleModal();
    });
    document.querySelectorAll('.tester-role-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTesterMode(btn.dataset.mode));
    });
    document.getElementById('tester-copy-logs-btn').addEventListener('click', () => _copyRecentLogs(5));

    document.getElementById('cell-search-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        _goToCell(e.target.value);
      }
    });
    document.getElementById('cell-search-go').addEventListener('click', () => {
      _goToCell(document.getElementById('cell-search-input').value);
    });

    document.getElementById('inbox-bell-btn').addEventListener('click', openInboxModal);
    document.getElementById('inbox-modal-close').addEventListener('click', closeInboxModal);
    document.getElementById('inbox-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeInboxModal();
    });
    document.getElementById('inbox-compose-close').addEventListener('click', closeComposeModal);
    document.getElementById('inbox-compose-cancel').addEventListener('click', closeComposeModal);
    document.getElementById('inbox-compose-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeComposeModal();
    });
    document.getElementById('inbox-compose-form').addEventListener('submit', handleComposeSend);

    document.querySelectorAll('.fmt-btn[data-fmt]').forEach(btn => {
      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', () => {
        const editor = document.getElementById('inbox-compose-body');
        editor.focus();
        const fmt = btn.dataset.fmt;
        if (fmt === 'bold')   return document.execCommand('bold');
        if (fmt === 'italic') return document.execCommand('italic');
        if (fmt === 'strike') return document.execCommand('strikeThrough');
        if (fmt === 'highlight') {
          const sel = window.getSelection();
          if (sel.rangeCount && !sel.isCollapsed) {
            const range = sel.getRangeAt(0);
            const mark = document.createElement('mark');
            try { range.surroundContents(mark); } catch (e) {
              document.execCommand('insertHTML', false, '<mark>' + sel.toString() + '</mark>');
            }
          }
          return;
        }
        if (fmt === 'quote') return document.execCommand('formatBlock', false, 'blockquote');
        if (fmt === 'alignLeft')    return document.execCommand('justifyLeft');
        if (fmt === 'alignCenter')  return document.execCommand('justifyCenter');
        if (fmt === 'alignRight')   return document.execCommand('justifyRight');
        if (fmt === 'alignJustify') return document.execCommand('justifyFull');
        if (fmt === 'bulletList')   return document.execCommand('insertUnorderedList');
        if (fmt === 'numberedList') return document.execCommand('insertOrderedList');
        if (fmt === 'link') {
          const sel = window.getSelection();
          const selText = sel.toString();
          const url = prompt('URL:', selText && /^https?:\/\//.test(selText) ? selText : 'https://');
          if (!url) return;
          document.execCommand('createLink', false, url);
          const a = sel.anchorNode.parentElement.closest('a') || sel.anchorNode.parentElement;
          if (a && a.tagName === 'A') {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.classList.add('inbox-link');
          }
          return;
        }
      });
    });

    const _composeBody = document.getElementById('inbox-compose-body');
    const _charCounter = document.getElementById('compose-char-counter');

    _composeBody.addEventListener('input', () => {
      const len = _composeBody.textContent.length;
      _charCounter.textContent = len + ' / 2000';
      _charCounter.classList.toggle('compose-char-warn', len > 1800);
      _charCounter.classList.toggle('compose-char-over', len > 2000);
    });

    _composeBody.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });

    const _imgInput = document.getElementById('compose-img-input');
    document.getElementById('fmt-img-btn').addEventListener('click', () => {
      if (_composeImages.length >= MSG_PHOTO_MAX_COUNT) {
        showToast('Máximo de ' + MSG_PHOTO_MAX_COUNT + ' imagens', 'warning');
        return;
      }
      _imgInput.click();
    });
    _imgInput.addEventListener('change', async () => {
      const files = Array.from(_imgInput.files || []);
      _imgInput.value = '';
      for (const file of files) {
        if (_composeImages.length >= MSG_PHOTO_MAX_COUNT) {
          showToast('Máximo de ' + MSG_PHOTO_MAX_COUNT + ' imagens', 'warning');
          break;
        }
        if (!file.type.startsWith('image/')) { showToast('Arquivo não é uma imagem', 'warning'); continue; }
        if (file.size > 10 * 1024 * 1024) { showToast('Imagem muito grande (máx. 10MB)', 'warning'); continue; }
        try {
          const dataUrl = await compressMessageImage(file);
          _composeImages.push(dataUrl);
          _renderComposeImagePreviews();
        } catch (e) { showToast('Erro ao processar imagem', 'error'); }
      }
    });

    const _lightbox = document.getElementById('inbox-lightbox');
    const _lightboxImg = document.getElementById('inbox-lightbox-img');
    _lightbox.addEventListener('click', (e) => {
      if (e.target === _lightbox || e.target.classList.contains('inbox-lightbox-close')) {
        _lightbox.classList.add('hidden');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !_lightbox.classList.contains('hidden')) {
        _lightbox.classList.add('hidden');
      }
    });

    document.getElementById('inbox-confirm-cancel').addEventListener('click', closeSendConfirm);
    document.getElementById('inbox-confirm-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeSendConfirm();
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

    document.getElementById('admin-delete-user-modal-close').addEventListener('click', closePermanentDeleteUserModal);
    document.getElementById('admin-delete-user-cancel').addEventListener('click', closePermanentDeleteUserModal);
    document.getElementById('admin-delete-user-phrase-input').addEventListener('input', syncPermanentDeletePhraseInput);
    document.getElementById('admin-delete-user-phrase-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const btn = document.getElementById('admin-delete-user-confirm');
        if (btn && !btn.disabled) btn.click();
      }
    });
    document.getElementById('admin-delete-user-confirm').addEventListener('click', async () => {
      const t = LeucenaI18n.t;
      const input = document.getElementById('admin-delete-user-phrase-input');
      const err = document.getElementById('admin-delete-user-phrase-error');
      if (!_pendingPermanentDelete) return;
      if (input.value.trim() !== _pendingPermanentDelete.expectedPhrase) {
        err.textContent = t('admin.permanentDeletePhraseMismatch');
        err.classList.remove('hidden');
        return;
      }
      const { id, rowEl } = _pendingPermanentDelete;
      try {
        const r = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', headers: authHeaders() });
        if (r.ok) {
          logEvent('admin_delete_user', null, null, { userId: id });
          closePermanentDeleteUserModal();
          showToast(t('admin.userDeleted'), 'success');
          if (rowEl) rowEl.remove();
        } else {
          const j = await r.json();
          showToast(j.error || 'Error', 'error');
        }
      } catch (e) {
        showToast('Erro de conexão', 'error');
      }
    });

    const adminDebugToggle = document.getElementById('admin-debug-toggle');
    if (adminDebugToggle) {
      adminDebugToggle.addEventListener('change', (e) => {
        const vc = document.getElementById('view-counter');
        vc.classList.toggle('debug-active', e.target.checked);
        vc.title = e.target.checked ? 'Debug: clique para info do mapa' : 'Visualizações do site';
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

    document.getElementById('user-badge').addEventListener('click', () => {
      dismissUserBadgeProfileHint();
      openProfileModal();
    });
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
    document.getElementById('welcome-modal-close').addEventListener('click', () => Onboarding.closeWelcome(false));
    document.getElementById('welcome-dismiss-forever').addEventListener('click', () => Onboarding.closeWelcome(true));
    document.getElementById('welcome-go-video').addEventListener('click', (e) => {
      e.preventDefault();
      Onboarding.closeWelcome(false);
      openGuideModal('howto');
    });
    document.getElementById('welcome-video-thumb').addEventListener('click', () => {
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

    document.getElementById('toggle-users-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openUsersOnlineModal();
    });
    document.getElementById('users-online-modal-close').addEventListener('click', closeUsersOnlineModal);
    document.getElementById('users-online-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeUsersOnlineModal();
    });

    if (typeof LeucenaCollab !== 'undefined' && LeucenaCollab.initAnonymous) {
      LeucenaCollab.initAnonymous();
    }

    setupAuthForm();
    setupGoogleAuth();
    setupMigrationBanner();
    setupVerificationBanner();
    setupExpansionBanner();
    setupRegionPicker();
    tryRestoreSession().finally(() => { maybeOpenAuthFromHash(); });
    loadRankingWidget();

    LeucenaI18n.translatePage();
    syncStreetViewButtonTitle();

    handleHash();
    window.addEventListener('hashchange', handleHash);
    window.addEventListener('beforeunload', _flushLogs);

    // Escape: close the first visible modal in modalCloseMap (global dismiss, not a stack).
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const modalCloseMap = [
        ['inbox-confirm-modal', closeSendConfirm],
        ['inbox-compose-modal', closeComposeModal],
        ['inbox-modal', closeInboxModal],
        ['admin-delete-user-modal', closePermanentDeleteUserModal],
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
        ['users-online-modal', closeUsersOnlineModal],
        ['celebration-modal', closeCelebration],
        ['region-picker-modal', closeRegionPicker],
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

  // ── Toolbar dropdown helpers (lang & export) ──

  function closeSiblingToolbarDropdown(opening) {
    const langMenu = document.getElementById('lang-menu');
    const exportMenu = document.getElementById('export-menu');
    if (opening === 'lang' && exportMenu) {
      exportMenu.classList.remove('show');
    } else if (opening === 'export' && langMenu) {
      langMenu.classList.remove('show');
    }
  }

  function setupLangDropdown() {
    const btn = document.getElementById('lang-btn');
    const menu = document.getElementById('lang-menu');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      updateLangMenuActive();
      closeSiblingToolbarDropdown('lang');
      menu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      menu.classList.remove('show');
    });

    document.querySelectorAll('.lang-option').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const lang = a.getAttribute('data-lang');
        logEvent('lang_change', null, null, { lang });
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

  /** After session restore: open login/register from #login etc. only if not logged in (avoids race with async tryRestoreSession). */
  function maybeOpenAuthFromHash() {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    const authHashes = new Set(['login', 'register', 'signup', 'cadastrar']);
    if (isLoggedIn()) {
      if (authHashes.has(hash)) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      return;
    }
    if (hash === 'register' || hash === 'signup' || hash === 'cadastrar') {
      setTimeout(() => openAuthModal('register'), 300);
      history.replaceState(null, '', window.location.pathname + window.location.search);
    } else if (hash === 'login') {
      setTimeout(() => openAuthModal('login'), 300);
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  // ── Auth modal ──

  let authMode = 'login';

  let _emailCheckTimer = null;
  let _emailCheckBlocked = false;

  function _referralPlaceholder(source) {
    const t = LeucenaI18n.t;
    const map = {
      university: t('referral.phUniversity'),
      instagram: t('referral.phInstagram'),
      linkedin: t('referral.phLinkedin'),
      news: t('referral.phNews'),
      youtube: t('referral.phYoutube'),
      twitter: t('referral.phTwitter'),
      facebook: t('referral.phFacebook'),
      friend: t('referral.phFriend'),
      google_search: t('referral.phGoogleSearch'),
      event: t('referral.phEvent'),
      other: t('referral.phOther')
    };
    return map[source] || t('referral.detailPlaceholder');
  }

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

    const emailInput = document.getElementById('auth-email');
    emailInput.addEventListener('input', () => {
      if (authMode !== 'register') return;
      _emailCheckBlocked = false;
      clearTimeout(_emailCheckTimer);
      const feedback = document.getElementById('auth-email-feedback');
      feedback.classList.add('hidden');
      const submitBtn = document.getElementById('auth-submit-btn');
      submitBtn.disabled = false;
      const val = emailInput.value.trim();
      if (val && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        _emailCheckTimer = setTimeout(() => checkEmailAvailability(), 600);
      }
    });
    emailInput.addEventListener('blur', () => {
      if (authMode !== 'register') return;
      clearTimeout(_emailCheckTimer);
      checkEmailAvailability();
    });

    function setupReferralToggle(selectId, detailId) {
      const sel = document.getElementById(selectId);
      const det = document.getElementById(detailId);
      if (!sel || !det) return;
      sel.addEventListener('change', () => {
        const v = sel.value;
        if (v) {
          det.classList.remove('hidden');
          det.placeholder = _referralPlaceholder(v);
        } else {
          det.classList.add('hidden');
          det.value = '';
        }
      });
    }
    setupReferralToggle('auth-referral-source', 'auth-referral-detail');
    setupReferralToggle('profile-referral-source', 'profile-referral-detail');

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
    bindBackdropClose(document.getElementById('reset-modal'), closeResetModal);
    document.getElementById('reset-form').addEventListener('submit', handleResetSubmit);
    document.getElementById('reset-back-login').addEventListener('click', (e) => {
      e.preventDefault();
      closeResetModal();
      openAuthModal('login');
    });

    document.getElementById('auth-unverified-resend').addEventListener('click', async () => {
      const t = LeucenaI18n.t;
      const identifier = document.getElementById('auth-username').value.trim();
      const fb = document.getElementById('auth-unverified-resend-feedback');
      fb.classList.add('hidden');
      fb.classList.remove('ok');
      if (!identifier) {
        fb.textContent = t('auth.unverifiedResendNeedIdentifier');
        fb.classList.remove('hidden');
        return;
      }
      try {
        const r = await fetch('/api/auth/resend-verification-by-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier })
        });
        const data = await r.json().catch(() => ({}));
        if (r.ok) {
          if (data.already_verified) {
            fb.textContent = t('auth.emailExistsVerified');
          } else {
            fb.textContent = t('auth.resendSuccess');
            fb.classList.add('ok');
          }
          fb.classList.remove('hidden');
        } else {
          fb.textContent = data.error || t('auth.connectionError');
          fb.classList.remove('hidden');
        }
      } catch (err) {
        fb.textContent = t('auth.connectionError');
        fb.classList.remove('hidden');
      }
    });
  }

  async function checkEmailAvailability() {
    const emailInput = document.getElementById('auth-email');
    const email = emailInput.value.trim();
    const feedback = document.getElementById('auth-email-feedback');
    const submitBtn = document.getElementById('auth-submit-btn');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      feedback.classList.add('hidden');
      submitBtn.disabled = false;
      return;
    }
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (emailInput.value.trim() !== email) return;
      if (!data.exists) {
        feedback.classList.add('hidden');
        submitBtn.disabled = false;
        _emailCheckBlocked = false;
        return;
      }
      _emailCheckBlocked = true;
      submitBtn.disabled = true;
      const t = LeucenaI18n.t;
      if (data.verified) {
        feedback.className = 'auth-email-feedback email-exists-verified';
        feedback.innerHTML = t('auth.emailExistsVerified') +
          ' <a id="auth-email-forgot-link">' + t('auth.forgotPassword') + '</a>';
        feedback.classList.remove('hidden');
        const forgotLink = document.getElementById('auth-email-forgot-link');
        if (forgotLink) {
          forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeAuthModal();
            openResetModal();
            document.getElementById('reset-email').value = email;
          });
        }
      } else {
        feedback.className = 'auth-email-feedback email-exists-unverified';
        feedback.innerHTML = t('auth.emailExistsUnverified') +
          ' <a id="auth-email-resend-link">' + t('auth.resendVerification') + '</a>';
        feedback.classList.remove('hidden');
        const resendLink = document.getElementById('auth-email-resend-link');
        if (resendLink) {
          resendLink.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
              const r = await fetch('/api/auth/resend-verification-by-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
              });
              if (r.ok) {
                feedback.className = 'auth-email-feedback email-exists-unverified';
                feedback.textContent = t('auth.resendSuccess');
              } else {
                const err = await r.json();
                feedback.textContent = err.error;
              }
            } catch (err) {
              feedback.textContent = t('auth.connectionError');
            }
          });
        }
      }
    } catch (e) { /* ignore network errors on check */ }
  }

  function openAuthModal(mode) {
    logEvent('auth_modal_open', null, null, { mode: mode });
    authMode = mode;
    _emailCheckBlocked = false;
    const modal = document.getElementById('auth-modal');
    modal.classList.remove('hidden');

    document.getElementById('auth-error').classList.add('hidden');
    const authSuccess = document.getElementById('auth-success');
    if (authSuccess) authSuccess.classList.add('hidden');
    const unverifiedPanel = document.getElementById('auth-unverified-panel');
    if (unverifiedPanel) {
      unverifiedPanel.classList.add('hidden');
      const ufb = document.getElementById('auth-unverified-resend-feedback');
      if (ufb) {
        ufb.classList.add('hidden');
        ufb.classList.remove('ok');
        ufb.textContent = '';
      }
    }
    document.getElementById('auth-form').classList.remove('hidden');
    document.querySelector('.auth-switch').classList.remove('hidden');
    const googleBtn = document.getElementById('auth-google-btn');
    if (googleBtn) googleBtn.classList.remove('hidden');
    const divider = document.querySelector('.auth-divider');
    if (divider) divider.classList.remove('hidden');

    const usernameInput = document.getElementById('auth-username');
    usernameInput.value = '';
    document.getElementById('auth-password').value = '';
    const submitBtn = document.getElementById('auth-submit-btn');
    submitBtn.disabled = false;

    const registerFullnameGroup = document.getElementById('register-fullname-group');
    const fullnameInput = document.getElementById('auth-fullname');
    if (fullnameInput) fullnameInput.value = '';
    const registerEmailGroup = document.getElementById('register-email-group');
    const emailInput = document.getElementById('auth-email');
    emailInput.value = '';
    const feedback = document.getElementById('auth-email-feedback');
    if (feedback) feedback.classList.add('hidden');
    const confirmGroup = document.getElementById('confirm-password-group');
    const confirmInput = document.getElementById('auth-password-confirm');
    if (confirmInput) confirmInput.value = '';

    const t = LeucenaI18n.t;
    const forgotGroup = document.getElementById('auth-forgot-group');
    const contactHint = document.getElementById('auth-contact-hint');
    const googleLabel = document.getElementById('auth-google-label');

    if (mode === 'login') {
      document.getElementById('auth-modal-title').textContent = t('auth.login');
      document.getElementById('auth-modal-subtitle').textContent = t('auth.loginSubtitle');
      submitBtn.textContent = t('auth.login');
      document.getElementById('auth-switch-text').textContent = t('auth.noAccount');
      document.getElementById('auth-switch-link').textContent = t('auth.register');
      usernameInput.classList.remove('hidden');
      usernameInput.setAttribute('required', 'required');
      if (registerFullnameGroup) registerFullnameGroup.classList.add('hidden');
      if (fullnameInput) fullnameInput.removeAttribute('required');
      registerEmailGroup.classList.add('hidden');
      emailInput.removeAttribute('required');
      confirmGroup.classList.add('hidden');
      if (confirmInput) confirmInput.removeAttribute('required');
      forgotGroup.classList.remove('hidden');
      if (contactHint) contactHint.classList.add('hidden');
      if (googleLabel) googleLabel.textContent = t('auth.googleSignIn');
      const regRefGroup = document.getElementById('register-referral-group');
      if (regRefGroup) regRefGroup.classList.add('hidden');
      usernameInput.focus();
    } else {
      document.getElementById('auth-modal-title').textContent = t('auth.register');
      document.getElementById('auth-modal-subtitle').textContent = t('auth.registerSubtitle');
      submitBtn.textContent = t('auth.createAccount');
      document.getElementById('auth-switch-text').textContent = t('auth.hasAccount');
      document.getElementById('auth-switch-link').textContent = t('auth.login');
      usernameInput.classList.add('hidden');
      usernameInput.removeAttribute('required');
      if (registerFullnameGroup) registerFullnameGroup.classList.remove('hidden');
      if (fullnameInput) fullnameInput.setAttribute('required', 'required');
      registerEmailGroup.classList.remove('hidden');
      emailInput.setAttribute('required', 'required');
      confirmGroup.classList.remove('hidden');
      if (confirmInput) confirmInput.setAttribute('required', 'required');
      forgotGroup.classList.add('hidden');
      if (contactHint) contactHint.classList.remove('hidden');
      if (googleLabel) googleLabel.textContent = t('auth.googleSignUp');
      const regRefGroup2 = document.getElementById('register-referral-group');
      if (regRefGroup2) regRefGroup2.classList.remove('hidden');
      const refSrc = document.getElementById('auth-referral-source');
      if (refSrc) refSrc.value = '';
      const refDet = document.getElementById('auth-referral-detail');
      if (refDet) { refDet.value = ''; refDet.classList.add('hidden'); }
      fullnameInput ? fullnameInput.focus() : emailInput.focus();
    }
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
    const errorEl = document.getElementById('auth-error');
    errorEl.classList.add('hidden');

    const pass = document.getElementById('auth-password').value;
    let endpoint, payload;

    if (authMode === 'login') {
      const user = document.getElementById('auth-username').value.trim().toLowerCase();
      endpoint = '/api/auth/login';
      payload = { identifier: user, username: user, password: pass };
    } else {
      const fullName = (document.getElementById('auth-fullname') || {}).value || '';
      const email = document.getElementById('auth-email').value.trim();
      const passConfirm = document.getElementById('auth-password-confirm').value;
      if (!fullName.trim()) {
        errorEl.textContent = LeucenaI18n.t('auth.fullNameRequired');
      errorEl.classList.remove('hidden');
      return;
    }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errorEl.textContent = LeucenaI18n.t('auth.emailInvalid');
      errorEl.classList.remove('hidden');
      return;
    }
      if (_emailCheckBlocked) {
        errorEl.textContent = LeucenaI18n.t('auth.emailAlreadyInUse');
        errorEl.classList.remove('hidden');
        return;
      }
      if (pass !== passConfirm) {
        errorEl.textContent = LeucenaI18n.t('auth.passwordMismatch');
        errorEl.classList.remove('hidden');
        return;
      }
      endpoint = '/api/auth/register';
      payload = { email, password: pass, full_name: fullName.trim() };
      const refSrc = (document.getElementById('auth-referral-source') || {}).value || '';
      const refDet = (document.getElementById('auth-referral-detail') || {}).value || '';
      if (refSrc) payload.referral_source = refSrc;
      if (refDet.trim()) payload.referral_detail = refDet.trim();
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        logEvent(authMode === 'login' ? 'login_error' : 'register_error', null, null, { error: data.error, code: data.code, status: res.status });
        if (data.code === 'EMAIL_NOT_VERIFIED' && authMode === 'login') {
          errorEl.classList.add('hidden');
          const successEl = document.getElementById('auth-success');
          if (successEl) successEl.classList.add('hidden');
          const panel = document.getElementById('auth-unverified-panel');
          if (panel) {
            const t = LeucenaI18n.t;
            document.getElementById('auth-unverified-title').textContent = t('auth.accountNotVerifiedTitle');
            const masked = data.masked_email || '';
            document.getElementById('auth-unverified-body').textContent = masked
              ? t('auth.accountNotVerifiedBody', masked)
              : (data.error || t('auth.noEmailContactAdmin'));
            panel.classList.remove('hidden');
            const ufb = document.getElementById('auth-unverified-resend-feedback');
            if (ufb) {
              ufb.classList.add('hidden');
              ufb.classList.remove('ok');
              ufb.textContent = '';
            }
          } else {
        errorEl.textContent = data.error;
        errorEl.classList.remove('hidden');
          }
        } else {
          errorEl.textContent = data.error;
          errorEl.classList.remove('hidden');
        }
        return;
      }

      if (data.needs_verification && !data.token) {
        logEvent('register_success', null, null, { needs_verification: true });
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
        role: data.role || 'contributor',
        is_local: !!data.is_local
      };

      if (data.show_migration_banner) {
        _showMigrationBanner = true;
      }

      closeAuthModal();
      onLoginSuccess(true);
    } catch (err) {
      errorEl.textContent = LeucenaI18n.t('auth.connectionError');
      errorEl.classList.remove('hidden');
    }
  }

  async function tryRestoreSession(freshOAuthReturn = false) {
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
        _userAuthInfo = { auth_provider: data.auth_provider, email_verified: data.email_verified, has_google: data.has_google, login_count: data.login_count || 0, mask_count: data.mask_count || 0, role: data.role || 'contributor', is_local: !!data.is_local };
        onLoginSuccess(freshOAuthReturn);
      } else {
        const errData = await res.json().catch(() => ({}));
        localStorage.removeItem('leucena_token');
        localStorage.removeItem('leucena_username');
        if (errData.code === 'SESSION_EXPIRED') {
          showToast(LeucenaI18n.t('auth.sessionExpired'), 'warning', 6000);
        }
      }
    } catch (e) {
      // Server not reachable
    }
  }

  let _loginSuccessRan = false;
  function onLoginSuccess(freshAuth = false) {
    if (_loginSuccessRan) return;
    _loginSuccessRan = true;
    document.getElementById('auth-nav-group').classList.add('hidden');
    document.getElementById('user-badge').classList.remove('hidden');
    document.getElementById('logout-btn').classList.remove('hidden');
    document.getElementById('user-display-name').textContent = username;
    const avatarEl = document.getElementById('user-avatar');
    avatarEl.innerHTML = '';
    avatarEl.textContent = username.charAt(0).toUpperCase();

    LeucenaCollab.init(username);
    showAdminTools();
    loadUserProfile();
    document.getElementById('inbox-bell-btn').classList.remove('hidden');
    refreshInboxBadge();
    startInboxPolling();
    if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.refreshPolyStyles) {
      LeucenaDrawing.refreshPolyStyles();
    }
    if (typeof LeucenaMap !== 'undefined' && LeucenaMap.updateFilterCounts) {
      LeucenaMap.updateFilterCounts();
    }
    logEvent('login_success', null, null, { username });
    showToast(LeucenaI18n.t('auth.welcome', username), 'success');
    Onboarding.onLogin();

    if (_showMigrationBanner && !localStorage.getItem(_userKey('leucena_migration_dismissed'))) {
      const banner = document.getElementById('migration-banner');
      if (banner) banner.classList.remove('hidden');
    }

    showVerificationBannerIfNeeded();
    loadRankingWidget();
    syncUserBadgeProfileHint();
    if (freshAuth) pulseUserBadgeIfProfileHintEligible();

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

  function openUsersOnlineModal() {
    logEvent('online_users_open');
    document.getElementById('users-online-modal').classList.remove('hidden');
  }

  function closeUsersOnlineModal() {
    document.getElementById('users-online-modal').classList.add('hidden');
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

  async function onPolygonSaved(areaHa, cellSummary) {
    if (selectedCellData) {
      if (cellSummary && cellSummary.mask_count != null) {
        selectedCellData.mask_count = cellSummary.mask_count;
        selectedCellData.mask_area_ha = cellSummary.mask_area_ha;
        selectedCellData.mapped_by = cellSummary.mapped_by;
      } else {
        selectedCellData.mask_count = (selectedCellData.mask_count || 0) + 1;
        selectedCellData.mask_area_ha = Math.round(((selectedCellData.mask_area_ha || 0) + (areaHa || 0)) * 10) / 10;
        const u = getUsername();
        if (u) {
          const parts = (selectedCellData.mapped_by || '').split(',').map(s => s.trim()).filter(Boolean);
          if (!parts.includes(u)) parts.push(u);
          parts.sort();
          selectedCellData.mapped_by = parts.join(',');
        }
      }
      updateCellMasksDisplay(selectedCellData);
      updateCellAttributionDisplay(selectedCellData);
    }
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

  function onPolygonDeleted(areaHa, cellSummary) {
    if (selectedCellData) {
      if (cellSummary && cellSummary.mask_count != null) {
        selectedCellData.mask_count = cellSummary.mask_count;
        selectedCellData.mask_area_ha = cellSummary.mask_area_ha;
        selectedCellData.mapped_by = cellSummary.mapped_by;
      } else {
        selectedCellData.mask_count = Math.max(0, (selectedCellData.mask_count || 0) - 1);
        selectedCellData.mask_area_ha = Math.max(0, Math.round(((selectedCellData.mask_area_ha || 0) - (areaHa || 0)) * 10) / 10);
      }
      updateCellMasksDisplay(selectedCellData);
      updateCellAttributionDisplay(selectedCellData);
    }
    loadRankingWidget();
  }

  function _userKey(base) {
    return username ? base + '_' + username : base;
  }

  // ── Profile badge hint: until user clicks #user-badge once (localStorage). Pulse only on fresh login (not refresh). ──

  function dismissUserBadgeProfileHint() {
    localStorage.setItem(_userKey('leucena_profile_click_hint_dismissed'), '1');
    const badge = document.getElementById('user-badge');
    const dot = document.getElementById('user-badge-hint');
    if (badge) {
      badge.classList.remove('user-badge--hint');
      badge.title = LeucenaI18n.t('profile.title');
    }
    if (dot) dot.classList.add('hidden');
  }

  function _isProfileHintDismissed() {
    if (localStorage.getItem(_userKey('leucena_profile_click_hint_dismissed')) === '1') return true;
    if (_userAuthInfo && _userAuthInfo.login_count > 1) return true;
    return false;
  }

  function syncUserBadgeProfileHint() {
    if (!isLoggedIn()) return;
    if (_isProfileHintDismissed()) { dismissUserBadgeProfileHint(); return; }
    const badge = document.getElementById('user-badge');
    const dot = document.getElementById('user-badge-hint');
    if (!badge || badge.classList.contains('hidden')) return;
    badge.classList.add('user-badge--hint');
    if (dot) dot.classList.remove('hidden');
    badge.title = LeucenaI18n.t('profile.clickHintTooltip');
  }

  function pulseUserBadgeIfProfileHintEligible() {
    if (!isLoggedIn()) return;
    if (_isProfileHintDismissed()) return;
    const badge = document.getElementById('user-badge');
    if (!badge || badge.classList.contains('hidden')) return;
    badge.classList.remove('user-badge-pulse');
    void badge.offsetWidth;
    badge.classList.add('user-badge-pulse');
    setTimeout(() => badge.classList.remove('user-badge-pulse'), 3200);
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

  async function handleGoogleAuthReturn() {
    const params = new URLSearchParams(window.location.search);
    const googleCode = params.get('google_auth_code') || params.get('google_auth_token');
    const authError = params.get('auth_error');

    if (googleCode) {
      window.history.replaceState({}, '', window.location.pathname);
      if (params.has('google_auth_code')) {
        try {
          const resp = await fetch('/api/auth/exchange-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: googleCode })
          });
          if (resp.ok) {
            const data = await resp.json();
            authToken = data.token;
            username = data.username;
            userRole = data.role || 'contributor';
            testerMode = data.tester_mode || 'contributor';
            if (data.show_migration_banner) _showMigrationBanner = true;
            _userAuthInfo = { auth_provider: data.auth_provider, email_verified: data.email_verified, has_google: data.has_google, login_count: 0, mask_count: 0, role: data.role || 'contributor', is_local: false };
            localStorage.setItem('leucena_token', authToken);
            localStorage.setItem('leucena_username', username);
            logEvent('google_auth_success', null, null, { username: data.username });
            onLoginSuccess(true);
          } else {
            logEvent('google_auth_error', null, null, { status: resp.status });
            showToast('Erro na autenticação Google', 'error');
          }
        } catch (e) {
          logEvent('google_auth_error', null, null, { error: e.message || String(e) });
          showToast('Erro na autenticação Google', 'error');
        }
      } else {
        authToken = googleCode;
        localStorage.setItem('leucena_token', authToken);
        tryRestoreSession(true);
      }
    } else if (authError) {
      window.history.replaceState({}, '', window.location.pathname);
      const errorMap = {
        no_code: 'Erro na autenticação Google (sem código)',
        token_failed: 'Falha ao obter token do Google',
        profile_failed: 'Falha ao obter perfil do Google',
        server_error: 'Erro interno na autenticação Google',
        account_deactivated: LeucenaI18n.t('auth.accountDeactivated')
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
        localStorage.setItem(_userKey('leucena_migration_dismissed'), '1');
      });
    }
  }

  function setupExpansionBanner() {
    var BANNER_KEY = 'leucena_brazil_launch_v2_dismissed';
    var BANNER_EXPIRES = new Date('2026-04-27T23:59:59Z').getTime();
    if (Date.now() > BANNER_EXPIRES) return;
    if (localStorage.getItem(BANNER_KEY)) return;
    var strip = document.getElementById('expansion-strip');
    if (!strip) return;
    strip.classList.remove('hidden');
    document.getElementById('expansion-strip-close').addEventListener('click', function () {
      strip.classList.add('hidden');
      localStorage.setItem(BANNER_KEY, '1');
    });
  }

  // ── State Picker ──

  var UF_META = {
    AC: { name: 'Acre', region: 'Norte' },
    AM: { name: 'Amazonas', region: 'Norte' },
    AP: { name: 'Amapá', region: 'Norte' },
    PA: { name: 'Pará', region: 'Norte' },
    RO: { name: 'Rondônia', region: 'Norte' },
    RR: { name: 'Roraima', region: 'Norte' },
    TO: { name: 'Tocantins', region: 'Norte' },
    AL: { name: 'Alagoas', region: 'Nordeste' },
    BA: { name: 'Bahia', region: 'Nordeste' },
    CE: { name: 'Ceará', region: 'Nordeste' },
    MA: { name: 'Maranhão', region: 'Nordeste' },
    PB: { name: 'Paraíba', region: 'Nordeste' },
    PE: { name: 'Pernambuco', region: 'Nordeste' },
    PI: { name: 'Piauí', region: 'Nordeste' },
    RN: { name: 'Rio Grande do Norte', region: 'Nordeste' },
    SE: { name: 'Sergipe', region: 'Nordeste' },
    DF: { name: 'Distrito Federal', region: 'Centro-Oeste' },
    GO: { name: 'Goiás', region: 'Centro-Oeste' },
    MS: { name: 'Mato Grosso do Sul', region: 'Centro-Oeste' },
    MT: { name: 'Mato Grosso', region: 'Centro-Oeste' },
    ES: { name: 'Espírito Santo', region: 'Sudeste' },
    MG: { name: 'Minas Gerais', region: 'Sudeste' },
    RJ: { name: 'Rio de Janeiro', region: 'Sudeste' },
    SP: { name: 'São Paulo', region: 'Sudeste' },
    PR: { name: 'Paraná', region: 'Sul' },
    RS: { name: 'Rio Grande do Sul', region: 'Sul' },
    SC: { name: 'Santa Catarina', region: 'Sul' }
  };

  var UF_BOUNDS = {
    AC: { minLat: -11.15, maxLat: -7.11, minLng: -73.99, maxLng: -66.62 },
    AL: { minLat: -10.50, maxLat: -8.81, minLng: -37.94, maxLng: -35.15 },
    AM: { minLat: -9.82, maxLat: 2.25, minLng: -73.79, maxLng: -56.10 },
    AP: { minLat: -1.24, maxLat: 4.44, minLng: -54.87, maxLng: -49.88 },
    BA: { minLat: -18.35, maxLat: -8.53, minLng: -46.62, maxLng: -37.34 },
    CE: { minLat: -7.86, maxLat: -2.78, minLng: -41.42, maxLng: -37.25 },
    DF: { minLat: -16.05, maxLat: -15.50, minLng: -48.29, maxLng: -47.31 },
    ES: { minLat: -21.30, maxLat: -17.89, minLng: -41.88, maxLng: -39.64 },
    GO: { minLat: -19.50, maxLat: -12.39, minLng: -53.25, maxLng: -45.91 },
    MA: { minLat: -10.26, maxLat: -1.05, minLng: -48.76, maxLng: -41.79 },
    MG: { minLat: -22.92, maxLat: -14.23, minLng: -51.05, maxLng: -39.86 },
    MS: { minLat: -24.07, maxLat: -17.17, minLng: -57.65, maxLng: -50.93 },
    MT: { minLat: -18.04, maxLat: -7.35, minLng: -61.63, maxLng: -50.22 },
    PA: { minLat: -9.83, maxLat: 2.59, minLng: -58.90, maxLng: -46.06 },
    PB: { minLat: -8.30, maxLat: -6.02, minLng: -38.77, maxLng: -34.79 },
    PE: { minLat: -9.48, maxLat: -7.33, minLng: -41.36, maxLng: -34.86 },
    PI: { minLat: -10.93, maxLat: -2.74, minLng: -45.99, maxLng: -40.37 },
    PR: { minLat: -26.72, maxLat: -22.52, minLng: -54.62, maxLng: -48.02 },
    RJ: { minLat: -23.37, maxLat: -20.76, minLng: -44.89, maxLng: -40.96 },
    RN: { minLat: -6.98, maxLat: -4.83, minLng: -37.26, maxLng: -34.95 },
    RO: { minLat: -13.69, maxLat: -7.97, minLng: -66.62, maxLng: -59.77 },
    RR: { minLat: -1.58, maxLat: 5.27, minLng: -64.82, maxLng: -58.88 },
    RS: { minLat: -33.75, maxLat: -27.08, minLng: -57.64, maxLng: -49.69 },
    SC: { minLat: -29.39, maxLat: -25.96, minLng: -53.84, maxLng: -48.55 },
    SE: { minLat: -11.57, maxLat: -9.51, minLng: -38.25, maxLng: -36.39 },
    SP: { minLat: -25.31, maxLat: -19.78, minLng: -53.11, maxLng: -44.16 },
    TO: { minLat: -13.47, maxLat: -5.17, minLng: -50.74, maxLng: -45.73 }
  };

  var REGION_ORDER = ['Sudeste', 'Sul', 'Centro-Oeste', 'Nordeste', 'Norte'];

  /**
   * If the page URL has ?region=... (or legacy ?state=...), validate it,
   * remove the param from the address bar, and return a valid UF code or null.
   * Examples: ?region=sp → SP, ?region=MG → MG. BR/Brasil/Brazil values → null (no full-grid view).
   */
  function _consumeRegionQueryParam() {
    try {
      var params = new URLSearchParams(window.location.search);
      var key = params.has('region') ? 'region' : params.has('state') ? 'state' : null;
      if (!key) return null;
      var raw = params.get(key);
      params.delete(key);
      var qs = params.toString();
      var newUrl = window.location.pathname + (qs ? '?' + qs : '') + (window.location.hash || '');
      window.history.replaceState({}, '', newUrl);

      if (raw == null || String(raw).trim() === '') return null;
      var u = String(raw).trim().toUpperCase();
      if (u === 'BR' || u === 'ALL' || u === 'BRASIL' || u === 'BRAZIL') return null;
      if (!/^[A-Z]{2}$/.test(u)) return null;
      if (!UF_META[u]) return null;
      return u;
    } catch (e) {
      return null;
    }
  }

  var _regionPickerReady = false;
  var _stateCounts = {};
  var _selectedUF = null;
  var _pendingMapInit = null;

  function showRegionPicker() {
    var modal = document.getElementById('region-picker-modal');
    if (!modal) return;
    logEvent('region_picker_open');
    modal.classList.remove('hidden');
    var search = document.getElementById('region-picker-search');
    if (search) { search.value = ''; _filterStateCards(''); search.focus(); }
    _highlightActiveCard();
  }

  function _highlightActiveCard() {
    var grid = document.getElementById('region-picker-grid');
    if (grid) {
      grid.querySelectorAll('.state-card').forEach(function (c) {
        c.classList.toggle('active', c.dataset.uf === _selectedUF);
      });
    }
    var brazilBtn = document.getElementById('region-picker-brazil-btn');
    if (brazilBtn) {
      brazilBtn.classList.toggle('active', !_selectedUF);
    }
  }

  function _filterStateCards(q) {
    var lower = q.toLowerCase().trim();
    var grid = document.getElementById('region-picker-grid');
    if (!grid) return;
    grid.querySelectorAll('.state-card').forEach(function (c) {
      var uf = c.dataset.uf;
      var meta = UF_META[uf];
      var match = !lower || uf.toLowerCase().indexOf(lower) !== -1 ||
        (meta && meta.name.toLowerCase().indexOf(lower) !== -1);
      c.classList.toggle('hidden-by-filter', !match);
    });
    grid.querySelectorAll('.state-region-header').forEach(function (h) {
      var group = h.nextElementSibling;
      if (!group) return;
      var anyVisible = group.querySelector('.state-card:not(.hidden-by-filter)');
      h.style.display = anyVisible ? '' : 'none';
      group.style.display = anyVisible ? '' : 'none';
    });
  }

  function selectState(uf) {
    var prevState = _selectedUF;
    _selectedUF = uf;
    localStorage.setItem('leucena_selected_state', uf);
    var label = document.getElementById('region-chip-label');
    if (label) label.textContent = uf;
    closeRegionPicker();
    logEvent('state_select', null, null, { state: uf, from: prevState || 'brazil' });
    if (typeof LeucenaCollab !== 'undefined' && LeucenaCollab.notifyLocationState) {
      LeucenaCollab.notifyLocationState(uf);
    }
    _clearSelectionForRegionNav();
    if (typeof LeucenaMap !== 'undefined' && LeucenaMap.loadStateGrid) {
      LeucenaMap.loadStateGrid(uf);
    }
  }

  function showBrazilOverview() {
    var prevState = _selectedUF;
    _selectedUF = null;
    localStorage.removeItem('leucena_selected_state');
    var label = document.getElementById('region-chip-label');
    if (label) label.textContent = 'Brasil';
    closeRegionPicker();
    logEvent('brazil_overview', null, null, { from: prevState || 'brazil' });
    if (typeof LeucenaCollab !== 'undefined' && LeucenaCollab.notifyLocationState) {
      LeucenaCollab.notifyLocationState('BR');
    }
    _clearSelectionForRegionNav();
    if (typeof LeucenaMap !== 'undefined' && LeucenaMap.loadStateGrid) {
      LeucenaMap.loadStateGrid(null);
    }
  }

  function selectStateFromMap(uf) {
    if (!uf || !UF_META[uf]) return;
    selectState(uf);
  }

  var BRAZIL_BBOX = { minLat: -33.75, maxLat: 5.27, minLng: -73.99, maxLng: -34.79 };

  function _isInsideBrazil(lat, lng) {
    return lat >= BRAZIL_BBOX.minLat && lat <= BRAZIL_BBOX.maxLat &&
           lng >= BRAZIL_BBOX.minLng && lng <= BRAZIL_BBOX.maxLng;
  }

  function _detectUfForLatLng(lat, lng) {
    var exact = null;
    var bestUf = null;
    var bestDist = Infinity;
    for (var uf in UF_BOUNDS) {
      var b = UF_BOUNDS[uf];
      if (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng) {
        exact = uf;
        break;
      }
      var cLat = (b.minLat + b.maxLat) / 2;
      var cLng = (b.minLng + b.maxLng) / 2;
      var d = (lat - cLat) * (lat - cLat) + (lng - cLng) * (lng - cLng);
      if (d < bestDist) { bestDist = d; bestUf = uf; }
    }
    return exact || (_isInsideBrazil(lat, lng) ? bestUf : null);
  }

  function _geolocateToState() {
    if (!navigator.geolocation) {
      showToast(LeucenaI18n.t('map.geoNotSupported'), 'warning');
      return;
    }
    var btn = document.getElementById('region-picker-geo-btn');
    if (btn) btn.classList.add('loading');
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        if (btn) btn.classList.remove('loading');
        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;
        if (!_isInsideBrazil(lat, lng)) {
          showBrazilOverview();
          showToast(LeucenaI18n.t('map.geoPickerOutsideBrazil'), 'warning');
          return;
        }
        var detectedUf = _detectUfForLatLng(lat, lng);
        if (detectedUf) {
          if (typeof LeucenaCollab !== 'undefined' && LeucenaCollab.notifyLocationState) {
            LeucenaCollab.notifyLocationState(detectedUf);
          }
          selectState(detectedUf);
          var name = UF_META[detectedUf] ? UF_META[detectedUf].name : detectedUf;
          showToast(LeucenaI18n.t('map.geoStateDetected', name), 'success');
        } else {
          showBrazilOverview();
          showToast(LeucenaI18n.t('map.geoPickerOutsideBrazil'), 'warning');
        }
      },
      function (err) {
        if (btn) btn.classList.remove('loading');
        if (err.code === 1) {
          showToast(LeucenaI18n.t('map.geoDenied'), 'warning');
        } else {
          showToast(LeucenaI18n.t('map.geoError'), 'warning');
        }
      },
      { timeout: 8000 }
    );
  }

  function _buildStateGrid(counts) {
    var grid = document.getElementById('region-picker-grid');
    if (!grid) return;
    grid.innerHTML = '';
    var byRegion = {};
    REGION_ORDER.forEach(function (r) { byRegion[r] = []; });
    for (var uf in UF_META) {
      var meta = UF_META[uf];
      if (!byRegion[meta.region]) byRegion[meta.region] = [];
      byRegion[meta.region].push(uf);
    }
    REGION_ORDER.forEach(function (region) {
      var ufs = byRegion[region];
      if (!ufs || ufs.length === 0) return;
      var header = document.createElement('div');
      header.className = 'state-region-header';
      header.textContent = region;
      grid.appendChild(header);
      var group = document.createElement('div');
      group.className = 'state-region-group';
      ufs.forEach(function (uf) {
        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'state-card';
        card.dataset.uf = uf;
        var cnt = counts[uf] || 0;
        card.innerHTML =
          '<span class="state-card-uf">' + uf + '</span>' +
          '<div class="state-card-info">' +
            '<div class="state-card-name">' + UF_META[uf].name + '</div>' +
            '<div class="state-card-count">' + cnt + ' célula' + (cnt !== 1 ? 's' : '') + '</div>' +
          '</div>';
        card.addEventListener('click', function () { selectState(uf); });
        group.appendChild(card);
      });
      grid.appendChild(group);
    });
  }

  async function setupRegionPicker() {
    var fromUrl = _consumeRegionQueryParam();
    if (fromUrl) {
      localStorage.setItem('leucena_selected_state', fromUrl);
    }

    var saved = localStorage.getItem('leucena_selected_state');
    if (saved && UF_META[saved]) {
      _selectedUF = saved;
      _pendingMapInit = saved;
      var labelEarly = document.getElementById('region-chip-label');
      if (labelEarly) labelEarly.textContent = saved;
    } else {
      _selectedUF = null;
      _pendingMapInit = null;
      var labelDef = document.getElementById('region-chip-label');
      if (labelDef) labelDef.textContent = 'Brasil';
    }

    try {
      var res = await fetch('/api/states');
      var rows = await res.json();
      var mapStats = {};
      rows.forEach(function (r) {
        _stateCounts[r.state] = r.cell_count;
        var total = r.cell_count || 0;
        var finished = r.finished_count || 0;
        var mapping = r.mapping_count || 0;
        var tomap = r.tomap_count || 0;
        var nopoints = total - finished - mapping - tomap;
        var relevant = total - nopoints;
        var denom = relevant > 0 ? relevant : 1;
        mapStats[r.state] = {
          cells: total,
          finished: finished,
          mapping: mapping,
          tomap: tomap,
          pointsRegistered: r.points_registered != null ? Number(r.points_registered) : 0,
          pctFinished: relevant > 0 ? (finished / denom) * 100 : 0,
          pctMapping: relevant > 0 ? (mapping / denom) * 100 : 0,
          pctTomap: relevant > 0 ? (tomap / denom) * 100 : 0,
          pct: relevant > 0 ? ((finished + mapping) / denom) * 100 : 0
        };
      });
      if (typeof LeucenaMap !== 'undefined' && LeucenaMap.setStateStats) {
        LeucenaMap.setStateStats(mapStats);
      }
    } catch (e) {
      for (var uf in UF_META) _stateCounts[uf] = 0;
    }
    _buildStateGrid(_stateCounts);

    var modal = document.getElementById('region-picker-modal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeRegionPicker();
      });
    }
    var closeBtn = document.getElementById('region-picker-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeRegionPicker);
    }
    var search = document.getElementById('region-picker-search');
    if (search) {
      search.addEventListener('input', function () { _filterStateCards(search.value); });
    }
    var geoBtn = document.getElementById('region-picker-geo-btn');
    if (geoBtn) {
      geoBtn.addEventListener('click', _geolocateToState);
    }
    var brazilBtn = document.getElementById('region-picker-brazil-btn');
    if (brazilBtn) {
      brazilBtn.addEventListener('click', function () { showBrazilOverview(); });
    }
    var chip = document.getElementById('region-chip');
    if (chip) {
      chip.addEventListener('click', showRegionPicker);
    }

    var sidebarChooseBtn = document.getElementById('sidebar-choose-state-btn');
    if (sidebarChooseBtn) {
      sidebarChooseBtn.addEventListener('click', showRegionPicker);
    }

    _regionPickerReady = true;
  }

  function closeRegionPicker() {
    var modal = document.getElementById('region-picker-modal');
    if (modal) modal.classList.add('hidden');
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
  const TOUR_VERSION = 'v4';
  let _tourStartedFrom = null;
  let _tourStep = 0;
  let _tourSpotlight = null;

  const TOUR_STEPS = [
    { target: '#region-chip',     text: 'tour.stepRegion' },
    { target: '#guide-btn',       text: 'tour.step1' },
    { target: '#user-badge',      text: 'tour.step2' },
    { target: '#sidebar-toggle',  text: 'tour.step3' },
    { target: '#toolbar',          text: 'tour.step4' },
    { target: '#btn-my-location', text: 'tour.step5' },
    { target: '#map',             text: 'tour.step6' },
  ];

  const Onboarding = {
    isTourCompleted()  { return localStorage.getItem(_userKey('leucena_tour_completed')) === TOUR_VERSION; },
    isWelcomeShown()   { return localStorage.getItem(_userKey('leucena_welcome_dismissed')) === WELCOME_VERSION; },
    setTourCompleted() { localStorage.setItem(_userKey('leucena_tour_completed'), TOUR_VERSION); },
    setWelcomeShown()  { localStorage.setItem(_userKey('leucena_welcome_dismissed'), WELCOME_VERSION); },

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
    const safeSrc = profile && profile.photo ? safePhotoSrc(profile.photo) : '';
    if (safeSrc) {
      avatarEl.innerHTML = '<img src="' + safeSrc + '" alt="">';
    } else {
      avatarEl.innerHTML = '';
      avatarEl.textContent = (displayName || username).toString().charAt(0).toUpperCase();
    }
  }

  async function loadUserProfile() {
    if (!isLoggedIn()) return;
    const fetchOpts = { headers: authHeaders(), cache: 'no-store' };
    try {
      const res = await fetch('/api/auth/me', fetchOpts);
      if (res.ok) {
        const data = await res.json();
        _userAuthInfo = { auth_provider: data.auth_provider, email_verified: data.email_verified, has_google: data.has_google, login_count: data.login_count || 0, mask_count: data.mask_count || 0, role: data.role || 'contributor', is_local: !!data.is_local };
        showVerificationBannerIfNeeded();
        loadRankingWidget();
        syncUserBadgeProfileHint();
      }
      const profRes = await fetch('/api/profile', fetchOpts);
      if (profRes.ok) {
        const profile = await profRes.json();
        applyProfileToUI(profile);
      }
    } catch (e) { /* ignore */ }
  }

  let profilePhotoDataUrl = null;
  let adminEditingUser = null;

  function _setProfileReferral(source, detail) {
    const sel = document.getElementById('profile-referral-source');
    const det = document.getElementById('profile-referral-detail');
    if (!sel || !det) return;
    sel.value = source || '';
    if (source) {
      det.classList.remove('hidden');
      det.value = detail || '';
      det.placeholder = _referralPlaceholder(source);
    } else {
      det.classList.add('hidden');
      det.value = '';
    }
  }

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

    const usernameInput = document.getElementById('profile-username');
    if (socialSection) socialSection.style.display = '';

    if (targetUser) {
      adminEditingUser = targetUser;
      titleEl.textContent = t('admin.editProfileTitle', targetUser.username);
      if (pwSection) pwSection.style.display = 'none';
      if (subtitleEl) subtitleEl.textContent = t('profile.subtitleMember');
      document.getElementById('profile-full-name').value = targetUser.full_name || '';
      document.getElementById('profile-occupation').value = targetUser.occupation || '';
      document.getElementById('profile-description').value = targetUser.description || '';
      usernameInput.value = targetUser.username || '';
      emailInput.value = targetUser.email || '';
      emailInput.disabled = false;
      document.getElementById('profile-linkedin').value = targetUser.linkedin || '';
      document.getElementById('profile-scholar').value = targetUser.scholar || '';
      _setProfileReferral(targetUser.referral_source, targetUser.referral_detail);
      updateProfileCharCount();
      const preview = document.getElementById('profile-photo-preview');
      const safeProfSrc = safePhotoSrc(targetUser.photo);
      if (safeProfSrc) {
        preview.innerHTML = '<img src="' + safeProfSrc + '" alt="">';
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
      if (subtitleEl) subtitleEl.textContent = t((effRole === 'contributor') ? 'profile.subtitleContributor' : 'profile.subtitleMember');
      emailInput.disabled = true;
      try {
        const res = await fetch('/api/profile', { headers: authHeaders(), cache: 'no-store' });
        if (!res.ok) return;
        const p = await res.json();
        document.getElementById('profile-full-name').value = p.full_name || '';
        document.getElementById('profile-occupation').value = p.occupation || '';
        document.getElementById('profile-description').value = p.description || '';
        usernameInput.value = p.username || username || '';
        emailInput.value = p.email || '';
        document.getElementById('profile-linkedin').value = p.linkedin || '';
        document.getElementById('profile-scholar').value = p.scholar || '';
        _setProfileReferral(p.referral_source, p.referral_detail);
        updateProfileCharCount();
        const preview = document.getElementById('profile-photo-preview');
        const safeProfSrc2 = safePhotoSrc(p.photo);
        if (safeProfSrc2) {
          preview.innerHTML = '<img src="' + safeProfSrc2 + '" alt="">';
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

  // updateProfileAuthUI removed — Google/email-status sections moved out of profile modal

  function closeProfileModal() {
    document.getElementById('profile-modal').classList.add('hidden');
    const wasAdminEditing = !!adminEditingUser;
    adminEditingUser = null;
    if (wasAdminEditing) openAdminUsersModal();
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
        logEvent('password_change_success');
        showToast(LeucenaI18n.t('profile.pwChanged'), 'success');
        pwInput.value = '';
      } else {
        const err = await res.json();
        logEvent('password_change_error', null, null, { error: err.error });
        showToast(err.error, 'error');
      }
    } catch (e) { showToast('Erro de conexão', 'error'); }
  }

  function updateProfileCharCount() {
    const n = document.getElementById('profile-description').value.length;
    document.getElementById('profile-char-n').textContent = n;
  }

  const PHOTO_MAX_BYTES = 200000;
  const PHOTO_MAX_DIM = 256;

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.width, h = img.height;
        if (w > PHOTO_MAX_DIM || h > PHOTO_MAX_DIM) {
          const ratio = Math.min(PHOTO_MAX_DIM / w, PHOTO_MAX_DIM / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        let quality = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > PHOTO_MAX_BYTES * 1.37 && quality > 0.3) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')); };
      img.src = url;
    });
  }

  const MSG_PHOTO_MAX_BYTES = 200000;
  const MSG_PHOTO_MAX_DIM = 800;
  const MSG_PHOTO_MAX_COUNT = 2;
  let _composeImages = [];

  function compressMessageImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.width, h = img.height;
        if (w > MSG_PHOTO_MAX_DIM || h > MSG_PHOTO_MAX_DIM) {
          const ratio = Math.min(MSG_PHOTO_MAX_DIM / w, MSG_PHOTO_MAX_DIM / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        let quality = 0.82;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > MSG_PHOTO_MAX_BYTES * 1.37 && quality > 0.25) {
          quality -= 0.08;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')); };
      img.src = url;
    });
  }

  function _renderComposeImagePreviews() {
    const container = document.getElementById('compose-image-previews');
    if (_composeImages.length === 0) { container.classList.add('hidden'); container.innerHTML = ''; return; }
    container.classList.remove('hidden');
    container.innerHTML = _composeImages.map((src, i) =>
      '<div class="compose-thumb">' +
        '<img src="' + src + '" alt="img">' +
        '<button type="button" class="compose-thumb-remove" data-idx="' + i + '">&times;</button>' +
      '</div>'
    ).join('');
    container.querySelectorAll('.compose-thumb-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        _composeImages.splice(Number(btn.dataset.idx), 1);
        _renderComposeImagePreviews();
      });
    });
  }

  function compressDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > PHOTO_MAX_DIM || h > PHOTO_MAX_DIM) {
          const ratio = Math.min(PHOTO_MAX_DIM / w, PHOTO_MAX_DIM / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        let quality = 0.85;
        let result = canvas.toDataURL('image/jpeg', quality);
        while (result.length > PHOTO_MAX_BYTES * 1.37 && quality > 0.3) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(result);
      };
      img.onerror = () => reject(new Error('image load failed'));
      img.src = dataUrl;
    });
  }

  async function handleProfilePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const compressed = await compressImage(file);
      profilePhotoDataUrl = compressed;
      const preview = document.getElementById('profile-photo-preview');
      preview.innerHTML = '<img src="' + profilePhotoDataUrl + '" alt="">';
    } catch (err) {
      showToast('Erro ao processar foto', 'error');
      e.target.value = '';
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    logEvent('profile_save');
    const full_name = document.getElementById('profile-full-name').value.trim() || null;
    const occupation = document.getElementById('profile-occupation').value.trim() || null;
    const description = document.getElementById('profile-description').value.trim() || null;
    const emailInput = document.getElementById('profile-email');
    const email = adminEditingUser ? (emailInput.value.trim() || null) : undefined;
    const linkedin = document.getElementById('profile-linkedin').value.trim() || null;
    const scholar = document.getElementById('profile-scholar').value.trim() || null;
    const errorEl = document.getElementById('profile-error');
    errorEl.classList.add('hidden');
    if (occupation && occupation.length > 120) {
      errorEl.textContent = LeucenaI18n.t('profile.occupationTooLong');
      errorEl.classList.remove('hidden');
      return;
    }
    if (description && description.length > 400) {
      errorEl.textContent = 'Descrição deve ter no máximo 400 caracteres.';
      errorEl.classList.remove('hidden');
      return;
    }
    try {
      const url = adminEditingUser
        ? `/api/admin/users/${adminEditingUser.id}/profile`
        : '/api/profile';
      const referral_source = (document.getElementById('profile-referral-source') || {}).value || null;
      const referral_detail = (document.getElementById('profile-referral-detail') || {}).value || null;
      const payload = { full_name, occupation, description, photo: profilePhotoDataUrl, linkedin, scholar, referral_source, referral_detail: referral_detail ? referral_detail.trim() : null };
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
        logEvent('profile_save_error', null, null, { error: err.error, admin: !!adminEditingUser });
        return;
      }
      const wasAdmin = !!adminEditingUser;
      logEvent('profile_save_success', null, null, { admin: wasAdmin, target: wasAdmin ? adminEditingUser.username : null });
      closeProfileModal();
      if (!wasAdmin) {
        await loadUserProfile();
      }
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

      function cardHtml(person, medalIndex, isCollab) {
        const name = person.full_name || person.username;
        const safePersonPhoto = safePhotoSrc(person.photo);
        const thumb = safePersonPhoto
          ? '<img src="' + safePersonPhoto + '" alt="">'
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
        if (isCollab) {
          return '<div class="about-card about-card--collab"><div class="about-card-thumb">' + thumb + '</div><div class="about-card-info">' + rankBadgeHtml + '<div class="about-card-name">' + escapeHtml(name) + '</div></div></div>';
        }
        const desc = person.description || '';
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
        html += '<div class="about-section-title">' + t('about.colaboradores') + '</div><div class="about-cards about-cards--collab">';
        colaboradores.forEach((p, i) => { html += cardHtml(p, i, true); });
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
    logEvent('logout');
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

    if (typeof LeucenaCollab !== 'undefined' && LeucenaCollab.leave) LeucenaCollab.leave();

    authToken = null;
    username = null;
    _loginSuccessRan = false;
    localStorage.removeItem('leucena_token');
    localStorage.removeItem('leucena_username');

    document.getElementById('auth-nav-group').classList.remove('hidden');
    document.getElementById('user-badge').classList.add('hidden');
    document.getElementById('logout-btn').classList.add('hidden');
    document.getElementById('edit-mode-badge').classList.add('hidden');
    document.getElementById('inbox-bell-btn').classList.add('hidden');
    stopInboxPolling();

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

  function setupCollapsibleFilters() {
    document.querySelectorAll('.filter-group[data-collapsible]').forEach(group => {
      const chevron = group.querySelector('.filter-chevron');
      const subgroup = group.querySelector('.filter-subgroup');
      if (!chevron || !subgroup) return;

      chevron.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isExpanded = chevron.classList.toggle('expanded');
        subgroup.classList.toggle('collapsed', !isExpanded);
      });

      const parentRow = group.querySelector('.filter-item-parent');
      if (parentRow) {
        parentRow.addEventListener('click', (e) => {
          if (e.target.tagName === 'INPUT') return;
          e.preventDefault();
          const isExpanded = chevron.classList.toggle('expanded');
          subgroup.classList.toggle('collapsed', !isExpanded);
        });
      }
    });
  }

  function _initSidebarSwipe() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    let startX = 0, startY = 0, tracking = false;
    sidebar.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      tracking = true;
    }, { passive: true });
    sidebar.addEventListener('touchend', (e) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (dx < -60 && Math.abs(dy) < Math.abs(dx)) {
        closeSidebar();
      }
    }, { passive: true });
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
  let legendAutoCollapseTimer = null;
  let legendPostCollapseFlashTimer = null;
  let legendExpandHintActive = false;
  const LEGEND_AUTO_COLLAPSE_MS = 3000;
  const LEGEND_FLASH_AFTER_COLLAPSE_MS = 320;

  function clearLegendAutoCollapseTimer() {
    if (legendAutoCollapseTimer) {
      clearTimeout(legendAutoCollapseTimer);
      legendAutoCollapseTimer = null;
    }
  }

  function clearLegendPostCollapseFlashTimer() {
    if (legendPostCollapseFlashTimer) {
      clearTimeout(legendPostCollapseFlashTimer);
      legendPostCollapseFlashTimer = null;
    }
  }

  function syncLegendToggleTitle() {
    const btn = document.getElementById('legend-toggle');
    if (!btn) return;
    btn.title = legendExpandHintActive
      ? LeucenaI18n.t('legend.expandHint')
      : LeucenaI18n.t('legend.toggleTooltip');
  }

  function refreshLegendToggleTitleForLang() {
    syncLegendToggleTitle();
  }

  function playLegendToggleFlash() {
    const btn = document.getElementById('legend-toggle');
    if (!btn) return;
    const onEnd = (e) => {
      if (e.animationName !== 'legend-toggle-flash') return;
      btn.classList.remove('legend-toggle-pulse');
      btn.removeEventListener('animationend', onEnd);
    };
    btn.removeEventListener('animationend', onEnd);
    btn.classList.remove('legend-toggle-pulse');
    void btn.offsetWidth;
    btn.classList.add('legend-toggle-pulse');
    btn.addEventListener('animationend', onEnd);
  }

  function performAutoCollapseLegend() {
    if (legendUserControlled) return;
    legendUserControlled = true;
    legendExpandHintActive = true;
    const leg = document.getElementById('map-legend');
    if (leg) leg.classList.add('collapsed');
    syncLegendToggleTitle();
    clearLegendPostCollapseFlashTimer();
    legendPostCollapseFlashTimer = setTimeout(() => {
      legendPostCollapseFlashTimer = null;
      playLegendToggleFlash();
    }, LEGEND_FLASH_AFTER_COLLAPSE_MS);
  }

  function scheduleAutoCollapseLegend() {
    clearLegendAutoCollapseTimer();
    legendAutoCollapseTimer = setTimeout(() => {
      legendAutoCollapseTimer = null;
      performAutoCollapseLegend();
    }, LEGEND_AUTO_COLLAPSE_MS);
  }

  function toggleLegend() {
    clearLegendAutoCollapseTimer();
    clearLegendPostCollapseFlashTimer();
    legendUserControlled = true;
    legendExpandHintActive = false;
    const btn = document.getElementById('legend-toggle');
    if (btn) btn.classList.remove('legend-toggle-pulse');
    const legendEl = document.getElementById('map-legend');
    if (!legendEl) return;
    const collapsed = legendEl.classList.toggle('collapsed');
    syncLegendToggleTitle();
    logEvent(collapsed ? 'legend_collapse' : 'legend_expand');
  }

  function updateLegendVisibility(sidebarOpen) {
    const legend = document.getElementById('map-legend');
    const locBtn = document.getElementById('btn-my-location');
    const usersBtn = document.getElementById('toggle-users-btn');
    // Sidebar should not hide legend/location; legend is shifted via CSS when sidebar is open.
    if (legend) legend.classList.remove('legend-hidden');
    if (locBtn) locBtn.classList.remove('legend-hidden');
    if (usersBtn) usersBtn.classList.remove('legend-hidden');
  }

  // ── Map init ──

  function onMapsReady() {
    mapsLoaded = true;
    initMapModules();
  }

  function initMapModules() {
    if (mapsInitialized || !mapsLoaded) return;
    mapsInitialized = true;
    LeucenaMap.init(_pendingMapInit);
    LeucenaDrawing.init();
    LeucenaStreetView.init();
    LeucenaExport.init();
    _restoreReloadState();
  }

  // Restore the user's last camera/UF after the map mounts. We read a per-user key first so
  // distinct accounts on the same browser don't see each other's view, falling back to the
  // legacy anonymous key. The entry is *not* deleted — collaboration.js keeps it fresh on
  // every idle, so a normal F5 (no deploy) also restores transparently.
  function _restoreReloadState() {
    try {
      var u = localStorage.getItem('leucena_username');
      var keys = u ? ['leucena_reload_state_' + u, 'leucena_reload_state'] : ['leucena_reload_state'];
      var raw = null;
      for (var i = 0; i < keys.length && !raw; i++) raw = localStorage.getItem(keys[i]);
      if (!raw) {
        if (typeof LeucenaCollab !== 'undefined' && LeucenaCollab.installContinuousStateSaver) {
          LeucenaCollab.installContinuousStateSaver();
        }
        return;
      }
      var st = JSON.parse(raw);
      var gmap = LeucenaMap.getMap();
      if (!gmap) return;
      // After the very first 'idle' (post fitBounds for the UF), re-apply the saved camera.
      // Stays a single-frame correction, so it reads as a continuation of the page load
      // rather than a separate animation.
      google.maps.event.addListenerOnce(gmap, 'idle', function () {
        if (st.lat != null && st.lng != null) gmap.setCenter({ lat: st.lat, lng: st.lng });
        if (st.zoom != null) gmap.setZoom(st.zoom);
        if (typeof LeucenaCollab !== 'undefined' && LeucenaCollab.installContinuousStateSaver) {
          LeucenaCollab.installContinuousStateSaver();
        }
      });
    } catch (e) { /* best effort */ }
  }

  // ── Cell selection ──

  function formatAreaStr(areaHa) {
    if (areaHa == null || areaHa === 0) return '0';
    if (areaHa < 0.1) {
      const m2 = Math.round(areaHa * 10000);
      return m2.toLocaleString() + ' m\u00B2';
    }
    return areaHa.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' ha';
  }

  function updateCellMasksDisplay(cellData) {
    const masksRow = document.getElementById('cell-masks-row');
    const masksEl = document.getElementById('cell-masks');
    if (!masksRow || !masksEl) return;
    const count = cellData.mask_count || 0;
    if (count === 0) {
      masksRow.classList.add('hidden');
    } else {
      masksRow.classList.remove('hidden');
      const area = cellData.mask_area_ha || 0;
      masksEl.textContent = `${count} (${formatAreaStr(area)})`;
    }
  }

  function updateCellAttributionDisplay(cellData) {
    if (!cellData) return;
    const teamTools = isTeamOrAbove();

    const finishedByRow = document.getElementById('cell-finished-by-row');
    const cleanedFinished = cleanUserList(cellData.finished_by);
    const showFinished = teamTools && !!cleanedFinished;
    if (finishedByRow) finishedByRow.classList.toggle('hidden', !showFinished);
    const finEl = document.getElementById('cell-finished-by');
    if (finEl && showFinished) finEl.textContent = cleanedFinished;

    const mappedRow = document.getElementById('cell-mapped-by-row');
    const mappedEl = document.getElementById('cell-mapped-by');
    const cleanedMapped = cleanUserList(cellData.mapped_by);
    const showMapped = teamTools && !!cleanedMapped;
    if (mappedRow) mappedRow.classList.toggle('hidden', !showMapped);
    if (mappedEl && showMapped) mappedEl.textContent = cleanedMapped;

    const lockHistRow = document.getElementById('cell-lock-history-row');
    const lockHistEl = document.getElementById('cell-lock-history');
    const cleanedLockHist = cleanUserList(cellData.worked_by);
    const showLockHist = teamTools && !!cleanedLockHist;
    if (lockHistRow) lockHistRow.classList.toggle('hidden', !showLockHist);
    if (lockHistEl && showLockHist) lockHistEl.textContent = cleanedLockHist;

    const breakdownWrap = document.getElementById('cell-admin-mask-breakdown-wrap');
    if (breakdownWrap) {
      if (teamTools && (cellData.mask_count || 0) > 0 && cellData.id != null) {
        loadAdminMaskBreakdown(cellData.id);
      } else {
        _maskBreakdownSeq++;
        breakdownWrap.classList.add('hidden');
        const ul = document.getElementById('cell-admin-mask-breakdown');
        if (ul) ul.innerHTML = '';
      }
    }
  }

  async function loadAdminMaskBreakdown(cellId) {
    if (!isTeamOrAbove()) return;
    const mySeq = ++_maskBreakdownSeq;
    const wrap = document.getElementById('cell-admin-mask-breakdown-wrap');
    const ul = document.getElementById('cell-admin-mask-breakdown');
    if (!wrap || !ul) return;
    try {
      const res = await fetch(`/api/polygons?grid_cell_id=${encodeURIComponent(cellId)}`, { headers: authHeaders() });
      if (!res.ok) {
        wrap.classList.add('hidden');
        return;
      }
      const fc = await res.json();
      if (mySeq !== _maskBreakdownSeq || selectedCellId !== cellId) return;
      const byUser = {};
      for (const f of fc.features || []) {
        const u = (f.properties && f.properties.created_by) || '?';
        if (u === 'deleted') continue;
        if (!byUser[u]) byUser[u] = { n: 0, ha: 0 };
        byUser[u].n++;
        byUser[u].ha += Number(f.properties && f.properties.area_ha) || 0;
      }
      ul.innerHTML = '';
      const keys = Object.keys(byUser);
      if (keys.length === 0) {
        wrap.classList.add('hidden');
        return;
      }
      keys.sort((a, b) => byUser[b].n - byUser[a].n);
      const t = LeucenaI18n.t;
      for (const u of keys) {
        const { n, ha } = byUser[u];
        const haR = Math.round(ha * 10) / 10;
        const li = document.createElement('li');
        li.textContent = t('sidebar.maskBreakdownLine', u, String(n), String(haR));
        ul.appendChild(li);
      }
      wrap.classList.remove('hidden');
    } catch (e) {
      wrap.classList.add('hidden');
    }
  }

  function refreshCellSidebarIfSelected(cellId) {
    if (selectedCellId !== cellId || !selectedCellData) return;
    updateCellMasksDisplay(selectedCellData);
    updateCellAttributionDisplay(selectedCellData);
  }

  function selectCell(cellId, cellData) {
    if (cellId === selectedCellId && !(username && selectedCellData && selectedCellData.locked_by === username)) {
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
    const displayId = displayCellId(cellData, cellId);
    document.getElementById('cell-id-display').textContent = displayId;

    const t = LeucenaI18n.t;
    document.getElementById('cell-status-display').textContent = formatStatus(cellData.grid_status);

    const numpoints = cellData.numpoints != null ? cellData.numpoints : '--';
    const numpointsEl = document.getElementById('cell-numpoints');
    if (numpointsEl) numpointsEl.textContent = numpoints;

    updateCellMasksDisplay(cellData);
    updateCellAttributionDisplay(cellData);

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

  /** Drop map/UI cell selection when changing Brasil ↔ UF, unless this user still holds the edit lock. */
  function _clearSelectionForRegionNav() {
    if (selectedCellData && selectedCellData.locked_by === username) return;
    clearCellSelection();
  }

  function clearCellSelection() {
    if (selectedCellId) logEvent('cell_deselect', selectedCellId);
    _maskBreakdownSeq++;
    if (lockHeartbeatInterval) { clearInterval(lockHeartbeatInterval); lockHeartbeatInterval = null; }
    if (typeof LeucenaMap !== 'undefined') {
      LeucenaMap.setEditingCell(null);
      LeucenaMap.setSelectedCell(null);
    }
    document.getElementById('main-content').classList.remove('editing-cell');
    selectedCellId = null;
    selectedCellData = null;
    document.getElementById('cell-actions').classList.add('hidden');
    document.getElementById('selected-cell-info').classList.add('hidden');
    document.getElementById('tool-unlock').disabled = true;
    enableTools(false);
    if (typeof LeucenaDrawing !== 'undefined') LeucenaDrawing.deactivate();
  }

  function syncStreetViewButtonTitle() {
    const btn = document.getElementById('tool-streetview');
    const wrap = document.getElementById('tool-streetview-wrap');
    if (!btn || !wrap) return;
    if (btn.disabled) {
      btn.removeAttribute('title');
      wrap.title = LeucenaI18n.t('tool.streetviewDisabledHint');
    } else {
      wrap.removeAttribute('title');
      btn.title = LeucenaI18n.t('tool.streetview');
    }
  }

  function refreshStreetViewTitleForLang() {
    syncStreetViewButtonTitle();
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
    if (selectBtn) { selectBtn.disabled = false; selectBtn.classList.add('active'); }
    const pointMode = insertionMode || deletionMode;
    document.getElementById('tool-streetview').disabled = !(enabled || pointMode);
    syncStreetViewButtonTitle();
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
    const subEl = document.getElementById('unlock-modal-subtitle');
    const nfLabel = document.getElementById('unlock-not-finished-label');
    const isContributor = getEffectiveRole() === 'contributor';

    if (isContributor) {
      finBtn.classList.add('hidden');
      notice.classList.add('hidden');
      if (subEl) {
        subEl.setAttribute('data-i18n', 'unlock.subtitleContributor');
        subEl.textContent = LeucenaI18n.t('unlock.subtitleContributor');
      }
      if (nfLabel) {
        nfLabel.setAttribute('data-i18n', 'unlock.finishEditing');
        nfLabel.textContent = LeucenaI18n.t('unlock.finishEditing');
      }
    } else {
      const hasCrowd = LeucenaMap.cellHasCrowdmapping(selectedCellId);
      const hasMasks = (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.getPolygonCountForCell)
        ? LeucenaDrawing.getPolygonCountForCell(selectedCellId) > 0
        : false;
      const allPointsResolved = !LeucenaMap.cellHasUnvalidatedPoints(selectedCellId);
      const canFinish = hasMasks || (allPointsResolved && LeucenaMap.cellHasAnyPoints(selectedCellId));

      const isAdminOrAbove = isAdminUser();
      finBtn.classList.toggle('hidden', (hasCrowd && !isAdminOrAbove) || !canFinish);
      notice.classList.toggle('hidden', !hasCrowd || isAdminOrAbove);
      if (subEl) {
        subEl.setAttribute('data-i18n', 'unlock.subtitle');
        subEl.textContent = LeucenaI18n.t('unlock.subtitle');
      }
      if (nfLabel) {
        nfLabel.setAttribute('data-i18n', 'unlock.notFinished');
        nfLabel.textContent = LeucenaI18n.t('unlock.notFinished');
      }
    }

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
        logEvent('cell_unlock_error', cellId, null, { error: err.error, status: res.status, uncoveredPoints: (err.uncoveredPointIds || []).length });
        return;
      }
      const data = await res.json();
      const finalStatus = data.status || status;
      logEvent('cell_unlock', cellId, null, { status: finalStatus, maskCount: data.maskCount || 0 });
      closeUnlockModal();

      if (insertionMode) setInsertionMode(false);
      if (deletionMode) setDeletionMode(false);

      if (selectedCellData) {
        selectedCellData.locked_by = null;
        selectedCellData.grid_status = finalStatus;
        selectedCellData.finished_by = data.finished_by || null;
        selectedCellData.worked_by = data.worked_by || null;
        if (data.mapped_by !== undefined) selectedCellData.mapped_by = data.mapped_by;
      }

      LeucenaMap.updateCellAppearance(cellId, selectedCellData || {});
      LeucenaMap.setEditingCell(null);
      LeucenaMap.releasePanRestriction();
      document.getElementById('main-content').classList.remove('editing-cell');
      LeucenaCollab.notifyEditingCell(null);
      LeucenaCollab.notifyActivity(null);

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
      }

      const displayId = displayCellId(selectedCellData, cellId);
      let msg = LeucenaI18n.t('toast.cellUnlocked', displayId, formatStatus(finalStatus));

      if (selectedCellData) {
        selectedCellData.mask_count = data.maskCount || 0;
        selectedCellData.mask_area_ha = data.areaHa || 0;
        updateCellMasksDisplay(selectedCellData);
        updateCellAttributionDisplay(selectedCellData);
      }

      if (data.maskCount > 0) {
        msg += ` \u2014 ${data.maskCount} ${data.maskCount === 1 ? 'máscara' : 'máscaras'}, ${formatAreaStr(data.areaHa || 0)}`;
      }

      showToast(msg, 'success', 6000);
    } catch (e) {
      showToast(LeucenaI18n.t('toast.unlockFail'), 'error');
      logEvent('cell_unlock_error', cellId, null, { error: e.message || String(e) });
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
        logEvent('cell_lock_error', cellId, null, { error: err.error, status: res.status });
        return;
      }
      const result = await res.json();

      selectedCellData.locked_by = username;
      selectedCellData.grid_status = 'in_use';
      if (result.worked_by) selectedCellData.worked_by = result.worked_by;
      logEvent('cell_lock', cellId);

      selectCell(cellId, selectedCellData);
      LeucenaMap.updateCellAppearance(cellId, selectedCellData);
      LeucenaMap.setEditingCell(cellId);
      LeucenaMap.zoomToCell(cellId);
      LeucenaCollab.notifyEditingCell(cellId);

      document.getElementById('main-content').classList.add('editing-cell');
      document.getElementById('main-content').classList.remove('sidebar-open');
      updateToggleArrow(false);
      updateLegendVisibility(false);

      document.getElementById('selected-cell-info').classList.add('hidden');

      const badge = document.getElementById('edit-mode-badge');
      const displayId = displayCellId(selectedCellData, cellId);
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
      logEvent('cell_lock_error', cellId, null, { error: e.message || String(e) });
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
  let _locationMarkerTimer = null;

  function _showBlueLocationDot(gMap, latlng) {
    if (_locationMarker) _locationMarker.setMap(null);
    if (_locationMarkerTimer) clearTimeout(_locationMarkerTimer);
    _locationMarker = new google.maps.Marker({
      position: latlng,
      map: gMap,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#3b82f6',
        fillOpacity: 0.95,
        strokeColor: '#ffffff',
        strokeWeight: 3
      },
      title: LeucenaI18n.t('map.youAreHere'),
      zIndex: 9999
    });
    _locationMarkerTimer = setTimeout(() => {
      if (_locationMarker) _locationMarker.setMap(null);
      _locationMarker = null;
      _locationMarkerTimer = null;
    }, 10000);
  }

  async function _navigateToUserCell(gMap, latlng, detectedUf) {
    const currentState = typeof LeucenaMap !== 'undefined' ? LeucenaMap.getCurrentState() : null;
    const needsSwitch = detectedUf && currentState !== detectedUf;

    if (needsSwitch) {
      var name = UF_META[detectedUf] ? UF_META[detectedUf].name : detectedUf;
      showToast(LeucenaI18n.t('map.geoSwitchingState', name), 'info');
      selectState(detectedUf);
      await new Promise(r => google.maps.event.addListenerOnce(gMap, 'idle', r));
    }

    const cellId = typeof LeucenaMap !== 'undefined' ? LeucenaMap.findCellAtPosition(latlng) : null;
    if (cellId) {
      LeucenaMap.zoomToCellViewOnly(cellId);
      const data = LeucenaMap.getGridData(cellId);
      if (data && selectedCellId !== cellId) selectCell(cellId, data);
    } else {
      showToast(LeucenaI18n.t('map.geoNoCellFound'), 'info');
      gMap.setCenter(latlng);
      gMap.setZoom(window.innerWidth <= 768 ? 14 : 15);
    }
  }

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
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const latlng = { lat, lng };
      logEvent('geolocation_success', null, null, { lat, lng, accuracy: pos.coords.accuracy });

      if (!_isInsideBrazil(lat, lng)) {
        showBrazilOverview();
        showToast(LeucenaI18n.t('map.geoOutsideBrazil'), 'warning');
        return;
      }

      const detectedUf = _detectUfForLatLng(lat, lng);
      if (detectedUf && typeof LeucenaCollab !== 'undefined' && LeucenaCollab.notifyLocationState) {
        LeucenaCollab.notifyLocationState(detectedUf);
      }
      _showBlueLocationDot(gMap, latlng);
      _navigateToUserCell(gMap, latlng, detectedUf);
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

  function cleanUserList(str) {
    if (!str) return '';
    return str.split(',').map(s => s.trim()).filter(s => s && s !== 'deleted').join(', ');
  }

  // ── Toast notifications ──
  let toastContainer = null;

  function showToast(message, type = 'info', duration = 4000) {
    logEvent('toast', null, null, { message, type });
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
      if (!isLoggedIn()) { deleteCb.checked = false; return; }
      if (deleteCb.checked) {
        setInsertionMode(false);
        setDeletionMode(true);
      } else {
        setDeletionMode(false);
      }
    });

    // Point modes: L / Ctrl+Z here; Shift+C/V/E etc. live in drawing.js (gated by cell lock + not typing in inputs).
    document.addEventListener('keydown', handlePointModeKey);

    // Floating panel point buttons
    const addPtBtn = document.getElementById('tool-add-point');
    const delPtBtn = document.getElementById('tool-del-point');
    if (addPtBtn) {
      addPtBtn.addEventListener('click', () => {
        if (!isLoggedIn()) return;
        if (insertionMode) {
          setInsertionMode(false);
        } else {
          openAddPointsModal();
        }
      });
    }
    if (delPtBtn) {
      delPtBtn.addEventListener('click', () => {
        if (!isLoggedIn()) return;
        if (deletionMode) {
          setDeletionMode(false);
        } else {
          setInsertionMode(false);
          setDeletionMode(true);
        }
      });
    }

    // Floating street view button
    const svFloat = document.getElementById('tool-streetview-float');
    if (svFloat) {
      svFloat.addEventListener('click', () => {
        const mainBtn = document.getElementById('tool-streetview');
        if (mainBtn && !mainBtn.disabled) mainBtn.click();
      });
    }
  }

  function setInsertionMode(active) {
    if (active && typeof LeucenaDrawing !== 'undefined') {
      const dm = LeucenaDrawing.getActiveMode();
      if (dm !== 'select') LeucenaDrawing.setMode('select');
    }
    insertionMode = active;
    document.getElementById('tool-insertion').checked = active;
    const addBtn = document.getElementById('tool-add-point');
    if (addBtn) addBtn.classList.toggle('active', active);
    logEvent(active ? 'insertion_mode_on' : 'insertion_mode_off', selectedCellId);
    updatePointModeBanner();
    updatePointModeVisuals();
    syncFloatPointButtons();
    if (typeof LeucenaCollab !== 'undefined' && LeucenaCollab.notifyActivity) {
      LeucenaCollab.notifyActivity(active ? 'adding_points' : null);
    }
    if (!active) restoreEditingState();
  }

  function setDeletionMode(active) {
    if (active && typeof LeucenaDrawing !== 'undefined') {
      const dm = LeucenaDrawing.getActiveMode();
      if (dm !== 'select') LeucenaDrawing.setMode('select');
    }
    deletionMode = active;
    document.getElementById('tool-deletion').checked = active;
    const delBtn = document.getElementById('tool-del-point');
    if (delBtn) delBtn.classList.toggle('active', active);
    logEvent(active ? 'deletion_mode_on' : 'deletion_mode_off', selectedCellId);
    updatePointModeBanner();
    updatePointModeVisuals();
    syncFloatPointButtons();
    if (typeof LeucenaCollab !== 'undefined' && LeucenaCollab.notifyActivity) {
      LeucenaCollab.notifyActivity(active ? 'deleting_points' : null);
    }
    if (!active) restoreEditingState();
  }

  function syncFloatPointButtons() {
    const addBtn = document.getElementById('tool-add-point');
    const delBtn = document.getElementById('tool-del-point');
    if (addBtn) addBtn.classList.toggle('active', insertionMode);
    if (delBtn) delBtn.classList.toggle('active', deletionMode);
    const svFloat = document.getElementById('tool-streetview-float');
    if (svFloat) {
      const svActive = typeof LeucenaStreetView !== 'undefined' && LeucenaStreetView.isActive();
      svFloat.classList.toggle('active', svActive);
    }
  }

  function restoreEditingState() {
    if (insertionMode || deletionMode) return;
    if (selectedCellData && selectedCellData.locked_by === username) {
      enableTools(true);
    }
  }

  function isDeletionMode() { return deletionMode; }

  function _isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  function updatePointModeBanner() {
    const banner = document.getElementById('insertion-banner');
    const bannerText = banner.querySelector('span:last-child');
    const editBadge = document.getElementById('edit-mode-badge');
    const touch = _isTouchDevice();
    if (insertionMode) {
      let key;
      if (touch) {
        key = 'banner.insertionTouch';
      } else {
        key = isTeamOrAbove() ? 'banner.insertion' : 'banner.insertionCollab';
      }
      bannerText.textContent = LeucenaI18n.t(key);
      banner.classList.remove('hidden');
    } else if (deletionMode) {
      let key;
      if (touch) {
        key = isTeamOrAbove() ? 'banner.deletionTouch' : 'banner.deletionCollabTouch';
      } else {
        key = isTeamOrAbove() ? 'banner.deletion' : 'banner.deletionCollab';
      }
      bannerText.textContent = LeucenaI18n.t(key);
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
    if (editBadge) {
      const bannerVisible = !banner.classList.contains('hidden');
      editBadge.style.top = bannerVisible
        ? 'calc(var(--topbar-height) + 50px)'
        : '';
    }
  }

  function updatePointModeVisuals() {
    const anyActive = insertionMode || deletionMode;
    if (typeof LeucenaMap !== 'undefined') {
      LeucenaMap.setGridsHollow(false);
      LeucenaMap.setMapBorder(anyActive);
    }
    const cellLocked = selectedCellData && selectedCellData.locked_by === username;
    document.getElementById('tool-streetview').disabled = !(anyActive || cellLocked);
    syncStreetViewButtonTitle();
  }

  function isPointModeActive() {
    return insertionMode || deletionMode;
  }

  function openAddPointsModal() {
    const descEl = document.querySelector('#addpoints-modal [data-i18n-html="addPts.desc"]');
    if (descEl) {
      const key = isTeamOrAbove() ? 'addPts.desc' : 'addPts.descCollab';
      descEl.innerHTML = LeucenaI18n.t(key);
    }
    document.getElementById('addpoints-modal').classList.remove('hidden');
  }

  function closeAddPointsModal() {
    document.getElementById('addpoints-modal').classList.add('hidden');
  }

  function showAdminTools() {
    if (userRole === 'tester') {
      document.getElementById('admin-users-btn').classList.remove('hidden');
    }
    if (isTeamOrAbove()) {
      document.getElementById('admin-users-btn').classList.remove('hidden');
      document.getElementById('cell-search-section').classList.remove('hidden');
      
      const maskSub = document.getElementById('mask-subcategories');
      if (maskSub) { maskSub.classList.remove('hidden'); maskSub.classList.add('collapsed'); }

      const chevron = document.getElementById('mask-hierarchy-chevron');
      if (chevron) { chevron.classList.remove('hidden'); chevron.classList.remove('expanded'); }
      
      const legendDefault = document.getElementById('legend-mask-default');
      if (legendDefault) legendDefault.classList.add('hidden');
      
      const legendMember = document.getElementById('legend-mask-member');
      if (legendMember) legendMember.classList.remove('hidden');
      
      const legendContrib = document.getElementById('legend-mask-contributor');
      if (legendContrib) legendContrib.classList.remove('hidden');

      const collabFilter = document.getElementById('filter-collaborators');
      if (collabFilter) collabFilter.classList.remove('hidden');
    }
    if (isTeamOrAbove()) {
      loadViewCount();
    }
    applyRoleRestrictions();
  }
  
  function hideAdminTools() {
    if (userRole !== 'tester') {
      document.getElementById('admin-users-btn').classList.add('hidden');
    }
    document.getElementById('cell-search-section').classList.add('hidden');
    document.getElementById('view-counter').classList.add('hidden');
    
    const maskSub = document.getElementById('mask-subcategories');
    if (maskSub) { maskSub.classList.add('hidden'); maskSub.classList.add('collapsed'); }

    const chevron = document.getElementById('mask-hierarchy-chevron');
    if (chevron) { chevron.classList.add('hidden'); chevron.classList.remove('expanded'); }
    
    const legendDefault = document.getElementById('legend-mask-default');
    if (legendDefault) legendDefault.classList.remove('hidden');

    const collabFilter = document.getElementById('filter-collaborators');
    if (collabFilter) collabFilter.classList.add('hidden');
    
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
    const headers = {};
    const token = localStorage.getItem('leucena_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/stats/view', { method: 'POST', headers }).catch(() => {});
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
    const viewsVal = viewsEl ? viewsEl.textContent.trim() : '-';

    const rows = [
      { key: LeucenaI18n.t('debug.siteViews'), val: viewsVal },
    ];

    if (map) {
      const bounds = map.getBounds();
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const center = map.getCenter();
      const mapType = map.getMapTypeId();
      const polyCount = (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.getTotalPolygonCount)
        ? LeucenaDrawing.getTotalPolygonCount()
        : '-';
      rows.push(
        { key: 'Zoom', val: map.getZoom() },
        { key: 'Center', val: `${center.lat().toFixed(6)}, ${center.lng().toFixed(6)}` },
        { key: 'Top-Left (NW)', val: `${ne.lat().toFixed(6)}, ${sw.lng().toFixed(6)}` },
        { key: 'Bottom-Right (SE)', val: `${sw.lat().toFixed(6)}, ${ne.lng().toFixed(6)}` },
        { key: 'Bbox (W,S,E,N)', val: `${sw.lng().toFixed(6)}, ${sw.lat().toFixed(6)}, ${ne.lng().toFixed(6)}, ${ne.lat().toFixed(6)}` },
        { key: 'Map Type', val: mapType },
        { key: 'Viewport (px)', val: `${map.getDiv().offsetWidth} × ${map.getDiv().offsetHeight}` },
        { key: 'Polígonos', val: polyCount },
        { key: 'Célula', val: selectedCellId || '-' },
        { key: 'Usuário', val: username || '-' },
        { key: 'Role', val: userRole || '-' },
      );
    } else {
      rows.push(
        { key: 'Mapa', val: LeucenaI18n.t('debug.mapNotReady') },
        { key: 'Célula', val: selectedCellId || '-' },
        { key: 'Usuário', val: username || '-' },
        { key: 'Role', val: userRole || '-' },
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

  function attachAdminLogExportHandlers(t, includeUserCsv) {
    if (includeUserCsv) {
      const csvBtn = document.getElementById('admin-export-csv');
      if (csvBtn) {
        csvBtn.addEventListener('click', async () => {
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
      }
    }
    const exportLogsBtn = document.getElementById('admin-export-logs');
    if (exportLogsBtn) exportLogsBtn.addEventListener('click', async () => {
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
          const roleTag = l.role ? ` (${l.role})` : '';
          let line = `[${l.timestamp}] ${l.username || '?'}${roleTag}: ${l.action}`;
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
  }

  function _openRoleChangeModal(user, currentRole, roleLabelMap, allRoles) {
    let existing = document.getElementById('role-change-modal');
    if (existing) existing.remove();

    const t = LeucenaI18n.t;
    const overlay = document.createElement('div');
    overlay.id = 'role-change-modal';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '10100';

    const roleColors = { superadmin: '#a855f7', admin: '#ef4444', team: '#3b82f6', contributor: '#6b7280', tester: '#f59e0b' };
    const roleTextColors = { tester: '#000' };

    const optionsHtml = allRoles.map(r => {
      const selected = r === currentRole;
      const bg = roleColors[r] || 'var(--accent)';
      const textCol = roleTextColors[r] || '#fff';
      return `<button type="button" class="role-option${selected ? ' role-option-active' : ''}" data-role="${r}" style="--role-bg:${bg};--role-text:${textCol}">
        <span class="role-option-dot" style="background:${bg}"></span>
        <span class="role-option-label">${roleLabelMap[r]}</span>
        ${selected ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </button>`;
    }).join('');

    overlay.innerHTML = `
      <div class="modal-card modal-card-small" style="max-width:320px">
        <button class="modal-close" type="button">&times;</button>
        <h3 style="margin:0 0 4px 0;font-size:15px">${t('admin.changeRoleTitle')}</h3>
        <p style="margin:0 0 14px 0;font-size:13px;color:var(--text-muted)">${user.full_name || user.username}</p>
        <div class="role-options-list">${optionsHtml}</div>
      </div>
    `;
    document.body.appendChild(overlay);

    const closeModal = () => overlay.remove();
    overlay.querySelector('.modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    overlay.querySelectorAll('.role-option').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newRole = btn.dataset.role;
        if (newRole === currentRole) { closeModal(); return; }
        const confirmMsg = t('admin.changeRoleConfirm', user.username, roleLabelMap[newRole]);
        if (!window.confirm(confirmMsg)) return;
        try {
          const r = await fetch(`/api/admin/users/${user.id}/role`, {
            method: 'PUT', headers: authHeaders(), body: JSON.stringify({ role: newRole })
          });
          if (r.ok) {
            logEvent('admin_role_change', null, null, { target: user.username, newRole: newRole });
            showToast(t('admin.roleUpdated'), 'success');
            closeModal();
            openAdminUsersModal();
          } else {
            const err = await r.json();
            showToast(err.error, 'error');
          }
        } catch (e) { showToast('Erro de conexão', 'error'); }
      });
    });
  }

  async function openAdminUsersModal() {
    if (!isTeamOrAbove()) return;
    logEvent('admin_users_open');
    const t = LeucenaI18n.t;
    const modal = document.getElementById('admin-users-modal');
    modal.classList.remove('hidden');

    const metricsEl = document.getElementById('admin-global-metrics');
    const viewToggleEl = document.getElementById('admin-view-toggle');
    const createUserSection = document.getElementById('admin-create-user');
    if (createUserSection) createUserSection.classList.add('hidden');

    const callerIsTeam = !isAdminUser();

    if (callerIsTeam) {
      // ── Read-only team view: show metrics + user list, no action buttons ──
      viewToggleEl.classList.add('hidden');
      metricsEl.classList.remove('hidden');

    try {
      const res = await fetch('/api/admin/users', { headers: authHeaders() });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const errEl = document.getElementById('admin-users-list');
          errEl.textContent = '';
          const errP = document.createElement('p');
          errP.style.cssText = 'padding:16px;color:var(--danger)';
          errP.textContent = 'Erro ' + res.status + ': ' + (errBody.error || res.statusText);
          errEl.appendChild(errP);
          return;
        }
      const data = await res.json();

        const isMember = u => ['superadmin','admin','team'].includes(u.role);
        const isCollab = u => !isMember(u);
        const members = data.users.filter(isMember);
        const collabs = data.users.filter(isCollab);
        const memberMasks = members.reduce((s, u) => s + (u.mask_count || 0), 0);
        const collabMasks = collabs.reduce((s, u) => s + (u.mask_count || 0), 0);
        const memberArea = members.reduce((s, u) => s + (u.mask_area_ha || 0), 0);
        const collabArea = collabs.reduce((s, u) => s + (u.mask_area_ha || 0), 0);
        const fmtArea = v => v.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});

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

        const listEl = document.getElementById('admin-users-list');
        listEl.innerHTML = '';

        // Only copy-recent-logs for team members
        const toolsGrid = document.createElement('div');
        toolsGrid.className = 'admin-tools-grid';
        toolsGrid.innerHTML = `<div class="admin-tools-section">
          <div class="admin-tools-label">${t('admin.sectionLogs')}</div>
          <div class="admin-tools-buttons">
            <button id="admin-copy-recent-logs" class="admin-tool-btn admin-tool-ghost"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> ${t('admin.copyRecentLogs')}</button>
          </div>
        </div>`;
        listEl.appendChild(toolsGrid);
        attachAdminLogExportHandlers(t, false);

        const onlineSet = new Set(data.onlineUsers || []);
        const roleLabelMap = { superadmin: 'Super Admin', admin: 'Admin', team: 'Membro', contributor: 'Colaborador', tester: 'Tester' };

        function formatLastActiveTeam(isoDate, uname) {
          if (onlineSet.has(uname)) return `<span class="admin-active-now">● ${t('admin.activeNow')}</span>`;
          if (!isoDate) return t('admin.never');
          const diff = Date.now() - new Date(isoDate).getTime();
          const mins = Math.floor(diff / 60000);
          if (mins < 1) return `<span class="admin-active-now">● ${t('admin.activeNow')}</span>`;
          if (mins < 60) return t('admin.minutesAgo', mins);
          const hrs = Math.floor(mins / 60);
          if (hrs < 24) return t('admin.hoursAgo', hrs);
          return t('admin.daysAgo', Math.floor(hrs / 24));
        }

        const isEquipe = u => ['superadmin','admin','team','tester'].includes(u.role || 'contributor');
        const roleOrder = { superadmin: 0, admin: 1, team: 2, tester: 3 };
        const equipeUsers = data.users.filter(isEquipe).sort((a, b) => {
          const ra = roleOrder[a.role] ?? 99, rb = roleOrder[b.role] ?? 99;
          if (ra !== rb) return ra - rb;
          return (a.username || '').localeCompare(b.username || '');
        });
        const colabUsers = data.users.filter(u => !isEquipe(u)).sort((a, b) =>
          (a.username || '').localeCompare(b.username || ''));

        function createDropdownTeam(title, count, id, startOpen) {
          const wrapper = document.createElement('div');
          wrapper.className = 'admin-section-dropdown';
          const header = document.createElement('button');
          header.className = 'admin-section-header';
          header.type = 'button';
          header.innerHTML = `<svg class="admin-section-chevron${startOpen ? ' open' : ''}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg><span class="admin-section-title">${title}</span><span class="admin-section-count">${count}</span>`;
          const body = document.createElement('div');
          body.className = 'admin-section-body';
          body.id = id;
          if (!startOpen) body.classList.add('collapsed');
          header.addEventListener('click', () => {
            body.classList.toggle('collapsed');
            header.querySelector('.admin-section-chevron').classList.toggle('open');
          });
          wrapper.appendChild(header);
          wrapper.appendChild(body);
          return { wrapper, body };
        }

        const equipeDD = createDropdownTeam(t('admin.sectionEquipe'), equipeUsers.length, 'admin-equipe-list', true);
        listEl.appendChild(equipeDD.wrapper);
        const colabDD = createDropdownTeam(t('admin.sectionColaboradores'), colabUsers.length, 'admin-colab-list', false);
        listEl.appendChild(colabDD.wrapper);

        for (const user of [...equipeUsers, ...colabUsers]) {
          const role = user.role || 'contributor';
          const isOnline = onlineSet.has(user.username);
          const isVerified = !!(user.email_verified || user.auth_provider === 'google');
          const isInactive = user.is_active === 0;
          const initial = user.username.charAt(0).toUpperCase();
          const photoSrc = safePhotoSrc(user.photo);
          const photoHtml = photoSrc
            ? `<img src="${photoSrc}" class="admin-card-photo" alt="">`
            : `<div class="admin-card-avatar">${initial}</div>`;
          const verifyBadgeHtml = isVerified
            ? `<span class="admin-verify-badge verified">✓ ${t('admin.verified')}</span>`
            : `<span class="admin-verify-badge not-verified">✗ ${t('admin.notVerified')}</span>`;
          const authMethodBadgeHtml = user.google_id
            ? `<span class="admin-auth-badge google">${t('admin.authMethodGoogle')}</span>`
            : `<span class="admin-auth-badge email">${t('admin.authMethodEmail')}</span>`;
          const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : '-';
          const lastActiveHtml = formatLastActiveTeam(user.last_active, user.username);
          const totalMs = user.total_time_ms || 0;
          const timeStr = formatDuration(totalMs);

          const row = document.createElement('div');
          row.className = 'admin-user-card' + (isOnline ? ' admin-user-online' : '') + (isInactive ? ' admin-user-card-inactive' : '');
          // Read-only: no email, no action buttons, no batch checkboxes
          row.innerHTML = `
            <div class="admin-card-header">
              <div class="admin-card-photo-col">
                ${photoHtml}
                <span class="admin-user-badge admin-role-${role}">${roleLabelMap[role]}</span>
              </div>
              <div class="admin-card-identity">
                <div class="admin-card-name-row">
                  <span class="admin-user-name">${user.username}</span>
                  ${isOnline ? '<span class="admin-online-dot"></span>' : ''}
                  ${isInactive ? `<span class="admin-user-badge admin-badge-inactive">${t('admin.inactive')}</span>` : ''}
                  ${authMethodBadgeHtml}
                  ${verifyBadgeHtml}
                </div>
                <div class="admin-card-meta">
                  ${user.full_name ? `<span class="admin-card-fullname">${user.full_name}</span>` : ''}
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
                ${user.last_location_state ? `<span>${t('admin.locationState')}: ${user.last_location_state}</span>` : ''}
                ${user.last_edited_state ? `<span>${t('admin.editedState')}: ${user.last_edited_state}</span>` : ''}
              </div>
            </div>`;

          (isEquipe(user) ? equipeDD.body : colabDD.body).appendChild(row);
        }
      } catch (e) {
        console.error('[TeamPanel] Erro ao carregar usuários:', e);
        const errEl2 = document.getElementById('admin-users-list');
        errEl2.textContent = '';
        const errP2 = document.createElement('p');
        errP2.style.cssText = 'padding:16px;color:var(--danger)';
        errP2.textContent = 'Erro ao carregar usuários: ' + e.message;
        errEl2.appendChild(errP2);
      }
      return;
    }

    metricsEl.classList.remove('hidden');

    try {
      const res = await fetch('/api/admin/users', { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const callerIsSuperAdmin = data.callerRole === 'superadmin';
      const callerIsAdmin = data.callerRole === 'admin';

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
      const effectiveAdmin = callerIsAdmin || (callerIsSuperAdmin && _adminViewMode);

      const listEl = document.getElementById('admin-users-list');
      const equipeBodyPrev = document.getElementById('admin-equipe-list');
      const colabBodyPrev = document.getElementById('admin-colab-list');
      let adminPanelRestore = null;
      if (equipeBodyPrev && colabBodyPrev) {
        adminPanelRestore = {
          scrollTop: listEl.scrollTop,
          equipeOpen: !equipeBodyPrev.classList.contains('collapsed'),
          colabOpen: !colabBodyPrev.classList.contains('collapsed')
        };
      }
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

      if (effectiveSuperAdmin || effectiveAdmin) {
        gridHtml += `<div class="admin-tools-section">
          <div class="admin-tools-label">${t('admin.sectionData')}</div>
          <div class="admin-tools-buttons">
            <button id="admin-create-user-btn" class="admin-tool-btn admin-tool-primary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> ${t('admin.createUser')}</button>
            ${effectiveSuperAdmin ? `<button id="admin-import-points-btn" class="admin-tool-btn admin-tool-primary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> ${t('admin.importPoints')}</button>` : ''}
            ${effectiveSuperAdmin ? `<button id="admin-backup-db" class="admin-tool-btn admin-tool-secondary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> ${t('admin.backupDb')}</button>` : ''}
          </div>
        </div>`;

        if (effectiveSuperAdmin) {
        gridHtml += `<div class="admin-tools-section">
          <div class="admin-tools-label">${t('admin.sectionMaintenance')}</div>
          <div class="admin-tools-buttons">
            <button id="admin-dedup-btn" class="admin-tool-btn admin-tool-danger"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg> ${t('admin.dedupBtn')}</button>
            <button id="admin-covered-btn" class="admin-tool-btn admin-tool-danger"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ${t('admin.coveredBtn')}</button>
          </div>
        </div>`;
        }
      }

      toolsGrid.innerHTML = gridHtml;
      listEl.appendChild(toolsGrid);
      attachAdminLogExportHandlers(t, true);

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

            logEvent('geojson_import', null, null, { imported: data.imported, duplicates: data.duplicates, skipped: data.skipped, total: count });
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
            logEvent('geojson_import_error', null, null, { error: e.message || String(e) });
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
                  logEvent('admin_dedup', null, null, { removed: result.removed });
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

      // Covered-points cleanup: preview → confirm modal → execute → undo toast
      const coveredBtn = document.getElementById('admin-covered-btn');
      if (coveredBtn) {
        coveredBtn.addEventListener('click', async () => {
          coveredBtn.disabled = true;
          coveredBtn.textContent = `⏳ ${t('admin.coveredScanning')}`;
          try {
            const r = await fetch('/api/admin/points/covered/preview', { headers: authHeaders() });
            if (!r.ok) { showToast('Error', 'error'); return; }
            const data = await r.json();
            if (data.covered_count === 0) {
              showToast(t('admin.coveredNone'), 'success');
              return;
            }
            const modal = document.getElementById('covered-modal');
            document.getElementById('covered-modal-text').textContent = t('admin.coveredConfirm', data.covered_count, data.total_checked);
            const confirmBtn = document.getElementById('covered-modal-confirm');
            confirmBtn.disabled = false;
            confirmBtn.textContent = t('admin.dedupModalConfirm');
            modal.classList.remove('hidden');

            const onConfirm = async () => {
              confirmBtn.removeEventListener('click', onConfirm);
              cancelBtn.removeEventListener('click', onCancel);
              confirmBtn.disabled = true;
              confirmBtn.textContent = `⏳ ${t('admin.coveredRemoving')}`;
              try {
                const res = await fetch('/api/admin/points/covered/remove', { method: 'POST', headers: authHeaders() });
                const result = await res.json();
                modal.classList.add('hidden');
                if (res.ok && result.removed > 0) {
                  logEvent('admin_cleanup_covered', null, null, { removed: result.removed });
                  showToast(t('admin.coveredSuccess', result.removed), 'success', 10000);
                  showCoveredUndoToast(result.removed);
                } else if (res.ok && result.removed === 0) {
                  showToast(t('admin.coveredNone'), 'info');
                } else {
                  showToast(result.error || t('admin.coveredFail'), 'error');
                }
              } catch (e) {
                modal.classList.add('hidden');
                showToast(t('admin.coveredFail'), 'error');
              }
            };
            const cancelBtn = document.getElementById('covered-modal-cancel');
            const onCancel = () => {
              confirmBtn.removeEventListener('click', onConfirm);
              cancelBtn.removeEventListener('click', onCancel);
              modal.classList.add('hidden');
            };
            confirmBtn.addEventListener('click', onConfirm);
            cancelBtn.addEventListener('click', onCancel);
            document.getElementById('covered-modal-close').onclick = onCancel;
          } catch (e) {
            showToast(t('admin.coveredFail'), 'error');
          } finally {
            coveredBtn.disabled = false;
            coveredBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ${t('admin.coveredBtn')}`;
          }
        });
      }

      function showCoveredUndoToast(count) {
        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:12px 20px;border-radius:10px;display:flex;align-items:center;gap:12px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3);font-size:14px;';
        container.innerHTML = `<span>${t('admin.coveredSuccess', count)}</span>`;
        const undoBtn = document.createElement('button');
        undoBtn.textContent = `↩ ${t('admin.dedupUndo')}`;
        undoBtn.style.cssText = 'background:#3b82f6;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;';
        undoBtn.addEventListener('click', async () => {
          undoBtn.disabled = true;
          undoBtn.textContent = '⏳';
          try {
            const res = await fetch('/api/admin/points/covered/undo', { method: 'POST', headers: authHeaders() });
            const result = await res.json();
            if (res.ok && result.restored > 0) {
              showToast(t('admin.coveredUndoSuccess', result.restored), 'success', 6000);
            } else {
              showToast(result.error || t('admin.coveredFail'), 'error');
            }
          } catch (e) {
            showToast(t('admin.coveredFail'), 'error');
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
            document.getElementById('admin-create-fullname').value = '';
            document.getElementById('admin-create-username').value = '';
            document.getElementById('admin-create-email').value = '';
            document.getElementById('admin-create-password').value = '';
            document.getElementById('admin-create-error').classList.add('hidden');
            document.getElementById('admin-create-fullname').focus();
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
        const fn = document.getElementById('admin-create-fullname').value.trim();
        const u = document.getElementById('admin-create-username').value.trim();
        const e = document.getElementById('admin-create-email').value.trim();
        const p = document.getElementById('admin-create-password').value;
        const errEl = document.getElementById('admin-create-error');
        errEl.classList.add('hidden');

        if (!fn || !u || !e || !p) {
          errEl.textContent = t('admin.createUserAllFields');
          errEl.classList.remove('hidden');
          return;
        }

        try {
          const r = await fetch('/api/admin/users/create', {
            method: 'POST', headers: authHeaders(),
            body: JSON.stringify({ username: u, email: e, password: p, full_name: fn })
          });
          const data = await r.json();
          if (!r.ok) {
            errEl.textContent = data.error;
            errEl.classList.remove('hidden');
            return;
          }
          document.getElementById('admin-create-user').classList.add('hidden');
          logEvent('admin_create_user', null, null, { username: u });
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

      const roleOrder = { superadmin: 0, admin: 1, team: 2, tester: 3 };
      const isEquipe = u => ['superadmin','admin','team','tester'].includes(u.role || 'contributor');
      const equipeUsers = data.users.filter(isEquipe).sort((a, b) => {
        const ra = roleOrder[a.role] ?? 99, rb = roleOrder[b.role] ?? 99;
        if (ra !== rb) return ra - rb;
        return (a.username || '').localeCompare(b.username || '');
      });
      const collabIsVerified = u => !!(u.email_verified || u.auth_provider === 'google');
      const colabUsers = data.users.filter(u => !isEquipe(u)).sort((a, b) => {
        const va = collabIsVerified(a), vb = collabIsVerified(b);
        if (va !== vb) return va ? 1 : -1;
        return (a.username || '').localeCompare(b.username || '');
      });
      const colabUnverifiedCount = colabUsers.filter(u => !collabIsVerified(u)).length;

      function createDropdown(title, count, id, startOpen, extraTitleHtml) {
        const wrapper = document.createElement('div');
        wrapper.className = 'admin-section-dropdown';
        const header = document.createElement('button');
        header.className = 'admin-section-header';
        header.type = 'button';
        const extra = extraTitleHtml || '';
        header.innerHTML = `<svg class="admin-section-chevron${startOpen ? ' open' : ''}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg><span class="admin-section-title">${title}</span>${extra}<span class="admin-section-count">${count}</span>`;
        const body = document.createElement('div');
        body.className = 'admin-section-body';
        body.id = id;
        if (!startOpen) body.classList.add('collapsed');
        header.addEventListener('click', () => {
          body.classList.toggle('collapsed');
          header.querySelector('.admin-section-chevron').classList.toggle('open');
        });
        wrapper.appendChild(header);
        wrapper.appendChild(body);
        return { wrapper, body };
      }

      const equipeStartOpen = adminPanelRestore ? adminPanelRestore.equipeOpen : true;
      const colabStartOpen = adminPanelRestore ? adminPanelRestore.colabOpen : (colabUnverifiedCount > 0);
      const colabWarning = colabUnverifiedCount > 0
        ? `<span class="admin-section-unverified-tag">${t('admin.colabUnverifiedCount', colabUnverifiedCount)}</span>`
        : '';

      const equipeDropdown = createDropdown(t('admin.sectionEquipe'), equipeUsers.length, 'admin-equipe-list', equipeStartOpen);
      listEl.appendChild(equipeDropdown.wrapper);
      const colabDropdown = createDropdown(t('admin.sectionColaboradores'), colabUsers.length, 'admin-colab-list', colabStartOpen, colabWarning);
      listEl.appendChild(colabDropdown.wrapper);

      const _batchSelected = new Set();
      let batchToolbar = null;
      let _colabSearchInput = null;
      let _colabFilterInfo = null;

      function _normalizeSearch(str) {
        return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.\-_]/g, ' ').replace(/\s+/g, ' ').trim();
      }

      function _filterColabCards() {
        const body = colabDropdown.body;
        const cards = body.querySelectorAll('.admin-user-card');
        const raw = (_colabSearchInput ? _colabSearchInput.value : '').trim();
        const query = _normalizeSearch(raw);
        let shown = 0;
        const total = cards.length;
        cards.forEach(card => {
          if (!query) { card.style.display = ''; shown++; return; }
          const haystack = card.dataset.searchText || '';
          card.style.display = haystack.includes(query) ? '' : 'none';
          if (card.style.display !== 'none') shown++;
        });
        if (_colabFilterInfo) {
          if (query) {
            _colabFilterInfo.textContent = t('admin.searchResult', shown, total);
            _colabFilterInfo.classList.add('active');
            body.classList.add('admin-colab-filtered');
          } else {
            _colabFilterInfo.textContent = '';
            _colabFilterInfo.classList.remove('active');
            body.classList.remove('admin-colab-filtered');
          }
        }
      }

      function syncBatchToolbar() {
        if (!batchToolbar) return;
        const count = _batchSelected.size;
        batchToolbar.querySelector('.batch-count').textContent = t('admin.batchSelected', count);
        batchToolbar.querySelectorAll('.batch-action-btn').forEach(btn => { btn.disabled = count === 0; });
      }

      if (effectiveSuperAdmin || effectiveAdmin) {
        batchToolbar = document.createElement('div');
        batchToolbar.className = 'admin-batch-toolbar';
        batchToolbar.innerHTML =
          '<span class="batch-count">' + t('admin.batchSelected', 0) + '</span>' +
          '<button type="button" class="batch-select-all" data-action="select-all">' + t('admin.batchSelectAll') + '</button>' +
          '<button type="button" class="batch-action-btn" data-action="verify" disabled>' + t('admin.batchVerify') + '</button>' +
          '<button type="button" class="batch-action-btn" data-action="deactivate" disabled>' + t('admin.batchDeactivate') + '</button>' +
          '<button type="button" class="batch-action-btn" data-action="reactivate" disabled>' + t('admin.batchReactivate') + '</button>' +
          '<button type="button" class="batch-action-btn" data-action="send-message" disabled>' + t('admin.batchSendMessage') + '</button>' +
          (effectiveSuperAdmin ? '<button type="button" class="batch-action-btn batch-btn-danger" data-action="delete" disabled>' + t('admin.batchDelete') + '</button>' : '');

        const searchRow = document.createElement('div');
        searchRow.className = 'admin-colab-search-row';
        searchRow.innerHTML =
          '<div class="admin-colab-search-wrap">' +
          '<svg class="admin-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
          '<input type="text" class="admin-colab-search" placeholder="' + t('admin.searchPlaceholder') + '">' +
          '<button type="button" class="admin-search-clear hidden" title="Limpar">&times;</button>' +
          '</div>' +
          '<span class="admin-colab-filter-info"></span>';
        colabDropdown.body.insertBefore(searchRow, colabDropdown.body.firstChild);
        colabDropdown.body.insertBefore(batchToolbar, searchRow.nextSibling);

        _colabSearchInput = searchRow.querySelector('.admin-colab-search');
        _colabFilterInfo = searchRow.querySelector('.admin-colab-filter-info');
        const clearBtn = searchRow.querySelector('.admin-search-clear');

        _colabSearchInput.addEventListener('input', () => {
          clearBtn.classList.toggle('hidden', !_colabSearchInput.value);
          _filterColabCards();
        });
        clearBtn.addEventListener('click', () => {
          _colabSearchInput.value = '';
          clearBtn.classList.add('hidden');
          _filterColabCards();
          _colabSearchInput.focus();
        });

        batchToolbar.addEventListener('click', async (e) => {
          const btn = e.target.closest('button');
          if (!btn) return;
          const action = btn.dataset.action;
          if (action === 'select-all') {
            const allCbs = colabDropdown.body.querySelectorAll('.admin-batch-cb');
            const allSelected = _batchSelected.size === allCbs.length;
            allCbs.forEach(cb => {
              const card = cb.closest('.admin-user-card');
              const uid = Number(cb.dataset.userId);
              if (allSelected) {
                cb.checked = false;
                card.classList.remove('batch-selected');
                _batchSelected.delete(uid);
              } else {
                cb.checked = true;
                card.classList.add('batch-selected');
                _batchSelected.add(uid);
              }
            });
            btn.textContent = _batchSelected.size === allCbs.length ? t('admin.batchDeselectAll') : t('admin.batchSelectAll');
            syncBatchToolbar();
            return;
          }

          if (_batchSelected.size === 0) return;
          const ids = [..._batchSelected];

          if (action === 'verify') {
            const selectedUsers = colabUsers.filter(u => ids.includes(u.id));
            const alreadyVerified = selectedUsers.filter(u => u.email_verified || u.auth_provider === 'google').length;
            const toVerify = selectedUsers.length - alreadyVerified;
            if (!window.confirm(t('admin.batchConfirmVerify', selectedUsers.length, alreadyVerified))) return;
            try {
              const r = await fetch('/api/admin/batch/verify', {
                method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids })
              });
              if (r.ok) {
                const j = await r.json();
                showToast(t('admin.batchVerifyDone', j.verified, j.skipped), 'success');
                openAdminUsersModal();
              } else { const err = await r.json(); showToast(err.error, 'error'); }
            } catch (e) { showToast('Erro de conexão', 'error'); }
          } else if (action === 'deactivate') {
            if (ids.length > 10) { showToast(t('admin.batchDeactivateMax', 10, ids.length), 'warning'); return; }
            if (!window.confirm(t('admin.batchConfirmDeactivate', ids.length))) return;
            try {
              const r = await fetch('/api/admin/batch/deactivate', {
                method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids })
              });
              if (r.ok) {
                const j = await r.json();
                showToast(t('admin.batchDeactivateDone', j.processed), 'success');
                openAdminUsersModal();
              } else { const err = await r.json(); showToast(err.error, 'error'); }
            } catch (e) { showToast('Erro de conexão', 'error'); }
          } else if (action === 'reactivate') {
            if (!window.confirm(t('admin.batchConfirmReactivate', ids.length))) return;
            try {
              const r = await fetch('/api/admin/batch/reactivate', {
                method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids })
              });
              if (r.ok) {
                const j = await r.json();
                showToast(t('admin.batchReactivateDone', j.processed), 'success');
                openAdminUsersModal();
              } else { const err = await r.json(); showToast(err.error, 'error'); }
            } catch (e) { showToast('Erro de conexão', 'error'); }
          } else if (action === 'send-message') {
            closeAdminUsersModal();
            openBatchComposeModal(ids, colabUsers);
            return;
          } else if (action === 'delete') {
            if (!_userAuthInfo.is_local && ids.length > 5) { showToast(t('admin.batchDeleteMax', 5, ids.length), 'warning'); return; }
            const phrase = t('admin.batchConfirmDeletePhrase');
            const warning = t('admin.batchConfirmDeleteWarning', ids.length);
            const input = window.prompt(warning + '\n\n' + t('admin.permanentDeleteTypeInstruction') + '\n' + phrase);
            if (!input || input.trim() !== phrase) {
              if (input !== null) showToast(t('admin.permanentDeletePhraseMismatch'), 'warning');
              return;
            }
            try {
              const r = await fetch('/api/admin/batch/delete', {
                method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids })
              });
              if (r.ok) {
                const j = await r.json();
                showToast(t('admin.batchDeleteDone', j.deleted), 'success');
                openAdminUsersModal();
              } else { const err = await r.json(); showToast(err.error, 'error'); }
            } catch (e) { showToast('Erro de conexão', 'error'); }
          }
        });
      }

      const allSortedUsers = [...equipeUsers, ...colabUsers];

      for (const user of allSortedUsers) {
        const role = user.role || 'contributor';
        const totalMs = user.total_time_ms || 0;
        const timeStr = formatDuration(totalMs);
        const isOnline = onlineSet.has(user.username);
        const isVerified = !!(user.email_verified || user.auth_provider === 'google');
        const row = document.createElement('div');
        const unverifiedCollab = !isEquipe(user) && !isVerified;
        const isInactive = user.is_active === 0;
        row.className = 'admin-user-card' + (isOnline ? ' admin-user-online' : '') + (unverifiedCollab ? ' admin-user-card-unverified' : '') + (isInactive ? ' admin-user-card-inactive' : '');

        let founderStarHtml = '';
        if (effectiveSuperAdmin) {
          if (role === 'superadmin' || role === 'admin' || role === 'team') {
            const starTitle = user.is_founder ? t('admin.founderRemove') : t('admin.founderMake');
            founderStarHtml = `<button type="button" class="admin-founder-star${user.is_founder ? ' active' : ''}" title="${starTitle}" data-founder="${user.is_founder ? 1 : 0}"><svg width="16" height="16" viewBox="0 0 24 24" fill="${user.is_founder ? '#facc15' : 'none'}" stroke="${user.is_founder ? '#facc15' : 'currentColor'}" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></button>`;
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

        const isCollaborator = !isEquipe(user);
        const isTargetManageable = !['admin', 'superadmin', 'team'].includes(role);
        const canManage = effectiveSuperAdmin ? (role !== 'superadmin') : (effectiveAdmin && isTargetManageable);
        const canPermanentDelete = effectiveSuperAdmin && role !== 'superadmin';
        const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : '-';
        const lastActiveHtml = formatLastActive(user.last_active, user.username);
        const initial = user.username.charAt(0).toUpperCase();
        const photoSrcAdmin = safePhotoSrc(user.photo);
        const photoHtml = photoSrcAdmin
          ? `<img src="${photoSrcAdmin}" class="admin-card-photo" alt="">`
          : `<div class="admin-card-avatar">${initial}</div>`;

        const verifyBadgeHtml = isVerified
          ? `<span class="admin-verify-badge verified">✓ ${t('admin.verified')}</span>`
          : `<span class="admin-verify-badge not-verified">✗ ${t('admin.notVerified')}</span>`;
        const authMethodBadgeHtml = user.google_id
          ? `<span class="admin-auth-badge google" title="${t('admin.authMethodGoogleTitle')}">${t('admin.authMethodGoogle')}</span>`
          : `<span class="admin-auth-badge email" title="${t('admin.authMethodEmailTitle')}">${t('admin.authMethodEmail')}</span>`;

        const batchCbHtml = ((effectiveSuperAdmin || effectiveAdmin) && isCollaborator)
          ? `<input type="checkbox" class="admin-batch-cb" data-user-id="${user.id}">`
          : '';

        if ((effectiveSuperAdmin || effectiveAdmin) && isCollaborator) row.classList.add('batch-mode');

        row.innerHTML = `
          ${batchCbHtml}
          <div class="admin-card-header">
            <div class="admin-card-photo-col">
            ${photoHtml}
              <span class="admin-user-badge admin-role-${role}${(effectiveSuperAdmin && !user.is_immutable) ? ' admin-role-clickable' : ''}" data-user-id="${user.id}" data-current-role="${role}">${roleLabelMap[role]}</span>
            </div>
            <div class="admin-card-identity">
              <div class="admin-card-name-row">
                ${founderStarHtml}
                <span class="admin-user-name">${user.username}</span>
                ${isOnline ? '<span class="admin-online-dot"></span>' : ''}
                ${isInactive ? `<span class="admin-user-badge admin-badge-inactive">${t('admin.inactive')}</span>` : ''}
                ${authMethodBadgeHtml}
                ${verifyBadgeHtml}
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
              ${user.last_location_state ? `<span>${t('admin.locationState')}: ${user.last_location_state}</span>` : ''}
              ${user.last_edited_state ? `<span>${t('admin.editedState')}: ${user.last_edited_state}</span>` : ''}
            </div>
            ${testerRadioHtml}
            <div class="admin-user-actions">
              <button class="admin-profile-btn">${t('admin.editProfile')}</button>
              ${canManage ? `<button class="admin-pw-btn">${t('admin.changePassword')}</button>` : ''}
              ${canManage && !isVerified ? `<button class="admin-verify-btn">${t('admin.verifyUser')}</button>` : ''}
              ${canManage ? `<button class="admin-rename-btn">${t('admin.renameUser')}</button>` : ''}
              ${canManage && !isInactive ? `<button class="admin-deactivate-btn btn-warning-sm">${t('admin.deactivateUser')}</button>` : ''}
              ${canManage && isInactive ? `<button class="admin-reactivate-btn btn-success-sm">${t('admin.reactivateUser')}</button>` : ''}
              ${canPermanentDelete && !isCollaborator ? `<button class="admin-del-btn btn-danger-sm">${t('admin.permanentDelete')}</button>` : ''}
            </div>
          </div>
        `;

        const roleBadge = row.querySelector('.admin-role-clickable');
        if (roleBadge) {
          roleBadge.addEventListener('click', () => {
            _openRoleChangeModal(user, role, roleLabelMap, allRoles);
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

        const founderStar = row.querySelector('.admin-founder-star');
        if (founderStar) {
          founderStar.addEventListener('click', async () => {
            const isCurrently = founderStar.dataset.founder === '1';
            const confirmMsg = isCurrently
              ? t('admin.founderConfirmRemove', user.username)
              : t('admin.founderConfirmMake', user.username);
            if (!window.confirm(confirmMsg)) return;
            try {
              const r = await fetch(`/api/admin/users/${user.id}/founder`, {
                method: 'PUT', headers: authHeaders(), body: JSON.stringify({ is_founder: !isCurrently })
              });
              if (r.ok) { showToast(t('admin.founderUpdated'), 'success'); openAdminUsersModal(); }
              else { const err = await r.json(); showToast(err.error, 'error'); }
            } catch (e) { showToast('Erro de conexão', 'error'); }
          });
        }

        const openUserProfile = () => {
          closeAdminUsersModal();
          openProfileModal({
            id: user.id,
            username: user.username,
            full_name: user.full_name || '',
            occupation: user.occupation || '',
            description: user.description || '',
            photo: user.photo || null,
            email: user.email || '',
            linkedin: user.linkedin || '',
            scholar: user.scholar || '',
            referral_source: user.referral_source || '',
            referral_detail: user.referral_detail || ''
          });
        };
        const profileBtn = row.querySelector('.admin-profile-btn');
        profileBtn.addEventListener('click', openUserProfile);
        const photoEl = row.querySelector('.admin-card-photo, .admin-card-avatar');
        if (photoEl) {
          photoEl.style.cursor = 'pointer';
          photoEl.addEventListener('click', openUserProfile);
        }

        const pwBtn = row.querySelector('.admin-pw-btn');
        if (pwBtn) pwBtn.addEventListener('click', () => {
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
          if (r.ok) { logEvent('admin_password_change', null, null, { target: user.username }); showToast(t('admin.passwordChanged'), 'success'); }
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

        const verifyBtn = row.querySelector('.admin-verify-btn');
        if (verifyBtn) {
          verifyBtn.addEventListener('click', async () => {
            try {
              const r = await fetch(`/api/admin/users/${user.id}/verify`, {
                method: 'PUT', headers: authHeaders()
              });
              if (r.ok) {
                showToast(t('admin.verifySuccess'), 'success');
                openAdminUsersModal();
              } else { const err = await r.json(); showToast(err.error, 'error'); }
          } catch (e) { showToast('Erro de conexão', 'error'); }
        });
        }

        const deactivateBtn = row.querySelector('.admin-deactivate-btn');
        if (deactivateBtn) {
          deactivateBtn.addEventListener('click', async () => {
            if (!confirm(t('admin.confirmDeactivate', user.username))) return;
            try {
              const r = await fetch(`/api/admin/users/${user.id}/deactivate`, {
                method: 'PUT', headers: authHeaders()
            });
            if (r.ok) {
                logEvent('admin_deactivate', null, null, { target: user.username });
                showToast(t('admin.userDeactivated'), 'success');
                openAdminUsersModal();
            } else { const err = await r.json(); showToast(err.error, 'error'); }
            } catch (e) { showToast('Erro de conexão', 'error'); }
          });
        }

        const reactivateBtn = row.querySelector('.admin-reactivate-btn');
        if (reactivateBtn) {
          reactivateBtn.addEventListener('click', async () => {
            try {
              const r = await fetch(`/api/admin/users/${user.id}/reactivate`, {
                method: 'PUT', headers: authHeaders()
              });
              if (r.ok) {
                logEvent('admin_reactivate', null, null, { target: user.username });
                showToast(t('admin.userReactivated'), 'success');
                openAdminUsersModal();
              } else { const err = await r.json(); showToast(err.error, 'error'); }
            } catch (e) { showToast('Erro de conexão', 'error'); }
          });
        }

        const delBtn = row.querySelector('.admin-del-btn');
        if (delBtn) {
          delBtn.addEventListener('click', () => openPermanentDeleteUserModal(user, row));
        }

        const batchCb = row.querySelector('.admin-batch-cb');
        if (batchCb) {
          batchCb.addEventListener('change', () => {
            if (batchCb.checked) {
              _batchSelected.add(user.id);
              row.classList.add('batch-selected');
            } else {
              _batchSelected.delete(user.id);
              row.classList.remove('batch-selected');
            }
            syncBatchToolbar();
          });
        }

        if (isEquipe(user)) {
          equipeDropdown.body.appendChild(row);
        } else {
          row.dataset.searchText = _normalizeSearch(
            (user.full_name || '') + ' ' + (user.username || '') + ' ' + (user.email || '')
          );
          colabDropdown.body.appendChild(row);
        }
      }

      if (adminPanelRestore) {
        requestAnimationFrame(() => {
          listEl.scrollTop = adminPanelRestore.scrollTop;
        });
      }
    } catch (e) {
      showToast('Failed to load users', 'error');
    }
  }

  function closeAdminUsersModal() {
    document.getElementById('admin-users-modal').classList.add('hidden');
  }

  function openTesterRoleModal() {
    logEvent('tester_role_modal_open');
    const modal = document.getElementById('tester-role-modal');
    document.getElementById('tester-btn-team').classList.toggle('active', testerMode === 'team');
    document.getElementById('tester-btn-contributor').classList.toggle('active', testerMode === 'contributor');
    modal.classList.remove('hidden');
  }

  function closeTesterRoleModal() {
    document.getElementById('tester-role-modal').classList.add('hidden');
  }

  async function switchTesterMode(newMode) {
    if (newMode === testerMode) return;
    try {
      const res = await fetch('/api/tester/mode', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ tester_mode: newMode })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Erro', 'error');
        return;
      }
      testerMode = newMode;
      document.getElementById('tester-btn-team').classList.toggle('active', newMode === 'team');
      document.getElementById('tester-btn-contributor').classList.toggle('active', newMode === 'contributor');
      logEvent('tester_mode_switch', null, null, { mode: newMode });

      if (isTeamOrAbove()) {
        showAdminTools();
      } else {
        hideAdminTools();
      }

      if (insertionMode) setInsertionMode(false);
      if (deletionMode) setDeletionMode(false);

      if (typeof LeucenaDrawing !== 'undefined' && LeucenaDrawing.refreshPolyStyles) {
        LeucenaDrawing.refreshPolyStyles();
      }

      const roleLabel = newMode === 'team' ? LeucenaI18n.t('tester.roleMember') : LeucenaI18n.t('tester.roleContributor');
      showToast(LeucenaI18n.t('tester.switched', roleLabel), 'success');
      closeTesterRoleModal();
    } catch (e) {
      showToast('Erro de conexão', 'error');
    }
  }

  async function handleInsertionClick(latLng) {
    if (!insertionMode) return;
    if (!selectedCellData || selectedCellData.locked_by !== username) {
      setInsertionMode(false);
      return;
    }
    const lat = latLng.lat();
    const lng = latLng.lng();
    if (!LeucenaMap.isLatLngInsideMappingCell || !LeucenaMap.isLatLngInsideMappingCell(selectedCellId, latLng)) {
      logEvent('point_add_outside_cell', selectedCellId, null, { lat, lng });
      showToast(LeucenaI18n.t('toast.pointOutsideCell'), 'warning');
      return;
    }
    try {
      const res = await fetch('/api/points', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ lat, lng })
      });
      if (!res.ok) { const err = await res.json(); logEvent('point_add_error', selectedCellId, null, { lat, lng, error: err.error, status: res.status }); showToast(err.error, 'error'); return; }
      const pt = await res.json();
      insertionHistory.push(pt.id);
      logEvent('point_added', selectedCellId, pt.id, { lat, lng });
      showToast(LeucenaI18n.t('toast.pointAdded', pt.fid), 'success');
    } catch (err) { logEvent('point_add_error', selectedCellId, null, { lat, lng, error: err.message || String(err) }); showToast(LeucenaI18n.t('toast.addFail'), 'error'); }
  }

  async function handleDeletionClick(latLng) {
    if (!deletionMode) return;
    if (!selectedCellData || selectedCellData.locked_by !== username) {
      setDeletionMode(false);
      return;
    }
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
        const err = await res.json().catch(() => ({}));
        logEvent('point_delete_error', selectedCellId, nearest.id, { fid: pointData.fid, status: res.status, error: err.error });
        if (res.status === 403) {
          showToast(LeucenaI18n.t('toast.cannotDeleteOther'), 'warning');
        } else {
          showToast(err.error || LeucenaI18n.t('toast.deleteFail'), 'error');
        }
        return;
      }
      LeucenaMap.removePointMarker(nearest.id);
      deletionHistory.push(pointData);
      logEvent('point_deleted', selectedCellId, nearest.id, { fid: pointData.fid });
      showToast(LeucenaI18n.t('toast.pointDeleted', pointData.fid), 'info');
    } catch (err) {
      logEvent('point_delete_error', selectedCellId, nearest.id, { fid: pointData.fid, error: err.message || String(err) });
      showToast(LeucenaI18n.t('toast.deleteFail'), 'error');
    }
  }

  async function handlePointModeKey(e) {
    if (insertionMode) {
      if ((e.key === 'l' || e.key === 'L') && isTeamOrAbove()) {
        e.preventDefault();
        const coords = LeucenaMap.getLastCoords();
        if (!coords) { showToast(LeucenaI18n.t('toast.moveMouseFirst'), 'warning'); return; }
        const parts = coords.split(',').map(s => parseFloat(s.trim()));
        if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return;
        const [lat, lng] = parts;
        if (!LeucenaMap.isLatLngInsideMappingCell || !LeucenaMap.isLatLngInsideMappingCell(selectedCellId, { lat, lng })) {
          logEvent('point_add_outside_cell', selectedCellId, null, { lat, lng, via: 'hotkey_l' });
          showToast(LeucenaI18n.t('toast.pointOutsideCell'), 'warning');
          return;
        }

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

  function onCellStatusChanged(data) {
    if (!selectedCellId || data.cellId !== selectedCellId) return;
    if (selectedCellData) {
      selectedCellData.grid_status = data.status;
      if (data.finished_by !== undefined) selectedCellData.finished_by = data.finished_by;
      if (data.worked_by !== undefined) selectedCellData.worked_by = data.worked_by;
      if (data.mask_count !== undefined) selectedCellData.mask_count = data.mask_count;
      if (data.mask_area_ha !== undefined) selectedCellData.mask_area_ha = data.mask_area_ha;
      if (data.mapped_by !== undefined) selectedCellData.mapped_by = data.mapped_by;
    }
    document.getElementById('cell-status-display').textContent = formatStatus(data.status);
    if (selectedCellData) {
      updateCellMasksDisplay(selectedCellData);
      updateCellAttributionDisplay(selectedCellData);
    }
  }

  // ── Inbox ──

  let _inboxMessages = [];
  let _inboxBadgeInterval = null;

  async function refreshInboxBadge() {
    if (!isLoggedIn()) return;
    try {
      const r = await fetch('/api/messages/unread-count', { headers: authHeaders() });
      if (!r.ok) return;
      const data = await r.json();
      const count = data.count || 0;
      const badge = document.getElementById('inbox-badge');
      if (!badge) return;
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
      } else {
        badge.textContent = '';
        badge.classList.add('hidden');
      }
    } catch (e) { /* ignore */ }
  }

  function startInboxPolling() {
    stopInboxPolling();
    _inboxBadgeInterval = setInterval(refreshInboxBadge, 60000);
  }

  function stopInboxPolling() {
    if (_inboxBadgeInterval) { clearInterval(_inboxBadgeInterval); _inboxBadgeInterval = null; }
  }

  async function openInboxModal() {
    logEvent('inbox_open');
    const t = LeucenaI18n.t;
    const modal = document.getElementById('inbox-modal');
    const list = document.getElementById('inbox-list');
    modal.classList.remove('hidden');
    list.innerHTML = '<p class="inbox-empty">' + t('inbox.noMessages') + '</p>';
    try {
      const r = await fetch('/api/messages', { headers: authHeaders() });
      if (!r.ok) return;
      _inboxMessages = await r.json();
      renderInboxList();
    } catch (e) { /* ignore */ }
  }

  function _senderDisplayName(msg) {
    return msg.sender_full_name || msg.sender;
  }

  function _senderIsAdmin(msg) {
    return msg.sender_role === 'admin' || msg.sender_role === 'superadmin';
  }

  function _senderHtml(msg) {
    const name = escapeHtml(_senderDisplayName(msg));
    const uname = msg.sender_full_name && msg.sender_full_name !== msg.sender
      ? ' <span class="inbox-sender-username">(' + escapeHtml(msg.sender) + ')</span>' : '';
    const badge = _senderIsAdmin(msg) ? ' <span class="inbox-admin-badge">Admin</span>' : '';
    return name + uname + badge;
  }

  function _targetLabel(msg) {
    const t = LeucenaI18n.t;
    if (msg.target === 'all') return t('inbox.toAll');
    if (msg.target === 'admins') return t('inbox.toAdmins');
    return t('inbox.toUser', msg.target);
  }

  function _buildThreads(messages) {
    const byId = {};
    const roots = [];
    const children = {};

    for (const m of messages) byId[m.id] = m;

    for (const m of messages) {
      let rootId = m.id;
      if (m.reply_to && byId[m.reply_to]) {
        rootId = m.reply_to;
        let parent = byId[rootId];
        while (parent && parent.reply_to && byId[parent.reply_to]) {
          rootId = parent.reply_to;
          parent = byId[rootId];
        }
      }
      if (rootId === m.id) {
        roots.push(m);
      } else {
        if (!children[rootId]) children[rootId] = [];
        children[rootId].push(m);
      }
    }

    for (const id of Object.keys(children)) {
      children[id].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    roots.sort((a, b) => {
      const aReplies = children[a.id] || [];
      const bReplies = children[b.id] || [];
      const aLatest = aReplies.length ? aReplies[aReplies.length - 1].created_at : a.created_at;
      const bLatest = bReplies.length ? bReplies[bReplies.length - 1].created_at : b.created_at;
      return new Date(bLatest) - new Date(aLatest);
    });

    return { roots, children };
  }

  function _fmtDate(iso) {
    return new Date(iso).toLocaleDateString(LeucenaI18n.getLang(), { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function _sanitizeComposeHtml(html) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const ALLOWED = new Set(['B', 'I', 'STRONG', 'EM', 'DEL', 'S', 'STRIKE', 'MARK', 'BLOCKQUOTE', 'A', 'BR', 'P', 'DIV', 'SPAN', 'U', 'UL', 'OL', 'LI']);
    (function walk(node) {
      Array.from(node.childNodes).forEach(c => {
        if (c.nodeType === 1) {
          if (!ALLOWED.has(c.tagName)) {
            while (c.firstChild) node.insertBefore(c.firstChild, c);
            node.removeChild(c);
          } else {
            Array.from(c.attributes).forEach(a => {
              if (c.tagName === 'A' && a.name === 'href') {
                if (!/^https?:\/\//i.test(a.value)) c.removeAttribute(a.name);
              } else if (c.tagName === 'A' && (a.name === 'target' || a.name === 'rel' || a.name === 'class')) {
                /* keep */
              } else {
                c.removeAttribute(a.name);
              }
            });
            if (c.tagName === 'A') {
              c.setAttribute('target', '_blank');
              c.setAttribute('rel', 'noopener noreferrer');
            }
            walk(c);
          }
        }
      });
    })(tmp);
    return tmp.innerHTML;
  }

  function _stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  function _isHtmlBody(body) {
    return /<(?:b|i|strong|em|del|s|mark|blockquote|a |br|p|div|u|ul|ol|li)[>\s/]/i.test(body);
  }

  function _renderBody(body) {
    if (!body) return '';
    if (_isHtmlBody(body)) return _sanitizeComposeHtml(body);
    return _formatMsgBody(body);
  }

  function _formatMsgBody(text) {
    let html = escapeHtml(text);

    // Markdown-style link: [label](url) — only allow http(s) URLs
    html = html.replace(/\[([^\]]{1,200})\]\((https?:\/\/[^)]{1,500})\)/g,
      '<a href="$2" target="_blank" rel="noopener" class="inbox-link">$1</a>');

    // Bold **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic *text* (but not ** which is bold)
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    // Strikethrough ~~text~~
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    // Highlight ==text==
    html = html.replace(/==(.+?)==/g, '<mark class="inbox-highlight">$1</mark>');
    // Quote > text (at line start)
    html = html.replace(/^(&gt; .+)$/gm, '<span class="inbox-quote">$1</span>');

    // Auto-linkify bare URLs not already inside an href
    html = html.replace(/(?<!href="|">)(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener" class="inbox-link">$1</a>');

    // "Como Mapear" guide link
    html = html.replace(
      /(?:📖|&quot;Como [Mm]apear&quot;|&quot;How to [Mm]ap&quot;|&quot;Cómo [Mm]apear&quot;)/g,
      '<a href="#howto" class="inbox-link inbox-link-guide">$&</a>'
    );
    return html;
  }

  function _renderMsgBubble(msg, isLast) {
    const t = LeucenaI18n.t;
    const isMine = msg.sender === username;
    const isUnread = !msg.read_at && !isMine;

    let replyHtml = '';
    if (isLast && msg.allow_reply && !isMine) {
      replyHtml = '<button class="btn btn-secondary inbox-reply-btn" data-msg-id="' + msg.id + '">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/></svg>' +
        t('inbox.reply') + '</button>';
    } else if (isLast && !msg.allow_reply && !isMine) {
      replyHtml = '<p class="inbox-no-reply-notice">' + t('inbox.noReplyNotice') + '</p>';
    }
    let deleteHtml = '';
    if (isSuperAdmin()) {
      deleteHtml = '<button class="inbox-delete-btn" data-msg-id="' + msg.id + '" title="Apagar mensagem">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>' +
        '</button>';
    }

    const bubble = document.createElement('div');
    bubble.className = 'inbox-bubble' + (isMine ? ' inbox-bubble-mine' : '') + (isUnread ? ' inbox-bubble-unread' : '');
    bubble.dataset.msgId = msg.id;
    let imagesHtml = '';
    if (msg.images) {
      try {
        const imgs = typeof msg.images === 'string' ? JSON.parse(msg.images) : msg.images;
        if (Array.isArray(imgs) && imgs.length > 0) {
          imagesHtml = '<div class="inbox-bubble-images">' +
            imgs.map(src => '<img src="' + src + '" class="inbox-bubble-img" alt="image">').join('') +
            '</div>';
        }
      } catch (e) { /* ignore bad JSON */ }
    }
    bubble.innerHTML =
      '<div class="inbox-bubble-header">' +
        '<span class="inbox-bubble-sender">' + _senderHtml(msg) + '</span>' +
        '<span class="inbox-bubble-date">' + _fmtDate(msg.created_at) + deleteHtml + '</span>' +
      '</div>' +
      '<div class="inbox-bubble-body">' + _renderBody(msg.body) + '</div>' +
      imagesHtml +
      replyHtml;

    bubble.querySelectorAll('.inbox-bubble-img').forEach(img => {
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        const lb = document.getElementById('inbox-lightbox');
        document.getElementById('inbox-lightbox-img').src = img.src;
        lb.classList.remove('hidden');
      });
    });
    const delBtn = bubble.querySelector('.inbox-delete-btn');
    if (delBtn) {
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Apagar esta mensagem permanentemente?')) return;
        try {
          const r = await fetch('/api/messages/' + delBtn.dataset.msgId, {
            method: 'DELETE', headers: authHeaders()
          });
          if (r.ok) {
            showToast('Mensagem apagada', 'success');
            openInboxModal();
          } else {
            const j = await r.json();
            showToast(j.error || 'Erro ao apagar', 'error');
          }
        } catch (err) { showToast('Erro de conexão', 'error'); }
      });
    }
    return bubble;
  }

  let _inboxBatchSelected = new Set();

  function _updateInboxBatchToolbar() {
    const t = LeucenaI18n.t;
    const toolbar = document.getElementById('inbox-batch-toolbar');
    if (!toolbar) return;
    const count = _inboxBatchSelected.size;
    if (count === 0) {
      toolbar.classList.add('hidden');
      return;
    }
    toolbar.classList.remove('hidden');
    const countEl = toolbar.querySelector('.inbox-batch-count');
    if (countEl) countEl.textContent = t('inbox.batchSelected', count);
  }

  async function _inboxBatchAction(action) {
    const t = LeucenaI18n.t;
    const ids = [..._inboxBatchSelected];
    if (ids.length === 0) return;
    if (action === 'delete') {
      if (!confirm(t('inbox.batchDeleteConfirm', ids.length))) return;
    }
    try {
      const r = await fetch('/api/messages/batch', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids })
      });
      if (r.ok) {
        logEvent('inbox_batch', null, null, { action: action, count: ids.length });
        const msg = action === 'delete' ? t('inbox.batchDeleteSuccess', ids.length)
                  : action === 'mark_read' ? t('inbox.batchReadSuccess')
                  : t('inbox.batchUnreadSuccess');
        showToast(msg, 'success');
        _inboxBatchSelected.clear();
        openInboxModal();
      } else {
        const j = await r.json();
        showToast(j.error || 'Error', 'error');
      }
    } catch (e) { showToast('Erro de conexão', 'error'); }
  }

  function renderInboxList() {
    const t = LeucenaI18n.t;
    const list = document.getElementById('inbox-list');
    list.innerHTML = '';
    _inboxBatchSelected.clear();

    const topBar = document.createElement('div');
    topBar.className = 'inbox-top-bar';

    const composeBtn = document.createElement('button');
    composeBtn.className = 'btn btn-primary';
    composeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> ' +
      (isAdminUser() ? t('inbox.compose') : t('inbox.sendToAdmin'));
    composeBtn.addEventListener('click', () => { closeInboxModal(); openComposeModal(); });
    topBar.appendChild(composeBtn);

    const _threadIdMap = {};

    if (_inboxMessages.length > 0) {
      const selectAllBtn = document.createElement('button');
      selectAllBtn.className = 'btn btn-secondary btn-sm inbox-select-all-btn';
      selectAllBtn.textContent = t('inbox.selectAll');
      selectAllBtn.addEventListener('click', () => {
        const cbs = list.querySelectorAll('.inbox-thread-cb');
        const allChecked = [...cbs].every(cb => cb.checked);
        cbs.forEach(cb => {
          cb.checked = !allChecked;
          const rootId = Number(cb.dataset.threadRootId);
          const ids = _threadIdMap[rootId] || [rootId];
          if (!allChecked) ids.forEach(id => _inboxBatchSelected.add(id));
          else ids.forEach(id => _inboxBatchSelected.delete(id));
        });
        selectAllBtn.textContent = allChecked ? t('inbox.selectAll') : t('inbox.deselectAll');
        _updateInboxBatchToolbar();
      });
      topBar.appendChild(selectAllBtn);
    }

    list.appendChild(topBar);

    const batchToolbar = document.createElement('div');
    batchToolbar.id = 'inbox-batch-toolbar';
    batchToolbar.className = 'inbox-batch-toolbar hidden';
    batchToolbar.innerHTML = '<span class="inbox-batch-count"></span>' +
      '<button class="btn btn-sm inbox-batch-btn inbox-batch-read"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> ' + t('inbox.batchMarkRead') + '</button>' +
      '<button class="btn btn-sm inbox-batch-btn inbox-batch-unread"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg> ' + t('inbox.batchMarkUnread') + '</button>' +
      (isSuperAdmin() ? '<button class="btn btn-sm inbox-batch-btn inbox-batch-delete"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg> ' + t('inbox.batchDelete') + '</button>' : '');
    batchToolbar.querySelector('.inbox-batch-read').addEventListener('click', () => _inboxBatchAction('mark_read'));
    batchToolbar.querySelector('.inbox-batch-unread').addEventListener('click', () => _inboxBatchAction('mark_unread'));
    const delBtn = batchToolbar.querySelector('.inbox-batch-delete');
    if (delBtn) delBtn.addEventListener('click', () => _inboxBatchAction('delete'));
    list.appendChild(batchToolbar);

    if (_inboxMessages.length === 0) {
      const emptyEl = document.createElement('p');
      emptyEl.className = 'inbox-empty';
      emptyEl.textContent = t('inbox.noMessages');
      list.appendChild(emptyEl);
      return;
    }

    const { roots, children } = _buildThreads(_inboxMessages);

    for (const root of roots) {
      const replies = children[root.id] || [];
      const allMsgs = [root, ...replies];
      const allIds = allMsgs.map(m => m.id);
      _threadIdMap[root.id] = allIds;
      const threadUnread = allMsgs.filter(m => !m.read_at && m.sender !== username).length;
      const lastMsg = allMsgs[allMsgs.length - 1];
      const hasReplies = replies.length > 0;

      const threadEl = document.createElement('div');
      threadEl.className = 'inbox-thread' + (threadUnread > 0 ? ' inbox-thread-unread' : '');

      const cbWrap = document.createElement('div');
      cbWrap.className = 'inbox-thread-cb-wrap';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'inbox-thread-cb';
      cb.dataset.threadRootId = root.id;
      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        if (cb.checked) {
          allIds.forEach(id => _inboxBatchSelected.add(id));
        } else {
          allIds.forEach(id => _inboxBatchSelected.delete(id));
        }
        _updateInboxBatchToolbar();
      });
      cbWrap.addEventListener('click', (e) => e.stopPropagation());
      cbWrap.appendChild(cb);

      const headerEl = document.createElement('div');
      headerEl.className = 'inbox-thread-header';
      headerEl.innerHTML =
        (threadUnread > 0 ? '<span class="inbox-item-unread-dot"></span>' : '') +
        '<span class="inbox-item-subject">' + escapeHtml(root.subject) + '</span>' +
        (hasReplies ? '<span class="inbox-thread-count">' + allMsgs.length + '</span>' : '') +
        '<span class="inbox-thread-chevron">&#9662;</span>' +
        '<span class="inbox-item-date">' + _fmtDate(lastMsg.created_at) + '</span>';

      const metaEl = document.createElement('div');
      metaEl.className = 'inbox-item-meta';
      metaEl.innerHTML = t('inbox.from', _senderHtml(root)) + ' · ' + _targetLabel(root);

      const previewEl = document.createElement('div');
      previewEl.className = 'inbox-thread-preview';
      const rawBody = _isHtmlBody(lastMsg.body) ? _stripHtml(lastMsg.body) : lastMsg.body;
      const previewText = rawBody.length > 80 ? rawBody.substring(0, 80) + '...' : rawBody;
      if (hasReplies) {
        previewEl.innerHTML = '<span class="inbox-preview-sender">' + escapeHtml(_senderDisplayName(lastMsg)) + ':</span> ' + escapeHtml(previewText);
      } else {
        previewEl.textContent = previewText;
      }

      const bodyEl = document.createElement('div');
      bodyEl.className = 'inbox-thread-body';

      for (let i = 0; i < allMsgs.length; i++) {
        bodyEl.appendChild(_renderMsgBubble(allMsgs[i], i === allMsgs.length - 1));
      }

      const clickZone = document.createElement('div');
      clickZone.className = 'inbox-thread-clickzone';
      clickZone.appendChild(headerEl);
      clickZone.appendChild(metaEl);
      clickZone.appendChild(previewEl);

      threadEl.appendChild(cbWrap);
      threadEl.appendChild(clickZone);
      threadEl.appendChild(bodyEl);

      clickZone.addEventListener('click', (e) => {
        if (e.target.closest('.inbox-reply-btn')) return;
        if (e.target.closest('.inbox-thread-cb')) return;
        threadEl.classList.toggle('inbox-thread-expanded');

        if (threadEl.classList.contains('inbox-thread-expanded') && threadUnread > 0) {
          allMsgs.forEach(m => {
            if (!m.read_at && m.sender !== username) {
              const bubbleEl = bodyEl.querySelector('[data-msg-id="' + m.id + '"]');
              markMessageRead(m.id, bubbleEl);
            }
          });
          threadEl.classList.remove('inbox-thread-unread');
          const dot = headerEl.querySelector('.inbox-item-unread-dot');
          if (dot) dot.remove();
        }
      });

      bodyEl.addEventListener('click', (e) => {
        const guideLink = e.target.closest('.inbox-link-guide');
        if (guideLink) {
          e.preventDefault();
          e.stopPropagation();
          closeInboxModal();
          openGuideModal('howto');
          return;
        }
        const replyBtn = e.target.closest('.inbox-reply-btn');
        if (replyBtn) {
          e.stopPropagation();
          const msgId = Number(replyBtn.dataset.msgId);
          const msg = _inboxMessages.find(m => m.id === msgId) || lastMsg;
          closeInboxModal();
          openReplyModal(msg);
        }
      });

      list.appendChild(threadEl);
    }
  }

  async function markMessageRead(msgId, el) {
    try {
      await fetch(`/api/messages/${msgId}/read`, { method: 'PUT', headers: authHeaders() });
      if (el) el.classList.remove('inbox-bubble-unread');
      const msg = _inboxMessages.find(m => m.id === msgId);
      if (msg) msg.read_at = new Date().toISOString();
      refreshInboxBadge();
    } catch (e) { /* ignore */ }
  }

  function closeInboxModal() {
    document.getElementById('inbox-modal').classList.add('hidden');
  }

  let _composeMode = 'admin';
  let _composeReplyTo = null;

  async function openComposeModal(mode, replyMsg) {
    logEvent('inbox_compose_open', null, null, { mode: mode || 'admin', reply: !!replyMsg });
    const t = LeucenaI18n.t;
    _composeMode = mode || (isAdminUser() ? 'admin' : 'user');
    _composeReplyTo = replyMsg || null;

    const modal = document.getElementById('inbox-compose-modal');
    const select = document.getElementById('inbox-compose-target');
    const errEl = document.getElementById('inbox-compose-error');
    const subjectEl = document.getElementById('inbox-compose-subject');
    const bodyEl = document.getElementById('inbox-compose-body');
    const allowReplyWrap = document.getElementById('inbox-compose-allow-reply-wrap');
    const allowReplyCb = document.getElementById('inbox-compose-allow-reply');
    const targetField = select.closest('.compose-field');

    errEl.classList.add('hidden');
    bodyEl.value = '';

    const existingReplyInfo = modal.querySelector('.compose-reply-info');
    if (existingReplyInfo) existingReplyInfo.remove();

    if (_composeMode === 'reply' && _composeReplyTo) {
      subjectEl.value = _composeReplyTo.subject.startsWith('Re: ') ? _composeReplyTo.subject : 'Re: ' + _composeReplyTo.subject;
      targetField.classList.add('hidden');
      allowReplyWrap.classList.add('hidden');
      const info = document.createElement('div');
      info.className = 'compose-reply-info';
      info.textContent = t('inbox.replyTo', _composeReplyTo.sender + ' — ' + _composeReplyTo.subject);
      errEl.parentElement.insertBefore(info, errEl.nextSibling);
    } else if (_composeMode === 'user') {
      subjectEl.value = '';
      targetField.classList.add('hidden');
      allowReplyWrap.classList.add('hidden');
    } else {
      subjectEl.value = '';
      targetField.classList.remove('hidden');
      allowReplyWrap.classList.remove('hidden');
      allowReplyCb.checked = true;
      select.innerHTML = '<option value="all">' + t('inbox.recipientAll') + '</option>';
      try {
        const r = await fetch('/api/admin/users', { headers: authHeaders() });
        if (r.ok) {
          const users = await r.json();
          for (const u of users) {
            if (u.username === 'deleted') continue;
            const opt = document.createElement('option');
            opt.value = u.username;
            opt.textContent = u.full_name ? u.full_name + ' (' + u.username + ')' : u.username;
            select.appendChild(opt);
          }
        }
      } catch (e) { /* ignore */ }
    }
    modal.classList.remove('hidden');
  }

  function openReplyModal(msg) {
    openComposeModal('reply', msg);
  }

  async function openComposeModalForUser(targetUsername) {
    await openComposeModal('admin');
    const select = document.getElementById('inbox-compose-target');
    if (select) {
      for (const opt of select.options) {
        if (opt.value === targetUsername) { select.value = targetUsername; break; }
      }
    }
  }

  let _batchTargetUsernames = null;

  function openBatchComposeModal(ids, colabUsers) {
    const t = LeucenaI18n.t;
    _batchTargetUsernames = colabUsers.filter(u => ids.includes(u.id)).map(u => u.username);
    if (_batchTargetUsernames.length === 0) return;
    _composeMode = 'batch';
    _composeReplyTo = null;

    const modal = document.getElementById('inbox-compose-modal');
    const select = document.getElementById('inbox-compose-target');
    const errEl = document.getElementById('inbox-compose-error');
    const subjectEl = document.getElementById('inbox-compose-subject');
    const bodyEl = document.getElementById('inbox-compose-body');
    const allowReplyWrap = document.getElementById('inbox-compose-allow-reply-wrap');
    const allowReplyCb = document.getElementById('inbox-compose-allow-reply');
    const targetField = select.closest('.compose-field');

    errEl.classList.add('hidden');
    subjectEl.value = '';
    bodyEl.value = '';

    const existingReplyInfo = modal.querySelector('.compose-reply-info');
    if (existingReplyInfo) existingReplyInfo.remove();

    targetField.classList.add('hidden');
    allowReplyWrap.classList.remove('hidden');
    allowReplyCb.checked = true;

    const info = document.createElement('div');
    info.className = 'compose-reply-info';
    info.textContent = t('admin.batchConfirmSendMessage', _batchTargetUsernames.length);
    errEl.parentElement.insertBefore(info, errEl.nextSibling);

    modal.classList.remove('hidden');
  }

  function closeComposeModal() {
    closeSendConfirm();
    document.getElementById('inbox-compose-modal').classList.add('hidden');
    _composeReplyTo = null;
    _composeMode = 'admin';
    _batchTargetUsernames = null;
    _composeImages = [];
    _renderComposeImagePreviews();
    document.getElementById('inbox-compose-body').innerHTML = '';
    const counter = document.getElementById('compose-char-counter');
    if (counter) { counter.textContent = '0 / 2000'; counter.className = 'compose-char-counter'; }
  }

  let _confirmResolve = null;
  let _confirmSendHandler = null;

  function showSendConfirmation(recipientLabel, subject, body) {
    return new Promise((resolve) => {
      _confirmResolve = resolve;
      document.getElementById('inbox-confirm-recipient').textContent = recipientLabel;
      document.getElementById('inbox-confirm-subject').textContent = subject;
      document.getElementById('inbox-confirm-body').innerHTML = _isHtmlBody(body) ? _sanitizeComposeHtml(body) : _formatMsgBody(body);
      const confirmImgs = document.getElementById('inbox-confirm-images');
      if (_composeImages.length > 0) {
        confirmImgs.innerHTML = _composeImages.map(src =>
          '<img src="' + src + '" class="inbox-confirm-thumb" alt="image">'
        ).join('');
        confirmImgs.classList.remove('hidden');
      } else {
        confirmImgs.innerHTML = '';
        confirmImgs.classList.add('hidden');
      }
      document.getElementById('inbox-confirm-modal').classList.remove('hidden');

      const sendBtn = document.getElementById('inbox-confirm-send');
      if (_confirmSendHandler) sendBtn.removeEventListener('click', _confirmSendHandler);
      _confirmSendHandler = () => {
        document.getElementById('inbox-confirm-modal').classList.add('hidden');
        if (_confirmResolve) { const r = _confirmResolve; _confirmResolve = null; r(true); }
        sendBtn.removeEventListener('click', _confirmSendHandler);
        _confirmSendHandler = null;
      };
      sendBtn.addEventListener('click', _confirmSendHandler);
    });
  }

  function closeSendConfirm() {
    document.getElementById('inbox-confirm-modal').classList.add('hidden');
    const sendBtn = document.getElementById('inbox-confirm-send');
    if (_confirmSendHandler) { sendBtn.removeEventListener('click', _confirmSendHandler); _confirmSendHandler = null; }
    if (_confirmResolve) { const r = _confirmResolve; _confirmResolve = null; r(false); }
  }

  function getRecipientLabel(mode, target, replyTo, batchUsernames) {
    const t = LeucenaI18n.t;
    if (mode === 'batch' && batchUsernames) {
      return t('inbox.confirmRecipientBatch', batchUsernames.length);
    }
    if (mode === 'reply' && replyTo) {
      return replyTo.sender + ' (' + t('inbox.replyTo') + ')';
    }
    if (mode === 'user') {
      return t('inbox.confirmRecipientSuperadmins');
    }
    if (target === 'all') {
      return t('inbox.recipientAll');
    }
    const select = document.getElementById('inbox-compose-target');
    return select.options[select.selectedIndex].textContent;
  }

  async function handleComposeSend(e) {
    e.preventDefault();
    const t = LeucenaI18n.t;
    const subject = document.getElementById('inbox-compose-subject').value.trim();
    const editorEl = document.getElementById('inbox-compose-body');
    const bodyHtml = _sanitizeComposeHtml(editorEl.innerHTML);
    const bodyText = editorEl.textContent.trim();
    const errEl = document.getElementById('inbox-compose-error');
    if (!subject || !bodyText) return;
    if (bodyText.length > 2000) {
      errEl.textContent = 'Mensagem deve ter no máximo 2000 caracteres';
      errEl.classList.remove('hidden');
      return;
    }
    const body = bodyHtml;

    let endpoint, payload;

    if (_composeMode === 'batch' && _batchTargetUsernames && _batchTargetUsernames.length > 0) {
      const recipientLabel = getRecipientLabel('batch', null, null, _batchTargetUsernames);
      const confirmed = await showSendConfirmation(recipientLabel, subject, body);
      if (!confirmed) return;
      const allowReply = document.getElementById('inbox-compose-allow-reply').checked;
      const btn = document.getElementById('inbox-compose-submit');
      btn.disabled = true;
      try {
        let ok = 0, fail = 0;
        for (const target of _batchTargetUsernames) {
          const r = await fetch('/api/admin/messages', {
            method: 'POST',
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject, body, target, allow_reply: allowReply, images: _composeImages.length ? _composeImages : undefined })
          });
          if (r.ok) ok++; else fail++;
        }
        closeComposeModal();
        logEvent('inbox_batch_send', null, null, { ok: ok, fail: fail, total: _batchTargetUsernames.length });
        showToast(t('inbox.sentSuccess') + ` (${ok}/${_batchTargetUsernames.length})`, 'success');
      } catch (err) {
        logEvent('inbox_batch_send_error', null, null, { error: err.message || String(err), total: _batchTargetUsernames.length });
        errEl.textContent = t('inbox.sentFail');
        errEl.classList.remove('hidden');
      } finally { btn.disabled = false; }
      return;
    }

    const imgs = _composeImages.length ? _composeImages : undefined;
    if (_composeMode === 'reply' && _composeReplyTo) {
      endpoint = '/api/messages/reply';
      payload = { parent_id: _composeReplyTo.id, body, images: imgs };
    } else if (_composeMode === 'user') {
      endpoint = '/api/messages/send';
      payload = { subject, body, images: imgs };
    } else {
      const target = document.getElementById('inbox-compose-target').value;
      const allowReply = document.getElementById('inbox-compose-allow-reply').checked;
      endpoint = '/api/admin/messages';
      payload = { subject, body, target, allow_reply: allowReply, images: imgs };
    }

    const recipientLabel = getRecipientLabel(
      _composeMode,
      payload.target || null,
      _composeReplyTo,
      null
    );
    const confirmed = await showSendConfirmation(recipientLabel, subject, body);
    if (!confirmed) return;

    const btn = document.getElementById('inbox-compose-submit');
    btn.disabled = true;
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (r.ok) {
        closeComposeModal();
        showToast(t('inbox.sentSuccess'), 'success');
        logEvent('inbox_send', null, null, { mode: _composeMode, target: payload.target || null });
      } else {
        const j = await r.json();
        errEl.textContent = j.error || t('inbox.sentFail');
        errEl.classList.remove('hidden');
        logEvent('inbox_send_error', null, null, { mode: _composeMode, error: j.error, status: r.status });
      }
    } catch (err) {
      errEl.textContent = t('inbox.sentFail');
      errEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
    }
  }

  function onInboxNew(data) {
    if (!isLoggedIn()) return;
    if (data.sender === username) return;
    const role = getEffectiveRole();
    const isRecipient = isSuperAdmin()
      || (data.target === 'all' && role === 'contributor')
      || data.target === username
      || (data.target === 'admins' && isSuperAdmin());
    if (!isRecipient) return;
    const t = LeucenaI18n.t;
    showToast(t('inbox.newMessage', data.subject), 'info', 6000);
    const badge = document.getElementById('inbox-badge');
    if (badge) {
      const cur = parseInt(badge.textContent, 10) || 0;
      badge.textContent = cur + 1;
      badge.classList.remove('hidden');
    }
    setTimeout(refreshInboxBadge, 2000);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
    setInsertionMode,
    setDeletionMode,
    handleInsertionClick,
    handleDeletionClick,
    scheduleAutoCollapseLegend,
    refreshLegendToggleTitleForLang,
    refreshStreetViewTitleForLang,
    isEditing,
    isAdminUser,
    isSuperAdmin,
    isTeamOrAbove,
    getEffectiveRole,
    logEvent,
    flushLogs: _flushLogs,
    onPolygonSaved,
    onPolygonDeleted,
    onCellStatusChanged,
    refreshCellSidebarIfSelected,
    onInboxNew,
    refreshInboxBadge,
    selectStateFromMap,
    closeSiblingToolbarDropdown,
    openComposeModalForUser
  };
})();

/**
 * Phase 6 — QC review carousel (admin only).
 *
 * Workflow:
 *   1. Admin clicks the "Modo Revisão" button in the topbar (or the
 *      per-cell "Modo Revisão (N)" button in the sidebar).
 *   2. Picker modal lists cells that still have polygons in the chosen
 *      QC status (default: 'unreviewed'), sorted by pending volume.
 *   3. Admin picks a cell → enters review mode: floating carousel at the
 *      bottom of the map, polygons are visited one-by-one, each one
 *      highlighted in cyan + made editable so refinements can be made
 *      in-place before approving.
 *   4. Geometry edits auto-save (debounced via attachPathListeners in
 *      drawing.js). Ctrl+Z and the "Desfazer" button pop the last edit
 *      snapshot for the focused polygon. Available geometry tools:
 *      Buraco (hole) and Remover Vértice — both bypass the cell lock
 *      check, since admin QC never holds a lock.
 *   5. Actions: Aprovar / Rejeitar / Marcar / Devolver para a fila. Setas
 *      ← → só navegam (sem mudar status). Aprovar / rejeitar / marcar avançam
 *      ao seguinte; a maioria das revisões é "aprovar com pequenos ajustes".
 */
window.LeucenaQC = (function () {
  let state = null; // { cellId, gridCellLabel, polygons: [...], idx, statusFilter }
  let _summaryCache = null;
  let _previousMapView = null; // { zoom, center } so we can restore on exit

  /**
   * QC review is open to team+ (team, admin, superadmin). Server-side gating
   * lives in server.js (/api/admin/qc/* uses isTeamOrAbove).
   * Kept the legacy `_isAdmin` alias to avoid touching every call-site.
   */
  function _isReviewer() {
    if (typeof LeucenaApp === 'undefined') return false;
    if (LeucenaApp.isTeamOrAbove && LeucenaApp.isTeamOrAbove()) return true;
    if (LeucenaApp.isAdminUser && LeucenaApp.isAdminUser()) return true;
    return false;
  }
  const _isAdmin = _isReviewer;

  function _t(key, fallback) {
    if (typeof LeucenaI18n === 'undefined') return fallback || key;
    const v = LeucenaI18n.t(key);
    return v && v !== key ? v : (fallback || key);
  }

  function init() {
    if (!_isAdmin()) {
      _hideAdminButton();
      return;
    }
    _showAdminButton();
    _wireAdminButton();
    _wirePickerModal();
    _wirePanelButtons();
    _bindKeyboard();
    _bindSocket();
    refreshSummary();
  }

  function _showAdminButton() {
    const btn = document.getElementById('qc-review-btn');
    if (btn) btn.classList.remove('hidden');
  }
  function _hideAdminButton() {
    const btn = document.getElementById('qc-review-btn');
    if (btn) btn.classList.add('hidden');
  }

  function _wireAdminButton() {
    const btn = document.getElementById('qc-review-btn');
    if (!btn || btn._wired) return;
    btn._wired = true;
    btn.addEventListener('click', openPicker);
  }

  /** Lightweight count refresh for the badge on the admin button. */
  async function refreshSummary() {
    if (!_isAdmin()) return;
    try {
      const res = await fetch('/api/admin/qc/summary', { headers: LeucenaApp.authHeaders ? LeucenaApp.authHeaders() : {} });
      if (!res.ok) return;
      _summaryCache = await res.json();
      _renderBadge();
    } catch (e) {
      // Silent — the badge is purely informational.
    }
  }

  function _renderBadge() {
    const badge = document.getElementById('qc-review-badge');
    if (!badge) return;
    const pending = _summaryCache && _summaryCache.unreviewed != null ? _summaryCache.unreviewed : 0;
    if (pending > 0) {
      badge.textContent = pending > 99 ? '99+' : String(pending);
      badge.classList.remove('hidden');
    } else {
      badge.textContent = '';
      badge.classList.add('hidden');
    }
  }

  // ── Picker modal ─────────────────────────────────────────────────────────

  async function openPicker() {
    if (!_isAdmin()) return;
    const modal = document.getElementById('qc-picker-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    _renderScopeHint();
    if (LeucenaApp && LeucenaApp.logEvent) LeucenaApp.logEvent('qc_picker_open');
    await _loadPickerList(_currentStatusFilter());
  }

  /** Returns the currently active UF (e.g., "SP") or null when on Brasil. */
  function _currentScopeUF() {
    if (typeof LeucenaMap === 'undefined' || !LeucenaMap.getCurrentState) return null;
    const uf = LeucenaMap.getCurrentState();
    return uf ? String(uf).toUpperCase() : null;
  }

  /** Update the small scope label inside the picker (shows "Brasil" or UF). */
  function _renderScopeHint() {
    const el = document.getElementById('qc-picker-scope');
    if (!el) return;
    const uf = _currentScopeUF();
    el.textContent = uf
      ? _t('qc.scopeState', 'Mostrando células de {uf}').replace('{uf}', uf)
      : _t('qc.scopeBrazil', 'Mostrando células do Brasil inteiro');
  }

  function _closePicker() {
    const modal = document.getElementById('qc-picker-modal');
    if (modal) modal.classList.add('hidden');
  }

  function _currentStatusFilter() {
    const sel = document.getElementById('qc-picker-status');
    return sel ? sel.value : 'unreviewed';
  }

  async function _loadPickerList(status) {
    const list = document.getElementById('qc-picker-list');
    const empty = document.getElementById('qc-picker-empty');
    if (list) list.innerHTML = '<div class="qc-picker-loading">' + _t('qc.loading', 'Carregando…') + '</div>';
    if (empty) empty.classList.add('hidden');

    // Filter by current region (UF) when the admin is browsing a specific
    // state; on Brasil view the request is unscoped so cells from every UF
    // appear.
    const uf = _currentScopeUF();
    let url = '/api/admin/qc/cells?status=' + encodeURIComponent(status);
    if (uf) url += '&state=' + encodeURIComponent(uf);

    let payload;
    try {
      const res = await fetch(url, {
        headers: LeucenaApp.authHeaders ? LeucenaApp.authHeaders() : {}
      });
      payload = await res.json();
    } catch (e) {
      if (list) list.innerHTML = '<div class="qc-picker-error">' + _t('qc.loadError', 'Erro ao carregar células.') + '</div>';
      return;
    }

    const cells = (payload && payload.cells) || [];
    if (!cells.length) {
      if (list) list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }

    const html = cells.map((c) => {
      const label = c.cell_grid_id || ('#' + c.cell_id);
      const oldest = c.oldest_at ? new Date(c.oldest_at) : null;
      const oldestStr = oldest ? oldest.toLocaleDateString() : '—';
      const uf = c.cell_state ? String(c.cell_state).toUpperCase() : '';
      const ufBadge = uf
        ? '<span class="qc-picker-row-uf" title="' + _t('qc.stateOf', 'Estado') + '">' + uf + '</span>'
        : '';
      return '<button type="button" class="qc-picker-row" data-cell-id="' + c.cell_id + '">'
        + '<div class="qc-picker-row-main">'
          + ufBadge
          + '<span class="qc-picker-row-cell">' + label + '</span>'
          + '<span class="qc-picker-row-status">' + (c.cell_status || '—') + '</span>'
        + '</div>'
        + '<div class="qc-picker-row-meta">'
          + '<span class="qc-picker-row-count">' + c.pending_count + ' '
            + (c.pending_count === 1 ? _t('qc.pendingOne', 'pendente') : _t('qc.pendingMany', 'pendentes')) + '</span>'
          + '<span class="qc-picker-row-date">' + _t('qc.since', 'desde') + ' ' + oldestStr + '</span>'
        + '</div>'
        + '</button>';
    }).join('');
    if (list) list.innerHTML = html;

    if (list) {
      list.querySelectorAll('.qc-picker-row').forEach((row) => {
        row.addEventListener('click', () => {
          const cellId = Number(row.getAttribute('data-cell-id'));
          if (cellId) enterCell(cellId, status);
        });
      });
    }
  }

  function _wirePickerModal() {
    const modal = document.getElementById('qc-picker-modal');
    const closeBtn = document.getElementById('qc-picker-close');
    const status = document.getElementById('qc-picker-status');
    if (modal && !modal._wired) {
      modal._wired = true;
      modal.addEventListener('click', (e) => { if (e.target === modal) _closePicker(); });
    }
    if (closeBtn && !closeBtn._wired) {
      closeBtn._wired = true;
      closeBtn.addEventListener('click', _closePicker);
    }
    if (status && !status._wired) {
      status._wired = true;
      status.addEventListener('change', () => _loadPickerList(status.value));
    }
  }

  // ── Carousel ─────────────────────────────────────────────────────────────

  async function enterCell(cellId, statusFilter) {
    statusFilter = statusFilter || 'unreviewed';
    let payload;
    try {
      const res = await fetch('/api/admin/qc/cells/' + cellId + '/polygons?status=' + encodeURIComponent(statusFilter), {
        headers: LeucenaApp.authHeaders ? LeucenaApp.authHeaders() : {}
      });
      payload = await res.json();
    } catch (e) {
      LeucenaApp.showToast(_t('qc.loadError', 'Erro ao carregar polígonos.'), 'error');
      return;
    }
    const polys = (payload && payload.polygons) || [];
    if (!polys.length) {
      LeucenaApp.showToast(_t('qc.noPolygons', 'Sem polígonos pendentes nesta célula.'), 'info');
      return;
    }

    _closePicker();

    // Snapshot current map view so we can restore once the admin exits.
    const map = LeucenaMap.getMap();
    if (map) {
      _previousMapView = { zoom: map.getZoom(), center: map.getCenter() };
    }

    // Cell label can be derived from grid data; fall back to numeric ID.
    let cellLabel = '#' + cellId;
    if (typeof LeucenaMap.getGridData === 'function') {
      const gd = LeucenaMap.getGridData() || {};
      const c = gd[cellId];
      if (c && c.grid_id) cellLabel = c.grid_id;
    }

    state = {
      cellId: cellId,
      cellLabel: cellLabel,
      statusFilter: statusFilter,
      polygons: polys,
      idx: 0
    };

    if (LeucenaApp && LeucenaApp.logEvent) {
      LeucenaApp.logEvent('qc_review_open', cellId, null, { count: polys.length, status: statusFilter });
    }

    // Make the grid hollow so the admin can see through cells and inspect
    // satellite imagery beneath the polygons being reviewed.
    if (LeucenaMap.setGridsHollow) LeucenaMap.setGridsHollow(true);

    // Pre-render every polygon in this cell so the admin sees the full
    // context (not just the focused one floating in space). Without this,
    // when the admin enters from a state different than the cell's, only
    // the focused polygon is on-map and the surrounding ones pop in one-by-one
    // as they navigate — disorienting.
    polys.forEach((p) => {
      const exists = LeucenaDrawing.getPolyEntry && LeucenaDrawing.getPolyEntry(p.id);
      if (!exists && LeucenaDrawing.addRemotePolygon) {
        LeucenaDrawing.addRemotePolygon({
          id: p.id,
          grid_cell_id: p.grid_cell_id,
          geometry: p.geometry,
          created_by: p.created_by,
          created_by_role: p.created_by_role,
          created_at: p.created_at,
          updated_at: p.updated_at,
          area_ha: p.area_ha,
          qc_status: p.qc_status,
          qc_by: p.qc_by,
          qc_at: p.qc_at
        });
      }
    });

    document.body.classList.add('qc-review-active');
    _showPanel();
    if (LeucenaApp && LeucenaApp.collapseSidebarUi) LeucenaApp.collapseSidebarUi();

    // Defer the first focus until the panel has been laid out: fitBounds()
    // computes the visible viewport using the map div's current pixel size,
    // and if we run it before the bottom panel has reserved its space, the
    // camera lands on a point that ignores the panel padding (visually
    // looks like a "random" location, off-center). Two RAFs guarantee a
    // post-layout, post-paint frame.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (LeucenaMap.triggerResize) LeucenaMap.triggerResize();
        // Fresh entry: clear idx so _gotoIndex always runs the focus path
        // even when targeting index 0 (it normally short-circuits when
        // state.idx already matches).
        if (state) state.idx = -1;
        _gotoIndex(0);
      });
    });
  }

  function _gotoIndex(idx) {
    if (!state) return;
    if (idx < 0 || idx >= state.polygons.length) return;
    if (state.idx !== idx && state.idx != null) {
      _unfocusCurrent();
    }
    state.idx = idx;
    const poly = state.polygons[idx];
    if (!poly) return;

    _focusPolygon(poly);
    _captureQcAreaBaseline(poly);
    _renderPanel();
  }

  function _unfocusCurrent() {
    if (!state) return;
    const cur = state.polygons[state.idx];
    if (!cur) return;
    // Flush any in-flight auto-save before tearing down listeners. Without
    // this, the 150ms debounce in attachPathListeners can swallow an edit
    // the admin did right before clicking Next/Prev/Esc.
    if (LeucenaDrawing.flushPendingPolygonSave) {
      LeucenaDrawing.flushPendingPolygonSave(cur.id);
    }
    // Tear down hole / vertex-remove tools so they don't leak across
    // polygon boundaries.
    _exitAllGeometryTools();
    if (LeucenaDrawing.setQcFocus) LeucenaDrawing.setQcFocus(cur.id, false);
    if (LeucenaDrawing.setPolyEditableSingle) LeucenaDrawing.setPolyEditableSingle(cur.id, false);
  }

  function _focusPolygon(poly) {
    const entry = LeucenaDrawing.getPolyEntry && LeucenaDrawing.getPolyEntry(poly.id);
    if (!entry) {
      // Polygon may not be loaded into drawnPolygons yet (cell not visited
      // by the client). Render it ourselves so it shows up + focuses.
      LeucenaDrawing.addRemotePolygon({
        id: poly.id,
        grid_cell_id: poly.grid_cell_id,
        geometry: poly.geometry,
        created_by: poly.created_by,
        created_by_role: poly.created_by_role,
        created_at: poly.created_at,
        updated_at: poly.updated_at,
        area_ha: poly.area_ha,
        qc_status: poly.qc_status,
        qc_by: poly.qc_by,
        qc_at: poly.qc_at
      });
    }
    if (LeucenaDrawing.setQcFocus) LeucenaDrawing.setQcFocus(poly.id, true);
    if (LeucenaDrawing.setPolyEditableSingle) LeucenaDrawing.setPolyEditableSingle(poly.id, true);

    // Zoom + pan to fit the polygon comfortably.
    _fitPolygon(poly.geometry);
  }

  function _fitPolygon(geometry) {
    const map = LeucenaMap.getMap();
    if (!map || !geometry || !geometry.coordinates || !geometry.coordinates[0]) return;
    const bounds = new google.maps.LatLngBounds();
    geometry.coordinates[0].forEach((c) => bounds.extend({ lng: c[0], lat: c[1] }));
    // Add a touch of padding so vertex handles aren't clipped at the edges.
    map.fitBounds(bounds, { top: 80, bottom: 220, left: 60, right: 60 });
  }

  function _formatQcArea(ha) {
    const h = Number(ha) || 0;
    if (h < 0.1) return Math.round(h * 10000).toLocaleString() + ' m²';
    return h.toFixed(2) + ' ha';
  }

  function _captureQcAreaBaseline(poly) {
    if (!poly) return;
    let live = null;
    if (LeucenaDrawing.getLiveAreaHaForPolygon) live = LeucenaDrawing.getLiveAreaHaForPolygon(poly.id);
    poly._qcSessionBaselineHa = live != null ? live : Number(poly.area_ha) || 0;
  }

  function _updateQcPanelAreaDisplay(liveHaOpt) {
    const areaLive = document.getElementById('qc-panel-area-live');
    const areaSaved = document.getElementById('qc-panel-area-saved');
    if (!areaLive || !state) return;
    const poly = state.polygons[state.idx];
    if (!poly) return;
    const baseline = poly._qcSessionBaselineHa != null ? poly._qcSessionBaselineHa : Number(poly.area_ha) || 0;
    let live = liveHaOpt;
    if (live == null && LeucenaDrawing.getLiveAreaHaForPolygon) {
      live = LeucenaDrawing.getLiveAreaHaForPolygon(poly.id);
    }
    if (live == null) live = baseline;
    areaLive.textContent = _formatQcArea(live);
    if (areaSaved) {
      const diff = Math.abs(Number(live) - Number(baseline)) >= 1e-5;
      if (diff) {
        areaSaved.textContent = _t('qc.areaAtFocus', 'Referência ao focar') + ': ' + _formatQcArea(baseline);
        areaSaved.classList.remove('hidden');
        areaSaved.setAttribute('aria-hidden', 'false');
      } else {
        areaSaved.textContent = '';
        areaSaved.classList.add('hidden');
        areaSaved.setAttribute('aria-hidden', 'true');
      }
    }
  }

  function refreshPanelLiveArea(polyId, liveHa) {
    if (!state) return;
    const cur = state.polygons[state.idx];
    if (!cur || cur.id !== polyId) return;
    _updateQcPanelAreaDisplay(liveHa);
  }

  function syncSavedAreaAfterGeometryPut(polyId, areaHa) {
    if (!state) return;
    const ha = Number(areaHa);
    if (!Number.isFinite(ha)) return;
    for (let i = 0; i < state.polygons.length; i++) {
      if (state.polygons[i].id === polyId) {
        state.polygons[i].area_ha = ha;
        state.polygons[i]._qcSessionBaselineHa = ha;
        break;
      }
    }
    const cur = state.polygons[state.idx];
    if (cur && cur.id === polyId) {
      _updateQcPanelAreaDisplay(ha);
    }
  }

  // ── Panel rendering & actions ────────────────────────────────────────────

  function _showPanel() {
    const panel = document.getElementById('qc-review-panel');
    if (panel) panel.classList.remove('hidden');
  }
  function _hidePanel() {
    const panel = document.getElementById('qc-review-panel');
    if (panel) panel.classList.add('hidden');
  }

  function _renderPanel() {
    if (!state) return;
    const poly = state.polygons[state.idx];
    if (!poly) return;
    const total = state.polygons.length;
    const idx1 = state.idx + 1;

    const cellEl = document.getElementById('qc-panel-cell');
    const counterEl = document.getElementById('qc-panel-counter');
    const creatorEl = document.getElementById('qc-panel-creator');
    const roleEl = document.getElementById('qc-panel-role');
    const statusEl = document.getElementById('qc-panel-status');
    const notesEl = document.getElementById('qc-panel-notes');

    if (cellEl) cellEl.textContent = state.cellLabel;
    if (counterEl) counterEl.textContent = idx1 + ' / ' + total;
    if (creatorEl) creatorEl.textContent = poly.created_by || '—';
    if (roleEl) {
      const role = poly.created_by_role || 'contributor';
      roleEl.textContent = role;
      roleEl.className = 'qc-panel-role qc-panel-role-' + role;
    }
    if (poly._qcSessionBaselineHa == null) {
      _captureQcAreaBaseline(poly);
    }
    _updateQcPanelAreaDisplay(null);
    if (statusEl) {
      statusEl.textContent = _t('qc.status.' + (poly.qc_status || 'unreviewed'), poly.qc_status || 'unreviewed');
      statusEl.className = 'qc-panel-status qc-status-' + (poly.qc_status || 'unreviewed');
    }
    if (notesEl) notesEl.value = poly.qc_notes || '';

    // Disable nav buttons at edges
    const prevBtn = document.getElementById('qc-panel-prev');
    const nextBtn = document.getElementById('qc-panel-next');
    if (prevBtn) prevBtn.disabled = state.idx === 0;
    if (nextBtn) nextBtn.disabled = state.idx === total - 1;

    _refreshUndoButton();
  }

  /** Habilita o botão "Desfazer" só quando há histórico para o polígono atual. */
  function _refreshUndoButton() {
    const btn = document.getElementById('qc-panel-undo');
    if (!btn || !state) return;
    const poly = state.polygons[state.idx];
    if (!poly) { btn.disabled = true; return; }
    const n = (LeucenaDrawing.getEditUndoCountForPolygon
      ? LeucenaDrawing.getEditUndoCountForPolygon(poly.id)
      : 0);
    btn.disabled = n <= 0;
  }

  function _wirePanelButtons() {
    const handlers = {
      'qc-panel-prev': prev,
      'qc-panel-next': next,
      'qc-panel-approve': approveCurrent,
      'qc-panel-flag': flagCurrent,
      'qc-panel-reject': rejectCurrent,
      'qc-panel-unreview': unreviewCurrent,
      'qc-panel-undo': undoCurrent,
      'qc-panel-hole': toggleHoleTool,
      'qc-panel-remove-vertex': toggleRemoveVertexTool,
      'qc-panel-exit': exit
    };
    Object.keys(handlers).forEach((id) => {
      const el = document.getElementById(id);
      if (el && !el._wired) {
        el._wired = true;
        el.addEventListener('click', handlers[id]);
      }
    });

    // Sync the Undo button after each gesture so the admin sees right away
    // when there's something to undo. We poll on mouseup / touchend because
    // attachPathListeners (drawing.js) doesn't expose a snapshot event.
    document.addEventListener('mouseup', _refreshUndoButton, true);
    document.addEventListener('touchend', _refreshUndoButton, true);
  }

  // ── Edit helpers (auto-save is handled by drawing.js attachPathListeners) ──

  async function undoCurrent() {
    if (!state) return;
    const poly = state.polygons[state.idx];
    if (!poly) return;
    if (!LeucenaDrawing.qcUndoForPolygon) return;
    const ok = await LeucenaDrawing.qcUndoForPolygon(poly.id);
    if (ok) {
      LeucenaApp.showToast(_t('qc.undone', 'Edição desfeita.'), 'success');
    }
    _refreshUndoButton();
    _updateQcPanelAreaDisplay(null);
  }

  let _holeToolActive = false;
  function toggleHoleTool() {
    if (!state) return;
    const poly = state.polygons[state.idx];
    if (!poly) return;
    if (_holeToolActive) {
      if (LeucenaApp && LeucenaApp.logEvent) {
        LeucenaApp.logEvent('qc_hole_btn_off', state.cellId, poly.id, null);
      }
      LeucenaDrawing.qcExitHoleMode && LeucenaDrawing.qcExitHoleMode();
      _holeToolActive = false;
      _setToolBtnActive('qc-panel-hole', false);
      return;
    }
    // Mutually exclusive with the vertex-remove tool.
    if (_vertexRemoveActive) toggleRemoveVertexTool();
    if (LeucenaApp && LeucenaApp.logEvent) {
      LeucenaApp.logEvent('qc_hole_btn_on', state.cellId, poly.id, null);
    }
    const ok = LeucenaDrawing.qcEnterHoleMode && LeucenaDrawing.qcEnterHoleMode(poly.id, () => {
      // Hole drawing finished (success, escape, or external cancel).
      _holeToolActive = false;
      _setToolBtnActive('qc-panel-hole', false);
    });
    if (ok) {
      _holeToolActive = true;
      _setToolBtnActive('qc-panel-hole', true);
    }
  }

  let _vertexRemoveActive = false;
  function toggleRemoveVertexTool() {
    if (!state) return;
    const poly = state.polygons[state.idx];
    if (!poly) return;
    if (_vertexRemoveActive) {
      // User clicking the button toggles off — explicit exit.
      if (LeucenaApp && LeucenaApp.logEvent) {
        LeucenaApp.logEvent('qc_vertex_remove_btn_off', state.cellId, poly.id, null);
      }
      LeucenaDrawing.qcExitRemoveVertexMode && LeucenaDrawing.qcExitRemoveVertexMode();
      _vertexRemoveActive = false;
      _setToolBtnActive('qc-panel-remove-vertex', false);
      return;
    }
    if (_holeToolActive) toggleHoleTool();
    if (LeucenaApp && LeucenaApp.logEvent) {
      LeucenaApp.logEvent('qc_vertex_remove_btn_on', state.cellId, poly.id, null);
    }
    // Pass an onExit callback so we can sync button state when drawing.js
    // auto-exits (user clicked outside a vertex, on the map, etc.).
    const ok = LeucenaDrawing.qcEnterRemoveVertexMode && LeucenaDrawing.qcEnterRemoveVertexMode(poly.id, () => {
      _vertexRemoveActive = false;
      _setToolBtnActive('qc-panel-remove-vertex', false);
    });
    if (ok) {
      _vertexRemoveActive = true;
      _setToolBtnActive('qc-panel-remove-vertex', true);
      LeucenaApp.showToast(_t('qc.vertexRemoveHint', 'Clique em qualquer vértice para removê-lo. Clique fora dele (ou de novo no botão) para sair.'), 'info');
    }
  }

  function _setToolBtnActive(id, active) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('active', !!active);
  }

  /** Sai de qualquer ferramenta de edição em andamento (hole / vertex-remove). */
  function _exitAllGeometryTools() {
    if (_holeToolActive) {
      LeucenaDrawing.qcExitHoleMode && LeucenaDrawing.qcExitHoleMode();
      _holeToolActive = false;
      _setToolBtnActive('qc-panel-hole', false);
    }
    if (_vertexRemoveActive) {
      LeucenaDrawing.qcExitRemoveVertexMode && LeucenaDrawing.qcExitRemoveVertexMode();
      _vertexRemoveActive = false;
      _setToolBtnActive('qc-panel-remove-vertex', false);
    }
  }

  function next() {
    if (!state) return;
    if (state.idx < state.polygons.length - 1) {
      _gotoIndex(state.idx + 1);
    } else {
      // Already on last item — exit gracefully so the admin isn't stuck.
      LeucenaApp.showToast(_t('qc.endOfQueue', 'Fim da fila desta célula.'), 'info');
    }
  }

  function prev() {
    if (!state) return;
    if (state.idx > 0) _gotoIndex(state.idx - 1);
  }

  async function _setStatus(newStatus) {
    if (!state) return false;
    const poly = state.polygons[state.idx];
    if (!poly) return false;
    const notesEl = document.getElementById('qc-panel-notes');
    const notes = notesEl ? notesEl.value : null;
    try {
      const res = await fetch('/api/admin/qc/polygons/' + poly.id, {
        method: 'PUT',
        headers: Object.assign({ 'Content-Type': 'application/json' }, LeucenaApp.authHeaders ? LeucenaApp.authHeaders() : {}),
        body: JSON.stringify({ qc_status: newStatus, qc_notes: notes })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        LeucenaApp.showToast(err.error || _t('qc.saveError', 'Erro ao salvar revisão.'), 'error');
        return false;
      }
      const data = await res.json();
      poly.qc_status = data.qc_status;
      poly.qc_by = data.qc_by;
      poly.qc_at = data.qc_at;
      poly.qc_notes = data.qc_notes;
      // Reflect immediately in the on-map style (will go violet for approved
      // contributor work once we unfocus the polygon).
      if (LeucenaDrawing.setPolyQcStatus) {
        LeucenaDrawing.setPolyQcStatus(poly.id, data.qc_status, data.qc_by, data.qc_at);
      }
      if (LeucenaApp && LeucenaApp.logEvent) {
        LeucenaApp.logEvent('qc_set_status', state.cellId, poly.id, { status: newStatus });
      }
      // Keep the sidebar's "Modo Revisão (N)" badge in sync with the new
      // pending count after this approval/rejection/flag.
      if (LeucenaApp && LeucenaApp.refreshSelectedCellQcButton) {
        LeucenaApp.refreshSelectedCellQcButton();
      }
      refreshSummary();
      return true;
    } catch (e) {
      LeucenaApp.showToast(_t('qc.saveError', 'Erro ao salvar revisão.'), 'error');
      return false;
    }
  }

  async function approveCurrent() {
    const ok = await _setStatus('approved');
    if (!ok) return;
    LeucenaApp.showToast(_t('qc.approved', 'Polígono aprovado.'), 'success');
    next();
  }

  async function flagCurrent() {
    const ok = await _setStatus('flagged');
    if (!ok) return;
    LeucenaApp.showToast(_t('qc.flagged', 'Polígono marcado para revisão futura.'), 'info');
    next();
  }

  async function rejectCurrent() {
    if (!confirm(_t('qc.confirmReject', 'Tem certeza que quer rejeitar este polígono?'))) return;
    const ok = await _setStatus('rejected');
    if (!ok) return;
    LeucenaApp.showToast(_t('qc.rejected', 'Polígono rejeitado.'), 'info');
    next();
  }

  async function unreviewCurrent() {
    const ok = await _setStatus('unreviewed');
    if (!ok) return;
    LeucenaApp.showToast(_t('qc.reset', 'Polígono devolvido para a fila.'), 'info');
    _renderPanel();
  }

  function exit() {
    if (!state) return;
    _unfocusCurrent();
    if (LeucenaApp && LeucenaApp.logEvent) {
      LeucenaApp.logEvent('qc_review_exit', state.cellId);
    }
    state = null;
    document.body.classList.remove('qc-review-active');
    _hidePanel();
    // Restore the grid fill (was made transparent on entry).
    if (LeucenaMap.setGridsHollow) LeucenaMap.setGridsHollow(false);
    // Refresh the sidebar's "Modo Revisão" badge so the count reflects any
    // approvals/rejections that just happened.
    if (LeucenaApp && LeucenaApp.refreshSelectedCellQcButton) {
      LeucenaApp.refreshSelectedCellQcButton();
    }
    if (_previousMapView && LeucenaMap.getMap) {
      const map = LeucenaMap.getMap();
      if (map && _previousMapView.center) map.setCenter(_previousMapView.center);
      if (map && _previousMapView.zoom != null) map.setZoom(_previousMapView.zoom);
    }
    _previousMapView = null;
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  // Only active while the panel is open. Mirrors common photo-review tools:
  //   ← → navigate (no QC status change) · A approve · F flag · R reject · Esc exit
  //   Ctrl/Cmd+Z: undo last geometry edit on the current polygon.

  function _bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (!state) return;
      // Ignore typing inside the notes textarea
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      // Ctrl/Cmd+Z: per-polygon undo. drawing.js owns Ctrl+Z while one of
      // its modes is active (draw/edit/delete/hole — e.g. removing the last
      // hole vertex while drawing a hole), so defer to it in those cases
      // and only act when the admin is in plain QC focus mode.
      if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
        const dMode = LeucenaDrawing.getActiveMode && LeucenaDrawing.getActiveMode();
        if (dMode === 'draw' || dMode === 'edit' || dMode === 'delete' || dMode === 'hole') return;
        e.preventDefault();
        e.stopPropagation();
        undoCurrent();
        return;
      }
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === 'a' || e.key === 'A') { e.preventDefault(); approveCurrent(); }
      else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); flagCurrent(); }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); rejectCurrent(); }
      else if (e.key === 'Escape') { e.preventDefault(); exit(); }
    });
  }

  // ── Realtime updates (other admins may be reviewing in parallel) ────────

  function _bindSocket() {
    if (typeof LeucenaCollab === 'undefined' || !LeucenaCollab.getSocket) return;
    const sock = LeucenaCollab.getSocket();
    if (!sock) return;
    sock.on('polygon:qc', (evt) => {
      if (LeucenaDrawing.setPolyQcStatus) {
        LeucenaDrawing.setPolyQcStatus(evt.id, evt.qc_status, evt.qc_by, evt.qc_at);
      }
      // If the panel is open and showing this polygon, refresh badge.
      if (state) {
        const poly = state.polygons.find((p) => p.id === evt.id);
        if (poly) {
          poly.qc_status = evt.qc_status;
          poly.qc_by = evt.qc_by;
          poly.qc_at = evt.qc_at;
          poly.qc_notes = evt.qc_notes;
          if (state.polygons[state.idx] && state.polygons[state.idx].id === evt.id) {
            _renderPanel();
          }
        }
      }
      refreshSummary();
    });
  }

  /** Numeric grid id of the cell under QC review, or null if the panel is closed. */
  function getReviewCellId() {
    return state ? state.cellId : null;
  }

  /**
   * After drawing.js setMode (select/edit), polygons were set non-editable globally;
   * re-apply QC focus + handles on the current carousel polygon.
   */
  function refocusCurrentPolygonIfReview() {
    if (!state || state.idx < 0 || state.idx >= state.polygons.length) return;
    const poly = state.polygons[state.idx];
    if (!poly) return;
    _focusPolygon(poly);
    _updateQcPanelAreaDisplay(null);
  }

  return {
    init,
    openPicker,
    enterCell,
    exit,
    next,
    prev,
    refreshSummary,
    getReviewCellId,
    refocusCurrentPolygonIfReview,
    refreshPanelLiveArea,
    syncSavedAreaAfterGeometryPut
  };
})();

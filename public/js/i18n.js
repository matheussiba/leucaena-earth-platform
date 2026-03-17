window.LeucenaI18n = (function () {
  let currentLang = localStorage.getItem('leucena_lang') || 'pt';

  const T = {
    // ── App title ──
    'app.title': { pt: 'Mapeamento de Leucena', en: 'Leucaena Mapping', es: 'Mapeo de Leucaena' },
    'app.startHere': { pt: 'Comece por aqui', en: 'Start here', es: 'Comience aquí' },

    // ── Auth ──
    'auth.login': { pt: 'Entrar', en: 'Sign In', es: 'Iniciar Sesión' },
    'auth.register': { pt: 'Cadastrar', en: 'Register', es: 'Registrarse' },
    'auth.loginSubtitle': { pt: 'Faça login para editar o mapa', en: 'Sign in to edit the map', es: 'Inicie sesión para editar el mapa' },
    'auth.registerSubtitle': { pt: 'Crie uma conta para começar a mapear', en: 'Create an account to start mapping', es: 'Cree una cuenta para empezar a mapear' },
    'auth.userPlaceholder': { pt: 'Usuário', en: 'Username', es: 'Usuario' },
    'auth.passPlaceholder': { pt: 'Senha', en: 'Password', es: 'Contraseña' },
    'auth.passcodePlaceholder': { pt: 'Código de acesso', en: 'Access code', es: 'Código de acceso' },
    'auth.passcodeHint': {
      pt: 'Se não possui o código, envie um e-mail para <a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a>',
      en: 'If you don\'t have the code, email <a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a>',
      es: 'Si no tiene el código, envíe un correo a <a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a>'
    },
    'auth.createAccount': { pt: 'Criar Conta', en: 'Create Account', es: 'Crear Cuenta' },
    'auth.noAccount': { pt: 'Não tem conta?', en: 'No account?', es: '¿No tiene cuenta?' },
    'auth.hasAccount': { pt: 'Já tem conta?', en: 'Already have an account?', es: '¿Ya tiene cuenta?' },
    'auth.connectionError': { pt: 'Erro de conexão. Tente novamente.', en: 'Connection error. Try again.', es: 'Error de conexión. Intente de nuevo.' },
    'auth.welcome': { pt: 'Bem-vindo, {0}!', en: 'Welcome, {0}!', es: '¡Bienvenido, {0}!' },
    'auth.disconnected': { pt: 'Desconectado', en: 'Disconnected', es: 'Desconectado' },
    'auth.loginToEdit': { pt: 'Faça login para Editar', en: 'Sign in to Edit', es: 'Inicie sesión para Editar' },
    'auth.logout': { pt: 'Sair', en: 'Logout', es: 'Salir' },

    // ── Top bar ──
    'topbar.export': { pt: 'Exportar', en: 'Export', es: 'Exportar' },
    'topbar.loginToDownload': { pt: 'Faça login para baixar', en: 'Login to download', es: 'Inicie sesión para descargar' },
    'topbar.polygonsGeoJSON': { pt: 'Polígonos (GeoJSON)', en: 'Polygons (GeoJSON)', es: 'Polígonos (GeoJSON)' },
    'topbar.gridGeoJSON': { pt: 'Status dos Grids (GeoJSON)', en: 'Grid Status (GeoJSON)', es: 'Estado de Grids (GeoJSON)' },
    'topbar.pointsGeoJSON': { pt: 'Pontos de Ocorrência (GeoJSON)', en: 'Occurrence Points (GeoJSON)', es: 'Puntos de Ocurrencia (GeoJSON)' },
    'topbar.onlineUsers': { pt: 'Usuários online', en: 'Online users', es: 'Usuarios en línea' },

    // ── Unlock modal ──
    'unlock.title': { pt: 'Desbloquear Célula', en: 'Unlock Cell', es: 'Desbloquear Celda' },
    'unlock.subtitle': { pt: 'Qual é o status desta célula?', en: 'What is the status of this cell?', es: '¿Cuál es el estado de esta celda?' },
    'unlock.finished': { pt: 'Finalizado', en: 'Finished', es: 'Finalizado' },
    'unlock.notFinished': { pt: 'Ainda não finalizado', en: 'Not yet finished', es: 'Aún no finalizado' },
    'unlock.cancel': { pt: 'Cancelar', en: 'Cancel', es: 'Cancelar' },

    // ── Add Points modal ──
    'addPts.title': { pt: 'Modo de Inserção de Pontos', en: 'Point Insertion Mode', es: 'Modo de Inserción de Puntos' },
    'addPts.desc': {
      pt: 'Você está prestes a entrar no modo de inserção de pontos. Enquanto ativo, pressione <strong>H</strong> para adicionar um ponto de Leucena na posição do cursor.',
      en: 'You are about to enter point insertion mode. While active, press <strong>H</strong> to add a Leucaena point at the cursor position.',
      es: 'Está a punto de entrar en el modo de inserción de puntos. Mientras esté activo, presione <strong>H</strong> para agregar un punto de Leucaena en la posición del cursor.'
    },
    'addPts.confirm': { pt: 'Deseja continuar?', en: 'Do you want to continue?', es: '¿Desea continuar?' },
    'addPts.yes': { pt: 'Sim, iniciar inserção de pontos', en: 'Yes, start inserting points', es: 'Sí, comenzar inserción de puntos' },

    // ── Insertion/Deletion banners ──
    'banner.insertion': { pt: 'MODO DE INSERÇÃO DE PONTOS — Pressione H para adicionar ponto, Ctrl+Z para desfazer', en: 'POINT INSERTION MODE — Press H to add point, Ctrl+Z to undo', es: 'MODO DE INSERCIÓN DE PUNTOS — Presione H para agregar punto, Ctrl+Z para deshacer' },
    'banner.deletion': { pt: 'MODO DE EXCLUSÃO DE PONTOS — Clique perto de um ponto para excluir, Ctrl+Z para desfazer', en: 'POINT DELETION MODE — Click near a point to delete, Ctrl+Z to undo', es: 'MODO DE ELIMINACIÓN DE PUNTOS — Haga clic cerca de un punto para eliminar, Ctrl+Z para deshacer' },

    // ── Sidebar ──
    'sidebar.statusFilter': { pt: 'Filtro de Status', en: 'Status Filter', es: 'Filtro de Estado' },
    'sidebar.layers': { pt: 'Camadas', en: 'Layers', es: 'Capas' },
    'sidebar.gridCells': { pt: 'Células do Grid', en: 'Grid Cells', es: 'Celdas de Grilla' },
    'sidebar.occurrencePoints': { pt: 'Pontos de Ocorrência', en: 'Occurrence Points', es: 'Puntos de Ocurrencia' },
    'sidebar.mappedPolygons': { pt: 'Polígonos Mapeados', en: 'Mapped Polygons', es: 'Polígonos Mapeados' },
    'sidebar.cellInfo': { pt: 'Informações da Célula', en: 'Cell Information', es: 'Información de la Celda' },
    'sidebar.cell': { pt: 'Célula', en: 'Cell', es: 'Celda' },
    'sidebar.status': { pt: 'Status:', en: 'Status:', es: 'Estado:' },
    'sidebar.numpoints': { pt: 'Nº de pontos:', en: 'Nº of points:', es: 'Nº de puntos:' },
    'sidebar.workedBy': { pt: 'Trabalhado por:', en: 'Worked by:', es: 'Trabajado por:' },
    'sidebar.finishedBy': { pt: 'Finalizado por:', en: 'Finished by:', es: 'Finalizado por:' },
    'sidebar.lockEdit': { pt: 'Bloquear e Editar', en: 'Lock & Edit', es: 'Bloquear y Editar' },
    'sidebar.onlineUsers': { pt: 'Usuários Online', en: 'Online Users', es: 'Usuarios en Línea' },

    // ── Status labels ──
    'status.not_yet_finished': { pt: 'Ainda não finalizado', en: 'Not yet finished', es: 'Aún no finalizado' },
    'status.mapping': { pt: 'Mapeando', en: 'Mapping', es: 'Mapeando' },
    'status.no_points': { pt: 'Sem pontos', en: 'No points', es: 'Sin puntos' },
    'status.finished': { pt: 'Finalizado', en: 'Finished', es: 'Finalizado' },

    // ── Toolbar ──
    'tool.select': { pt: 'Selecionar', en: 'Select', es: 'Seleccionar' },
    'tool.unlock': { pt: 'Desbloquear', en: 'Unlock', es: 'Desbloquear' },
    'tool.streetview': { pt: 'Street View', en: 'Street View', es: 'Street View' },
    'tool.map': { pt: 'Mapa', en: 'Map', es: 'Mapa' },
    'tool.satellite': { pt: 'Satélite', en: 'Satellite', es: 'Satélite' },
    'tool.labels': { pt: 'Rótulos', en: 'Labels', es: 'Etiquetas' },
    'tool.addPoints': { pt: 'Add Points', en: 'Add Points', es: 'Add Points' },
    'tool.delPoints': { pt: '- Pts', en: '- Pts', es: '- Pts' },
    'tool.draw': { pt: 'Desenhar Polígono', en: 'Draw Polygon', es: 'Dibujar Polígono' },
    'tool.edit': { pt: 'Editar Polígono', en: 'Edit Polygon', es: 'Editar Polígono' },
    'tool.deletePoly': { pt: 'Excluir Polígono', en: 'Delete Polygon', es: 'Eliminar Polígono' },
    'tool.home': { pt: 'Visão inicial', en: 'Initial view', es: 'Vista inicial' },
    'tool.zoomIn': { pt: 'Zoom +', en: 'Zoom +', es: 'Zoom +' },
    'tool.zoomOut': { pt: 'Zoom -', en: 'Zoom -', es: 'Zoom -' },
    'coords.hint': { pt: 'Clique direito no mapa para copiar coordenadas', en: 'Right-click on map to copy coordinates', es: 'Clic derecho en el mapa para copiar coordenadas' },

    // ── Legend ──
    'legend.title': { pt: 'Legenda', en: 'Legend', es: 'Leyenda' },
    'legend.cells': { pt: 'Células', en: 'Cells', es: 'Celdas' },
    'legend.leucenaPoints': { pt: 'Pontos de Leucena', en: 'Leucaena Points', es: 'Puntos de Leucaena' },
    'legend.leucenaMask': { pt: 'Máscara de Leucena', en: 'Leucaena Mask', es: 'Máscara de Leucaena' },
    'legend.validPoint': { pt: 'Válido', en: 'Valid', es: 'Válido' },
    'legend.invalidPoint': { pt: 'Inválido', en: 'Invalid', es: 'Inválido' },
    'legend.doubtPoint': { pt: 'Dúvida', en: 'Doubt', es: 'Duda' },
    'legend.layerStrokes': { pt: 'Contorno = Base de Dados', en: 'Stroke = Data Source', es: 'Contorno = Base de Datos' },
    'legend.mappedPolygon': { pt: 'Polígono mapeado', en: 'Mapped polygon', es: 'Polígono mapeado' },

    // ── Guide modal ──
    'guide.back': { pt: 'Voltar', en: 'Back', es: 'Volver' },
    'guide.subtitle': { pt: 'Selecione uma opção para saber mais sobre o projeto e como contribuir.', en: 'Select an option to learn more about the project and how to contribute.', es: 'Seleccione una opción para saber más sobre el proyecto y cómo contribuir.' },
    'guide.docs': { pt: 'Documentação', en: 'Documentation', es: 'Documentación' },
    'guide.docsDesc': { pt: 'Sobre o projeto, pesquisador e objetivos da plataforma', en: 'About the project, researcher and platform objectives', es: 'Sobre el proyecto, investigador y objetivos de la plataforma' },
    'guide.leucena': { pt: 'O que é Leucena?', en: 'What is Leucaena?', es: '¿Qué es la Leucaena?' },
    'guide.leucenaDesc': { pt: 'Identificação visual, história e por que é invasora', en: 'Visual identification, history and why it is invasive', es: 'Identificación visual, historia y por qué es invasora' },
    'guide.howto': { pt: 'Como mapear', en: 'How to map', es: 'Cómo mapear' },
    'guide.howtoDesc': { pt: 'Passo a passo para contribuir com o mapeamento', en: 'Step by step to contribute to the mapping', es: 'Paso a paso para contribuir con el mapeo' },

    // ── Edit badge ──
    'edit.badge': { pt: 'Editando Célula #{0}', en: 'Editing Cell #{0}', es: 'Editando Celda #{0}' },
    'edit.cellInfo': { pt: 'Célula #{0} - {1}', en: 'Cell #{0} - {1}', es: 'Celda #{0} - {1}' },

    // ── Toast messages (app.js) ──
    'toast.exitEditFirst': { pt: 'Saia do modo de edição primeiro. Clique em "Desbloquear".', en: 'Exit edit mode first. Click "Unlock".', es: 'Salga del modo de edición primero. Haga clic en "Desbloquear".' },
    'toast.noCellLocked': { pt: 'Nenhuma célula bloqueada por você', en: 'No cell locked by you', es: 'Ninguna celda bloqueada por usted' },
    'toast.cellUnlocked': { pt: 'Célula #{0} desbloqueada - {1}', en: 'Cell #{0} unlocked - {1}', es: 'Celda #{0} desbloqueada - {1}' },
    'toast.unlockFail': { pt: 'Falha ao desbloquear célula', en: 'Failed to unlock cell', es: 'Error al desbloquear celda' },
    'toast.cellLocked': { pt: 'Célula #{0} bloqueada para edição', en: 'Cell #{0} locked for editing', es: 'Celda #{0} bloqueada para edición' },
    'toast.lockFail': { pt: 'Falha ao bloquear célula', en: 'Failed to lock cell', es: 'Error al bloquear celda' },
    'toast.noNearbyPoint': { pt: 'Nenhum ponto próximo', en: 'No nearby point', es: 'Ningún punto cercano' },
    'toast.pointDeleted': { pt: 'Ponto #{0} excluído', en: 'Point #{0} deleted', es: 'Punto #{0} eliminado' },
    'toast.deleteFail': { pt: 'Falha ao excluir ponto', en: 'Failed to delete point', es: 'Error al eliminar punto' },
    'toast.moveMouseFirst': { pt: 'Mova o mouse sobre o mapa primeiro', en: 'Move mouse over the map first', es: 'Mueva el mouse sobre el mapa primero' },
    'toast.pointAdded': { pt: 'Ponto #{0} adicionado', en: 'Point #{0} added', es: 'Punto #{0} agregado' },
    'toast.addFail': { pt: 'Falha ao adicionar ponto', en: 'Failed to add point', es: 'Error al agregar punto' },
    'toast.nothingToUndo': { pt: 'Nada para desfazer', en: 'Nothing to undo', es: 'Nada para deshacer' },
    'toast.lastPointRemoved': { pt: 'Último ponto removido (desfazer)', en: 'Last point removed (undo)', es: 'Último punto eliminado (deshacer)' },
    'toast.undoFail': { pt: 'Falha ao desfazer ponto', en: 'Failed to undo point', es: 'Error al deshacer punto' },
    'toast.pointRestored': { pt: 'Ponto #{0} restaurado', en: 'Point #{0} restored', es: 'Punto #{0} restaurado' },
    'toast.restoreFail': { pt: 'Falha ao restaurar ponto', en: 'Failed to restore point', es: 'Error al restaurar punto' },
    'toast.lockedBy': { pt: 'Bloqueado por {0}', en: 'Locked by {0}', es: 'Bloqueado por {0}' },
    'toast.noPointsToEdit': { pt: 'Sem pontos para editar', en: 'No points to edit', es: 'Sin puntos para editar' },
    'toast.editingWarning': { pt: 'Você está editando uma célula. Clique em "Desbloquear" para parar de editar.', en: 'You are editing a cell. Click "Unlock" to stop editing.', es: 'Está editando una celda. Haga clic en "Desbloquear" para dejar de editar.' },

    // ── Toast messages (map.js) ──
    'toast.gridLoadFail': { pt: 'Falha ao carregar grid', en: 'Failed to load grid', es: 'Error al cargar grilla' },
    'toast.pointsLoadFail': { pt: 'Falha ao carregar pontos', en: 'Failed to load points', es: 'Error al cargar puntos' },
    'toast.coordsCopied': { pt: 'Coordenadas copiadas: {0}', en: 'Coordinates copied: {0}', es: 'Coordenadas copiadas: {0}' },
    'toast.loginToToggle': { pt: 'Faça login para alterar a validade do ponto', en: 'Sign in to change point validity', es: 'Inicie sesión para cambiar la validez del punto' },
    'toast.validityFail': { pt: 'Falha ao atualizar validade do ponto', en: 'Failed to update point validity', es: 'Error al actualizar validez del punto' },
    'toast.markedInvalid': { pt: 'Ponto marcado como inválido', en: 'Point marked as invalid', es: 'Punto marcado como inválido' },
    'toast.markedValid': { pt: 'Ponto marcado como válido', en: 'Point marked as valid', es: 'Punto marcado como válido' },
    'toast.markedDoubt': { pt: 'Ponto marcado como dúvida', en: 'Point marked as doubt', es: 'Punto marcado como duda' },
    'toast.panWarning': { pt: 'Você está se afastando da célula em edição. Clique em "Desbloquear" para parar de editar.', en: 'You are moving away from the editing cell. Click "Unlock" to stop editing.', es: 'Se está alejando de la celda en edición. Haga clic en "Desbloquear" para dejar de editar.' },

    // ── Toast messages (drawing.js) ──
    'toast.polyLoadFail': { pt: 'Falha ao carregar polígonos', en: 'Failed to load polygons', es: 'Error al cargar polígonos' },
    'toast.selectCellFirst': { pt: 'Selecione e bloqueie uma célula primeiro', en: 'Select and lock a cell first', es: 'Seleccione y bloquee una celda primero' },
    'toast.min3Vertices': { pt: 'Polígono precisa de pelo menos 3 vértices', en: 'Polygon needs at least 3 vertices', es: 'El polígono necesita al menos 3 vértices' },
    'toast.polySaved': { pt: 'Polígono salvo', en: 'Polygon saved', es: 'Polígono guardado' },
    'toast.polySaveFail': { pt: 'Falha ao salvar polígono', en: 'Failed to save polygon', es: 'Error al guardar polígono' },
    'toast.polyBelongs': { pt: 'Este polígono pertence a {0}', en: 'This polygon belongs to {0}', es: 'Este polígono pertenece a {0}' },
    'toast.lockCellToEdit': { pt: 'Bloqueie a célula para editar seus polígonos', en: 'Lock the cell to edit its polygons', es: 'Bloquee la celda para editar sus polígonos' },
    'toast.polyEditSaveFail': { pt: 'Falha ao salvar alterações do polígono', en: 'Failed to save polygon changes', es: 'Error al guardar cambios del polígono' },
    'toast.polyBelongsAdmin': { pt: 'Este polígono pertence a {0}. Somente ele ou o administrador pode excluí-lo.', en: 'This polygon belongs to {0}. Only they or the admin can delete it.', es: 'Este polígono pertenece a {0}. Solo él o el administrador puede eliminarlo.' },
    'toast.lockCellToDelete': { pt: 'Bloqueie a célula para excluir seus polígonos', en: 'Lock the cell to delete its polygons', es: 'Bloquee la celda para eliminar sus polígonos' },
    'toast.polyDeleted': { pt: 'Polígono excluído', en: 'Polygon deleted', es: 'Polígono eliminado' },
    'toast.polyDeleteFail': { pt: 'Falha ao excluir polígono', en: 'Failed to delete polygon', es: 'Error al eliminar polígono' },

    // ── Toast messages (streetview.js) ──
    'toast.svClickHint': { pt: 'Clique no mapa para abrir Street View. Linhas azuis mostram a cobertura disponível.', en: 'Click on the map to open Street View. Blue lines show available coverage.', es: 'Haga clic en el mapa para abrir Street View. Las líneas azules muestran la cobertura disponible.' },
    'toast.svNotAvailable': { pt: 'Street View não disponível neste local', en: 'Street View not available at this location', es: 'Street View no disponible en esta ubicación' },

    // ── Toast messages (collaboration.js) ──
    'toast.connected': { pt: 'Conectado ao servidor', en: 'Connected to server', es: 'Conectado al servidor' },
    'toast.reconnecting': { pt: 'Desconectado do servidor. Reconectando...', en: 'Disconnected from server. Reconnecting...', es: 'Desconectado del servidor. Reconectando...' },
    'toast.userStartedEditing': { pt: '{0} começou a editar Célula #{1}', en: '{0} started editing Cell #{1}', es: '{0} comenzó a editar Celda #{1}' },
    'toast.userFinishedEditing': { pt: '{0} terminou de editar Célula #{1}', en: '{0} finished editing Cell #{1}', es: '{0} terminó de editar Celda #{1}' },
    'collab.idle': { pt: 'Ocioso', en: 'Idle', es: 'Inactivo' },
    'collab.cell': { pt: 'Célula #{0}', en: 'Cell #{0}', es: 'Celda #{0}' },

    // ── Toast messages (export.js) ──
    'toast.exportPreparing': { pt: 'Preparando exportação...', en: 'Preparing export...', es: 'Preparando exportación...' },
    'toast.exportDone': { pt: 'Exportação concluída', en: 'Export complete', es: 'Exportación completada' },
    'toast.exportFail': { pt: 'Falha na exportação', en: 'Export failed', es: 'Error en la exportación' },

    // ── Point markers ──
    'point.title': { pt: 'Ponto #{0}', en: 'Point #{0}', es: 'Punto #{0}' },
    'point.titleInvalid': { pt: 'Ponto #{0} (inválido)', en: 'Point #{0} (invalid)', es: 'Punto #{0} (inválido)' },
    'point.titleDoubt': { pt: 'Ponto #{0} (dúvida)', en: 'Point #{0} (doubt)', es: 'Punto #{0} (duda)' }
  };

  function t(key, ...args) {
    const entry = T[key];
    if (!entry) return key;
    let str = entry[currentLang] || entry['pt'] || key;
    args.forEach((arg, i) => {
      str = str.replace(`{${i}}`, arg);
    });
    return str;
  }

  function tHtml(key, ...args) {
    return t(key, ...args);
  }

  function getLang() { return currentLang; }

  function setLang(lang) {
    if (!['pt', 'en', 'es'].includes(lang)) return;
    currentLang = lang;
    localStorage.setItem('leucena_lang', lang);
    translatePage();
  }

  function translatePage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = val;
      } else {
        el.textContent = val;
      }
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.getAttribute('data-i18n-title'));
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });

    translateGuideModal();
    translateDocsModal();
    updateLangDropdownLabel();
  }

  function updateLangDropdownLabel() {
    const btn = document.getElementById('lang-btn-label');
    if (btn) btn.textContent = currentLang.toUpperCase();
  }

  function translateGuideModal() {
    const leucenaPage = document.getElementById('guide-leucena-content');
    const howtoPage = document.getElementById('guide-howto-content');
    if (!leucenaPage || !howtoPage) return;

    if (currentLang === 'en') {
      leucenaPage.innerHTML = getLeucenaContentEN();
      howtoPage.innerHTML = getHowtoContentEN();
    } else if (currentLang === 'es') {
      leucenaPage.innerHTML = getLeucenaContentES();
      howtoPage.innerHTML = getHowtoContentES();
    } else {
      leucenaPage.innerHTML = getLeucenaContentPT();
      howtoPage.innerHTML = getHowtoContentPT();
    }
  }

  function translateDocsModal() {
    const docsContent = document.getElementById('docs-inner-content');
    if (!docsContent) return;
    const now = new Date();
    if (currentLang === 'en') {
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      docsContent.innerHTML = getDocsEN(months[now.getMonth()], now.getFullYear());
    } else if (currentLang === 'es') {
      const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      docsContent.innerHTML = getDocsES(months[now.getMonth()], now.getFullYear());
    } else {
      const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      docsContent.innerHTML = getDocsPT(months[now.getMonth()], now.getFullYear());
    }
  }

  // ── Leucena content per language ──

  function getLeucenaContentPT() {
    return `<h2>O que é Leucena?</h2>
<div class="guide-photos"><figure><img src="/img/leucena-tree.jpg" alt="Árvore de Leucena"><figcaption>Leucena em área urbana — porte típico da espécie</figcaption></figure><figure><img src="/img/leucena-detail.jpg" alt="Detalhes da Leucena"><figcaption>Flores esféricas brancas, folhas bipinadas e vagens</figcaption></figure></div>
<h3>Identificação</h3><p><em>Leucaena leucocephala</em>, conhecida popularmente como <strong>leucena</strong>, é uma árvore ou arbusto tropical da família das leguminosas (Fabaceae). Suas características mais marcantes para identificação são:</p><ul><li><strong>Folhas bipinadas</strong> — compostas por muitos folíolos pequenos e alinhados, dando aparência de "pena"</li><li><strong>Flores esféricas brancas</strong> — inflorescências em formato de "pompom" ou "bolinha" branca</li><li><strong>Vagens achatadas</strong> — marrons quando maduras, contendo várias sementes</li><li><strong>Porte médio</strong> — geralmente entre 5 e 15 metros de altura</li></ul>
<h3>Origem e história</h3><p>Originária da América Central e do México, a leucena foi amplamente introduzida em regiões tropicais do mundo todo, incluindo o Brasil, a partir da década de 1940. Inicialmente, foi promovida como forrageira, para reflorestamento, adubação verde e fixação de nitrogênio no solo.</p>
<h3>Por que é invasora?</h3><p>Apesar de seus usos iniciais, a leucena tornou-se uma das <strong>100 piores espécies invasoras do mundo</strong> segundo a IUCN:</p><ul><li><strong>Crescimento rápido</strong> — até 3 metros por ano</li><li><strong>Produção massiva de sementes</strong> — milhares de sementes viáveis por ano</li><li><strong>Efeitos alelopáticos</strong> — libera substâncias que inibem outras plantas</li><li><strong>Formação de monoculturas</strong> — impede a regeneração da vegetação nativa</li><li><strong>Tolerância a condições adversas</strong> — resiste a secas e solos pobres</li></ul><p>No estado de São Paulo, a leucena é encontrada em áreas urbanas, margens de rodovias, terrenos baldios e bordas de fragmentos florestais.</p>`;
  }

  function getLeucenaContentEN() {
    return `<h2>What is Leucaena?</h2>
<div class="guide-photos"><figure><img src="/img/leucena-tree.jpg" alt="Leucaena tree"><figcaption>Leucaena in an urban area — typical species form</figcaption></figure><figure><img src="/img/leucena-detail.jpg" alt="Leucaena details"><figcaption>White spherical flowers, bipinnate leaves and seed pods</figcaption></figure></div>
<h3>Identification</h3><p><em>Leucaena leucocephala</em>, commonly known as <strong>white leadtree</strong> or <strong>leucaena</strong>, is a tropical tree or shrub in the legume family (Fabaceae). Key identification features include:</p><ul><li><strong>Bipinnate leaves</strong> — composed of many small, aligned leaflets, giving a "feathery" appearance</li><li><strong>White spherical flowers</strong> — globe-shaped inflorescences resembling "pompoms"</li><li><strong>Flat seed pods</strong> — brown when mature, containing several seeds</li><li><strong>Medium size</strong> — typically 5 to 15 meters tall</li></ul>
<h3>Origin and history</h3><p>Native to Central America and Mexico, leucaena was widely introduced to tropical regions worldwide, including Brazil, from the 1940s onward. It was initially promoted as fodder, for reforestation, green manure, and nitrogen fixation in soil.</p>
<h3>Why is it invasive?</h3><p>Despite its initial uses, leucaena has become one of the <strong>100 worst invasive species in the world</strong> according to the IUCN:</p><ul><li><strong>Rapid growth</strong> — up to 3 meters per year</li><li><strong>Massive seed production</strong> — thousands of viable seeds per year</li><li><strong>Allelopathic effects</strong> — releases chemicals that inhibit other plants</li><li><strong>Monoculture formation</strong> — prevents native vegetation regeneration</li><li><strong>Tolerance to adverse conditions</strong> — withstands droughts and poor soils</li></ul><p>In the state of São Paulo, leucaena is found in urban areas, road margins, vacant lots, and forest fragment edges.</p>`;
  }

  function getLeucenaContentES() {
    return `<h2>¿Qué es la Leucaena?</h2>
<div class="guide-photos"><figure><img src="/img/leucena-tree.jpg" alt="Árbol de Leucaena"><figcaption>Leucaena en área urbana — porte típico de la especie</figcaption></figure><figure><img src="/img/leucena-detail.jpg" alt="Detalles de Leucaena"><figcaption>Flores esféricas blancas, hojas bipinnadas y vainas</figcaption></figure></div>
<h3>Identificación</h3><p><em>Leucaena leucocephala</em>, conocida popularmente como <strong>leucaena</strong>, es un árbol o arbusto tropical de la familia de las leguminosas (Fabaceae). Sus características más distintivas son:</p><ul><li><strong>Hojas bipinnadas</strong> — compuestas por muchos folíolos pequeños y alineados, con apariencia de "pluma"</li><li><strong>Flores esféricas blancas</strong> — inflorescencias en forma de "pompón" blanco</li><li><strong>Vainas aplanadas</strong> — marrones cuando maduras, con varias semillas</li><li><strong>Porte medio</strong> — generalmente entre 5 y 15 metros de altura</li></ul>
<h3>Origen e historia</h3><p>Originaria de América Central y México, la leucaena fue introducida ampliamente en regiones tropicales de todo el mundo, incluido Brasil, a partir de la década de 1940. Fue promovida como forrajera, para reforestación, abono verde y fijación de nitrógeno.</p>
<h3>¿Por qué es invasora?</h3><p>A pesar de sus usos iniciales, la leucaena se ha convertido en una de las <strong>100 peores especies invasoras del mundo</strong> según la UICN:</p><ul><li><strong>Crecimiento rápido</strong> — hasta 3 metros por año</li><li><strong>Producción masiva de semillas</strong> — miles de semillas viables por año</li><li><strong>Efectos alelopáticos</strong> — libera sustancias que inhiben otras plantas</li><li><strong>Formación de monocultivos</strong> — impide la regeneración de la vegetación nativa</li><li><strong>Tolerancia a condiciones adversas</strong> — resiste sequías y suelos pobres</li></ul><p>En el estado de São Paulo, la leucaena se encuentra en áreas urbanas, márgenes de carreteras, terrenos baldíos y bordes de fragmentos forestales.</p>`;
  }

  // ── How-to content per language ──

  function getHowtoContentPT() {
    return `<h2>Como fazer o mapeamento</h2><h3>1. Crie sua conta</h3><p>Clique em <strong>"Entrar"</strong> no canto superior direito e depois em <strong>"Cadastrar"</strong>. Você precisará de um <strong>código de acesso</strong> — solicite por e-mail a <a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a>.</p><h3>2. Selecione uma célula do grid</h3><p>O mapa está dividido em <strong>células (quadrados)</strong>. Clique em uma célula para ver suas informações. As cores indicam o status:</p><ul><li><strong style="color:#7c3aed">Roxo</strong> — Ainda não finalizado</li><li><strong style="color:#eab308">Amarelo (vazado)</strong> — Alguém está mapeando agora</li><li><strong style="color:#9ca3af">Cinza</strong> — Sem pontos de ocorrência</li><li><strong style="color:#22c55e">Verde</strong> — Finalizado</li></ul><h3>3. Bloqueie a célula para edição</h3><p>Clique em <strong>"Bloquear e Editar"</strong> para reservar a célula para você.</p><h3>4. Desenhe as máscaras de Leucena</h3><p>Use os botões de edição na parte inferior do mapa:</p><ul><li><strong>Desenhar</strong> — Inicie um polígono com cliques (mínimo 3 vértices).</li><li><strong>Editar</strong> — Arraste vértices de polígonos existentes.</li><li><strong>Excluir</strong> — Clique em um polígono para removê-lo.</li></ul><h3>5. Use o Street View para confirmar</h3><p>Clique em <strong>"Street View"</strong> e depois no mapa para abrir a visão de rua e confirmar visualmente a leucena.</p><h3>6. Valide os pontos</h3><p>Pontos <strong>amarelos</strong> são válidos. Use <strong>"Selecionar"</strong> e clique em um ponto para marcá-lo como <strong>inválido (vermelho)</strong> se estiver errado.</p><h3>7. Finalize a célula</h3><p>Clique em <strong>"Desbloquear"</strong> e escolha <strong>"Finalizado"</strong>. O sistema verificará se todos os pontos válidos possuem uma máscara sobre eles.</p><div class="guide-tip"><strong>Dica:</strong> Use o botão <strong>Home</strong> (ícone de casa) para recentrar na célula ou voltar à visão geral.</div>`;
  }

  function getHowtoContentEN() {
    return `<h2>How to Map</h2><h3>1. Create your account</h3><p>Click <strong>"Sign In"</strong> in the upper right corner, then <strong>"Register"</strong>. You will need an <strong>access code</strong> — request one by emailing <a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a>.</p><h3>2. Select a grid cell</h3><p>The map is divided into <strong>cells (squares)</strong>. Click a cell to view its information. Colors indicate status:</p><ul><li><strong style="color:#7c3aed">Purple</strong> — Not yet finished</li><li><strong style="color:#eab308">Yellow (hollow)</strong> — Someone is mapping now</li><li><strong style="color:#9ca3af">Gray</strong> — No occurrence points</li><li><strong style="color:#22c55e">Green</strong> — Finished</li></ul><h3>3. Lock the cell for editing</h3><p>Click <strong>"Lock & Edit"</strong> to reserve the cell for yourself.</p><h3>4. Draw Leucaena masks</h3><p>Use the editing buttons at the bottom of the map:</p><ul><li><strong>Draw</strong> — Start a polygon by clicking (minimum 3 vertices).</li><li><strong>Edit</strong> — Drag vertices of existing polygons.</li><li><strong>Delete</strong> — Click a polygon to remove it.</li></ul><h3>5. Use Street View to confirm</h3><p>Click <strong>"Street View"</strong> then click on the map to open street-level view and visually confirm leucaena.</p><h3>6. Validate points</h3><p><strong>Yellow</strong> points are valid. Use <strong>"Select"</strong> and click a point to mark it as <strong>invalid (red)</strong> if incorrect.</p><h3>7. Finish the cell</h3><p>Click <strong>"Unlock"</strong> and choose <strong>"Finished"</strong>. The system will verify that all valid points have a mask overlapping them.</p><div class="guide-tip"><strong>Tip:</strong> Use the <strong>Home</strong> button (house icon) to re-center on the cell or return to the overview.</div>`;
  }

  function getHowtoContentES() {
    return `<h2>Cómo mapear</h2><h3>1. Cree su cuenta</h3><p>Haga clic en <strong>"Iniciar Sesión"</strong> en la esquina superior derecha y luego en <strong>"Registrarse"</strong>. Necesitará un <strong>código de acceso</strong> — solicítelo por correo a <a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a>.</p><h3>2. Seleccione una celda de la grilla</h3><p>El mapa está dividido en <strong>celdas (cuadrados)</strong>. Haga clic en una celda para ver su información. Los colores indican el estado:</p><ul><li><strong style="color:#7c3aed">Púrpura</strong> — Aún no finalizado</li><li><strong style="color:#eab308">Amarillo (hueco)</strong> — Alguien está mapeando ahora</li><li><strong style="color:#9ca3af">Gris</strong> — Sin puntos de ocurrencia</li><li><strong style="color:#22c55e">Verde</strong> — Finalizado</li></ul><h3>3. Bloquee la celda para edición</h3><p>Haga clic en <strong>"Bloquear y Editar"</strong> para reservar la celda.</p><h3>4. Dibuje las máscaras de Leucaena</h3><p>Use los botones de edición en la parte inferior del mapa:</p><ul><li><strong>Dibujar</strong> — Inicie un polígono con clics (mínimo 3 vértices).</li><li><strong>Editar</strong> — Arrastre vértices de polígonos existentes.</li><li><strong>Eliminar</strong> — Haga clic en un polígono para eliminarlo.</li></ul><h3>5. Use Street View para confirmar</h3><p>Haga clic en <strong>"Street View"</strong> y luego en el mapa para abrir la vista de calle y confirmar visualmente la leucaena.</p><h3>6. Valide los puntos</h3><p>Los puntos <strong>amarillos</strong> son válidos. Use <strong>"Seleccionar"</strong> y haga clic en un punto para marcarlo como <strong>inválido (rojo)</strong>.</p><h3>7. Finalice la celda</h3><p>Haga clic en <strong>"Desbloquear"</strong> y elija <strong>"Finalizado"</strong>. El sistema verificará que todos los puntos válidos tengan una máscara sobre ellos.</p><div class="guide-tip"><strong>Consejo:</strong> Use el botón <strong>Home</strong> (ícono de casa) para recentrar en la celda o volver a la vista general.</div>`;
  }

  // ── Docs content per language ──

  function getDocsPT(month, year) {
    return `<h2>Documentação</h2><h3>Título do Projeto</h3><p><em>Revelando a distribuição espacial e a biomassa aérea de <strong>Leucaena leucocephala</strong> no Estado de São Paulo usando sensoriamento remoto e inteligência artificial</em></p><h3>Pesquisador</h3><p>Matheus Siqueira Barros<br>Doutorando</p><h3>Orientador</h3><p>Prof. Dr. Matheus Pinheiro Ferreira<br>ESALQ – Universidade de São Paulo</p><h3>Descrição do Projeto</h3><p>Esta pesquisa investiga a distribuição espacial e a biomassa aérea da espécie invasora <em>Leucaena leucocephala</em> em todo o estado de São Paulo, Brasil. O projeto combina imagens ópticas de altíssima resolução espacial (25 cm de GSD) e dados LiDAR com técnicas de inteligência artificial para detectar áreas dominadas por essa espécie e estimar sua biomassa.</p><p>O projeto desenvolve métodos de aprendizado profundo, especialmente redes neurais convolucionais (CNNs), para realizar a fusão de dados LiDAR e ópticos e mapear áreas dominadas por <em>Leucaena</em> em escala estadual.</p><h3>Objetivo da Plataforma</h3><p>Esta plataforma foi desenvolvida para apoiar a pesquisa permitindo:</p><ul><li>Mapeamento colaborativo de manchas de <em>Leucaena leucocephala</em></li><li>Digitalização de máscaras da copa por colaboradores</li><li>Validação entre pontos e polígonos mapeados</li><li>Rastreamento das contribuições de cada participante</li><li>Exportação dos dados mapeados para análises posteriores</li></ul><h3>Contribuidores</h3><p>Judith Zuleika Bertolucci Alves<br>Rafael Perin Menassi</p><h3>Contato</h3><p>Matheus Siqueira Barros<br><a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a></p><h3>Local</h3><p>Piracicaba – São Paulo – Brasil<br>${month} de ${year}</p>`;
  }

  function getDocsEN(month, year) {
    return `<h2>Documentation</h2><h3>Project Title</h3><p><em>Revealing the spatial distribution and aboveground biomass of <strong>Leucaena leucocephala</strong> in the State of São Paulo using remote sensing and artificial intelligence</em></p><h3>Researcher</h3><p>Matheus Siqueira Barros<br>PhD Candidate</p><h3>Advisor</h3><p>Prof. Dr. Matheus Pinheiro Ferreira<br>ESALQ – University of São Paulo</p><h3>Project Description</h3><p>This research investigates the spatial distribution and aboveground biomass of the invasive species <em>Leucaena leucocephala</em> across the state of São Paulo, Brazil. The project combines very high spatial resolution optical imagery (25 cm GSD) and LiDAR data with artificial intelligence techniques to detect areas dominated by this species and estimate its biomass.</p><p>The project develops deep learning methods, especially convolutional neural networks (CNNs), to fuse LiDAR and optical data and map <em>Leucaena</em>-dominated areas at the state scale.</p><h3>Platform Objective</h3><p>This platform was developed to support the research by enabling:</p><ul><li>Collaborative mapping of <em>Leucaena leucocephala</em> patches</li><li>Canopy mask digitization by contributors</li><li>Validation between mapped points and polygons</li><li>Tracking of each participant's contributions</li><li>Export of mapped data for further analysis</li></ul><h3>Contributors</h3><p>Judith Zuleika Bertolucci Alves<br>Rafael Perin Menassi</p><h3>Contact</h3><p>Matheus Siqueira Barros<br><a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a></p><h3>Location</h3><p>Piracicaba – São Paulo – Brazil<br>${month} ${year}</p>`;
  }

  function getDocsES(month, year) {
    return `<h2>Documentación</h2><h3>Título del Proyecto</h3><p><em>Revelando la distribución espacial y la biomasa aérea de <strong>Leucaena leucocephala</strong> en el Estado de São Paulo usando teledetección e inteligencia artificial</em></p><h3>Investigador</h3><p>Matheus Siqueira Barros<br>Doctorando</p><h3>Director</h3><p>Prof. Dr. Matheus Pinheiro Ferreira<br>ESALQ – Universidad de São Paulo</p><h3>Descripción del Proyecto</h3><p>Esta investigación estudia la distribución espacial y la biomasa aérea de la especie invasora <em>Leucaena leucocephala</em> en todo el estado de São Paulo, Brasil. El proyecto combina imágenes ópticas de muy alta resolución espacial (25 cm de GSD) y datos LiDAR con técnicas de inteligencia artificial para detectar áreas dominadas por esta especie y estimar su biomasa.</p><p>El proyecto desarrolla métodos de aprendizaje profundo, especialmente redes neuronales convolucionales (CNNs), para fusionar datos LiDAR y ópticos y mapear áreas dominadas por <em>Leucaena</em> a escala estatal.</p><h3>Objetivo de la Plataforma</h3><p>Esta plataforma fue desarrollada para apoyar la investigación permitiendo:</p><ul><li>Mapeo colaborativo de manchas de <em>Leucaena leucocephala</em></li><li>Digitalización de máscaras de copa por colaboradores</li><li>Validación entre puntos y polígonos mapeados</li><li>Seguimiento de las contribuciones de cada participante</li><li>Exportación de los datos mapeados para análisis posteriores</li></ul><h3>Colaboradores</h3><p>Judith Zuleika Bertolucci Alves<br>Rafael Perin Menassi</p><h3>Contacto</h3><p>Matheus Siqueira Barros<br><a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a></p><h3>Ubicación</h3><p>Piracicaba – São Paulo – Brasil<br>${month} de ${year}</p>`;
  }

  return { t, tHtml, getLang, setLang, translatePage };
})();

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
    'topbar.pointsGeoJSON': { pt: 'Pontos de Ocorrência (GeoJSON)', en: 'Occurrence Points (GeoJSON)', es: 'Puntos de Ocurrencia (GeoJSON)' },
    'topbar.gridGeoJSON': { pt: 'Grade SP (GeoJSON)', en: 'Grid SP (GeoJSON)', es: 'Cuadrícula SP (GeoJSON)' },
    'topbar.polygonsGeoJSON': { pt: 'Máscaras de Leucena (GeoJSON)', en: 'Leucaena Masks (GeoJSON)', es: 'Máscaras de Leucena (GeoJSON)' },
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
      pt: 'Você está prestes a entrar no modo de inserção de pontos. Enquanto ativo, pressione <strong>L</strong> para adicionar um ponto de Leucena na posição do cursor.',
      en: 'You are about to enter point insertion mode. While active, press <strong>L</strong> to add a Leucaena point at the cursor position.',
      es: 'Está a punto de entrar en el modo de inserción de puntos. Mientras esté activo, presione <strong>L</strong> para agregar un punto de Leucaena en la posición del cursor.'
    },
    'addPts.confirm': { pt: 'Deseja continuar?', en: 'Do you want to continue?', es: '¿Desea continuar?' },
    'addPts.yes': { pt: 'Sim, iniciar inserção de pontos', en: 'Yes, start inserting points', es: 'Sí, comenzar inserción de puntos' },

    // ── Insertion/Deletion banners ──
    'banner.insertion': { pt: 'MODO DE INSERÇÃO DE PONTOS — Pressione L para adicionar ponto, Ctrl+Z para desfazer', en: 'POINT INSERTION MODE — Press L to add point, Ctrl+Z to undo', es: 'MODO DE INSERCIÓN DE PUNTOS — Presione L para agregar punto, Ctrl+Z para deshacer' },
    'banner.deletion': { pt: 'MODO DE EXCLUSÃO DE PONTOS — Clique perto de um ponto para excluir, Ctrl+Z para desfazer', en: 'POINT DELETION MODE — Click near a point to delete, Ctrl+Z to undo', es: 'MODO DE ELIMINACIÓN DE PUNTOS — Haga clic cerca de un punto para eliminar, Ctrl+Z para deshacer' },

    // ── Sidebar ──
    'sidebar.filters': { pt: 'Filtros', en: 'Filters', es: 'Filtros' },
    'sidebar.statusFilter': { pt: 'Filtro de Status', en: 'Status Filter', es: 'Filtro de Estado' },
    'sidebar.layers': { pt: 'Camadas', en: 'Layers', es: 'Capas' },
    'sidebar.gridCellsSection': { pt: 'Células da Grade', en: 'Grid Cells', es: 'Células de la Cuadrícula' },
    'sidebar.showGrid': { pt: 'Exibir grade', en: 'Show grid', es: 'Mostrar cuadrícula' },
    'sidebar.gridCells': { pt: 'Células do Grid', en: 'Grid Cells', es: 'Celdas de Grilla' },
    'sidebar.occurrencePoints': { pt: 'Pontos de Ocorrência', en: 'Occurrence Points', es: 'Puntos de Ocurrencia' },
    'sidebar.showPoints': { pt: 'Exibir pontos', en: 'Show points', es: 'Mostrar puntos' },
    'sidebar.leucenaMasks': { pt: 'Máscaras de Leucenas', en: 'Leucaena Masks', es: 'Máscaras de Leucenas' },
    'sidebar.showLeucenaMasks': { pt: 'Exibir máscaras', en: 'Show masks', es: 'Mostrar máscaras' },
    'sidebar.mappedPolygons': { pt: 'Polígonos Mapeados', en: 'Mapped Polygons', es: 'Polígonos Mapeados' },
    'sidebar.layerCrowdmapping': { pt: 'Crowdmapping', en: 'Crowdmapping', es: 'Crowdmapping' },
    'sidebar.layerInaturalist': { pt: 'iNaturalist', en: 'iNaturalist', es: 'iNaturalist' },
    'sidebar.layerGbif': { pt: 'GBIF', en: 'GBIF', es: 'GBIF' },
    'sidebar.layerInsthorus': { pt: 'Instituto Horus', en: 'Instituto Horus', es: 'Instituto Horus' },
    'sidebar.layerSpecieslink': { pt: 'SpeciesLink', en: 'SpeciesLink', es: 'SpeciesLink' },
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
    'status.in_use': { pt: 'Célula em Uso', en: 'Cell in Use', es: 'Celda en Uso' },
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
    'tool.addPoints': { pt: 'Add Pontos', en: 'Add Points', es: 'Agregar Puntos' },
    'tool.delPoints': { pt: 'Remover Pontos', en: 'Remove Points', es: 'Remover Puntos' },
    'tool.draw': { pt: 'Desenhar Polígono', en: 'Draw Polygon', es: 'Dibujar Polígono' },
    'tool.edit': { pt: 'Editar Polígono', en: 'Edit Polygon', es: 'Editar Polígono' },
    'tool.deletePoly': { pt: 'Excluir Polígono', en: 'Delete Polygon', es: 'Eliminar Polígono' },
    'tool.hole': { pt: 'Criar Buraco', en: 'Hole Tool', es: 'Crear Agujero' },
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
    'legend.doubtPoint': { pt: 'Incerto', en: 'Uncertain', es: 'Incierto' },
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
    'guide.media': { pt: 'Mídia', en: 'Media', es: 'Medios' },
    'guide.mediaDesc': { pt: 'Notícias e referências sobre erradicação de leucena', en: 'News and references on leucaena eradication', es: 'Noticias y referencias sobre erradicación de leucaena' },
    'guide.mediaNews': { pt: 'Notícias e reportagens', en: 'News and reports', es: 'Noticias y reportajes' },
    'guide.mediaRefs': { pt: 'Referências científicas (Instituto Hórus)', en: 'Scientific references (Instituto Hórus)', es: 'Referencias científicas (Instituto Hórus)' },
    'guide.collaborate': { pt: 'Seja Colaborador', en: 'Become a Collaborator', es: 'Sea Colaborador' },
    'guide.collaborateDesc': { pt: 'Como se cadastrar e contribuir com o mapeamento', en: 'How to register and contribute to the mapping', es: 'Cómo registrarse y contribuir con el mapeo' },
    'guide.about': { pt: 'Quem Somos', en: 'About Us', es: 'Quiénes Somos' },
    'guide.aboutDesc': { pt: 'Conheça os idealizadores e colaboradores do projeto', en: 'Meet the creators and collaborators of the project', es: 'Conozca a los creadores y colaboradores del proyecto' },

    // ── Admin ──
    'admin.usersTitle': { pt: 'Gerenciar Usuários', en: 'Manage Users', es: 'Gestionar Usuarios' },
    'admin.nextPasscode': { pt: 'Próximo código de acesso:', en: 'Next access code:', es: 'Próximo código de acceso:' },
    'admin.changePassword': { pt: 'Alterar Senha', en: 'Change Password', es: 'Cambiar Contraseña' },
    'admin.deleteUser': { pt: 'Excluir', en: 'Delete', es: 'Eliminar' },
    'admin.confirmDelete': { pt: 'Tem certeza que deseja excluir o usuário "{0}"? As máscaras serão transferidas para o usuário "deleted".', en: 'Are you sure you want to delete user "{0}"? Masks will be transferred to the "deleted" user.', es: '¿Está seguro de que desea eliminar al usuario "{0}"? Las máscaras serán transferidas al usuario "deleted".' },
    'admin.newPassword': { pt: 'Nova senha para "{0}":', en: 'New password for "{0}":', es: 'Nueva contraseña para "{0}":' },
    'admin.passwordChanged': { pt: 'Senha alterada com sucesso', en: 'Password changed successfully', es: 'Contraseña cambiada exitosamente' },
    'admin.userDeleted': { pt: 'Usuário excluído', en: 'User deleted', es: 'Usuario eliminado' },
    'admin.editProfile': { pt: 'Perfil', en: 'Profile', es: 'Perfil' },
    'admin.editFullName': { pt: 'Nome completo para "{0}":', en: 'Full name for "{0}":', es: 'Nombre completo para "{0}":' },
    'admin.editDescription': { pt: 'Descrição para "{0}":', en: 'Description for "{0}":', es: 'Descripción para "{0}":' },
    'admin.profileUpdated': { pt: 'Perfil atualizado', en: 'Profile updated', es: 'Perfil actualizado' },
    'admin.editProfileTitle': { pt: 'Editar perfil de {0}', en: 'Edit profile of {0}', es: 'Editar perfil de {0}' },
    'admin.masks': { pt: 'Máscaras', en: 'Masks', es: 'Máscaras' },
    'admin.logins': { pt: 'Logins', en: 'Logins', es: 'Logins' },
    'admin.timeOnline': { pt: 'Tempo Online', en: 'Time Online', es: 'Tiempo Online' },
    'admin.exportCsv': { pt: 'Exportar CSV', en: 'Export CSV', es: 'Exportar CSV' },

    // ── Profile (Quem Somos) ──
    'profile.title': { pt: 'Meu perfil', en: 'My profile', es: 'Mi perfil' },
    'profile.subtitle': { pt: 'Estas informações aparecem na seção "Quem Somos" (idealizadores ou colaboradores com 10+ máscaras).', en: 'This information appears in the "About Us" section (project leaders or collaborators with 10+ masks).', es: 'Esta información aparece en la sección "Quiénes Somos" (creadores o colaboradores con 10+ máscaras).' },
    'profile.fullName': { pt: 'Nome completo', en: 'Full name', es: 'Nombre completo' },
    'profile.description': { pt: 'Descrição', en: 'Description', es: 'Descripción' },
    'profile.photo': { pt: 'Foto', en: 'Photo', es: 'Foto' },
    'profile.save': { pt: 'Salvar perfil', en: 'Save profile', es: 'Guardar perfil' },
    'profile.saved': { pt: 'Perfil atualizado', en: 'Profile updated', es: 'Perfil actualizado' },
    'profile.photoTooBig': { pt: 'Foto deve ter no máximo ~200 KB', en: 'Photo must be at most ~200 KB', es: 'La foto debe tener como máximo ~200 KB' },
    'profile.changePassword': { pt: 'Alterar senha', en: 'Change password', es: 'Cambiar contraseña' },
    'profile.newPasswordPlaceholder': { pt: 'Nova senha (mínimo 3 caracteres)', en: 'New password (min. 3 characters)', es: 'Nueva contraseña (mín. 3 caracteres)' },
    'profile.changePasswordBtn': { pt: 'Alterar', en: 'Change', es: 'Cambiar' },
    'profile.pwTooShort': { pt: 'A senha deve ter pelo menos 3 caracteres', en: 'Password must have at least 3 characters', es: 'La contraseña debe tener al menos 3 caracteres' },
    'profile.pwChanged': { pt: 'Senha alterada com sucesso', en: 'Password changed successfully', es: 'Contraseña cambiada exitosamente' },
    'profile.fullNamePlaceholder': { pt: 'Seu nome completo', en: 'Your full name', es: 'Su nombre completo' },
    'about.idealizadores': { pt: 'Idealizadores', en: 'Project Leaders', es: 'Creadores' },
    'about.colaboradores': { pt: 'Colaboradores', en: 'Collaborators', es: 'Colaboradores' },

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
    'toast.markedDoubt': { pt: 'Ponto marcado como incerto', en: 'Point marked as uncertain', es: 'Punto marcado como incierto' },
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
    'deleteWarn.title': { pt: '⚠️ Atenção', en: '⚠️ Warning', es: '⚠️ Atención' },
    'deleteWarn.message': { pt: 'Você está prestes a excluir polígonos. Clique em um polígono no mapa para removê-lo permanentemente.', en: 'You are about to delete polygons. Click a polygon on the map to permanently remove it.', es: 'Está a punto de eliminar polígonos. Haga clic en un polígono en el mapa para eliminarlo permanentemente.' },
    'deleteWarn.ok': { pt: 'Entendi, continuar', en: 'I understand, continue', es: 'Entendido, continuar' },
    'deleteWarn.cancel': { pt: 'Cancelar', en: 'Cancel', es: 'Cancelar' },
    'toast.holeSelectMask': { pt: 'Clique em uma máscara para criar um buraco', en: 'Click a mask to create a hole', es: 'Haga clic en una máscara para crear un agujero' },
    'toast.holeDrawNow': { pt: 'Desenhe o buraco dentro da máscara selecionada', en: 'Draw the hole inside the selected mask', es: 'Dibuje el agujero dentro de la máscara seleccionada' },
    'toast.holeCreated': { pt: 'Buraco criado na máscara', en: 'Hole created in mask', es: 'Agujero creado en la máscara' },
    'toast.lockCellToDelete': { pt: 'Bloqueie a célula para excluir seus polígonos', en: 'Lock the cell to delete its polygons', es: 'Bloquee la celda para eliminar sus polígonos' },
    'toast.polyDeleted': { pt: 'Polígono excluído', en: 'Polygon deleted', es: 'Polígono eliminado' },
    'toast.polyDeleteFail': { pt: 'Falha ao excluir polígono', en: 'Failed to delete polygon', es: 'Error al eliminar polígono' },
    'toast.polyRestored': { pt: 'Polígono restaurado (Ctrl+Z)', en: 'Polygon restored (Ctrl+Z)', es: 'Polígono restaurado (Ctrl+Z)' },
    'toast.polyRestoreFail': { pt: 'Falha ao restaurar polígono', en: 'Failed to restore polygon', es: 'Error al restaurar polígono' },
    'toast.drawCancelled': { pt: 'Desenho cancelado', en: 'Drawing cancelled', es: 'Dibujo cancelado' },

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
    'collab.dblclickToZoom': { pt: 'Duplo clique para ir à célula', en: 'Double-click to go to cell', es: 'Doble clic para ir a la celda' },

    // ── Toast messages (export.js) ──
    'toast.exportPreparing': { pt: 'Preparando exportação...', en: 'Preparing export...', es: 'Preparando exportación...' },
    'toast.exportDone': { pt: 'Exportação concluída', en: 'Export complete', es: 'Exportación completada' },
    'toast.exportFail': { pt: 'Falha na exportação', en: 'Export failed', es: 'Error en la exportación' },

    // ── Point markers ──
    'point.title': { pt: 'Ponto #{0}', en: 'Point #{0}', es: 'Punto #{0}' },
    'point.titleInvalid': { pt: 'Ponto #{0} (inválido)', en: 'Point #{0} (invalid)', es: 'Punto #{0} (inválido)' },
    'point.titleDoubt': { pt: 'Ponto #{0} (incerto)', en: 'Point #{0} (uncertain)', es: 'Punto #{0} (incierto)' }
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
    const mediaPage = document.getElementById('guide-media-content');
    const collabPage = document.getElementById('guide-collaborate-content');
    const aboutPage = document.getElementById('guide-about-content');
    if (!leucenaPage || !howtoPage) return;

    if (currentLang === 'en') {
      leucenaPage.innerHTML = getLeucenaContentEN();
      howtoPage.innerHTML = getHowtoContentEN();
      if (mediaPage) mediaPage.innerHTML = getMediaContentEN();
      if (collabPage) collabPage.innerHTML = getCollaborateContentEN();
    } else if (currentLang === 'es') {
      leucenaPage.innerHTML = getLeucenaContentES();
      howtoPage.innerHTML = getHowtoContentES();
      if (mediaPage) mediaPage.innerHTML = getMediaContentES();
      if (collabPage) collabPage.innerHTML = getCollaborateContentES();
    } else {
      leucenaPage.innerHTML = getLeucenaContentPT();
      howtoPage.innerHTML = getHowtoContentPT();
      if (mediaPage) mediaPage.innerHTML = getMediaContentPT();
      if (collabPage) collabPage.innerHTML = getCollaborateContentPT();
    }
    // aboutPage (Quem Somos) is filled dynamically via API when user opens it
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
    return `<h2>Como fazer o mapeamento</h2><h3>1. Crie sua conta</h3><p>Clique em <strong>"Entrar"</strong> no canto superior direito e depois em <strong>"Cadastrar"</strong>. Você precisará de um <strong>código de acesso</strong> — solicite por e-mail a <a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a>.</p><h3>2. Selecione uma célula do grid</h3><p>O mapa está dividido em <strong>células (quadrados)</strong>. Clique em uma célula para ver suas informações. As cores indicam o status:</p><ul><li><strong style="color:#7c3aed">Roxo</strong> — Ainda não finalizado</li><li><strong style="color:#eab308">Amarelo (vazado)</strong> — Célula em Uso (alguém está editando agora)</li><li><strong style="color:#FFFF59">Amarelo</strong> — Mapeando (possui máscaras, mas não foi finalizado)</li><li><strong style="color:#9ca3af">Cinza</strong> — Sem pontos de ocorrência</li><li><strong style="color:#22c55e">Verde</strong> — Finalizado</li></ul><h3>3. Bloqueie a célula para edição</h3><p>Clique em <strong>"Bloquear e Editar"</strong> para reservar a célula para você.</p><h3>4. Desenhe as máscaras de Leucena</h3><p>Use os botões de edição na parte inferior do mapa:</p><ul><li><strong>Desenhar</strong> — Inicie um polígono com cliques (mínimo 3 vértices).</li><li><strong>Editar</strong> — Arraste vértices de polígonos existentes.</li><li><strong>Excluir</strong> — Clique em um polígono para removê-lo.</li></ul><h3>5. Use o Street View para confirmar</h3><p>Clique em <strong>"Street View"</strong> e depois no mapa para abrir a visão de rua e confirmar visualmente a leucena.</p><h3>6. Valide os pontos</h3><p>Pontos <strong>amarelos</strong> são válidos. Use <strong>"Selecionar"</strong> e clique em um ponto para marcá-lo como <strong>inválido (vermelho)</strong> se estiver errado.</p><h3>7. Finalize a célula</h3><p>Clique em <strong>"Desbloquear"</strong> e escolha <strong>"Finalizado"</strong>. O sistema verificará se todos os pontos válidos possuem uma máscara sobre eles.</p><div class="guide-tip"><strong>Dica:</strong> Use o botão <strong>Home</strong> (ícone de casa) para recentrar na célula ou voltar à visão geral.</div>`;
  }

  function getHowtoContentEN() {
    return `<h2>How to Map</h2><h3>1. Create your account</h3><p>Click <strong>"Sign In"</strong> in the upper right corner, then <strong>"Register"</strong>. You will need an <strong>access code</strong> — request one by emailing <a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a>.</p><h3>2. Select a grid cell</h3><p>The map is divided into <strong>cells (squares)</strong>. Click a cell to view its information. Colors indicate status:</p><ul><li><strong style="color:#7c3aed">Purple</strong> — Not yet finished</li><li><strong style="color:#eab308">Yellow (hollow)</strong> — Cell in Use (someone is editing now)</li><li><strong style="color:#FFFF59">Yellow</strong> — Mapping (has masks, but not finished)</li><li><strong style="color:#9ca3af">Gray</strong> — No occurrence points</li><li><strong style="color:#22c55e">Green</strong> — Finished</li></ul><h3>3. Lock the cell for editing</h3><p>Click <strong>"Lock & Edit"</strong> to reserve the cell for yourself.</p><h3>4. Draw Leucaena masks</h3><p>Use the editing buttons at the bottom of the map:</p><ul><li><strong>Draw</strong> — Start a polygon by clicking (minimum 3 vertices).</li><li><strong>Edit</strong> — Drag vertices of existing polygons.</li><li><strong>Delete</strong> — Click a polygon to remove it.</li></ul><h3>5. Use Street View to confirm</h3><p>Click <strong>"Street View"</strong> then click on the map to open street-level view and visually confirm leucaena.</p><h3>6. Validate points</h3><p><strong>Yellow</strong> points are valid. Use <strong>"Select"</strong> and click a point to mark it as <strong>invalid (red)</strong> if incorrect.</p><h3>7. Finish the cell</h3><p>Click <strong>"Unlock"</strong> and choose <strong>"Finished"</strong>. The system will verify that all valid points have a mask overlapping them.</p><div class="guide-tip"><strong>Tip:</strong> Use the <strong>Home</strong> button (house icon) to re-center on the cell or return to the overview.</div>`;
  }

  function getHowtoContentES() {
    return `<h2>Cómo mapear</h2><h3>1. Cree su cuenta</h3><p>Haga clic en <strong>"Iniciar Sesión"</strong> en la esquina superior derecha y luego en <strong>"Registrarse"</strong>. Necesitará un <strong>código de acceso</strong> — solicítelo por correo a <a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a>.</p><h3>2. Seleccione una celda de la grilla</h3><p>El mapa está dividido en <strong>celdas (cuadrados)</strong>. Haga clic en una celda para ver su información. Los colores indican el estado:</p><ul><li><strong style="color:#7c3aed">Púrpura</strong> — Aún no finalizado</li><li><strong style="color:#eab308">Amarillo (hueco)</strong> — Celda en Uso (alguien está editando ahora)</li><li><strong style="color:#FFFF59">Amarillo</strong> — Mapeando (tiene máscaras, pero no finalizado)</li><li><strong style="color:#9ca3af">Gris</strong> — Sin puntos de ocurrencia</li><li><strong style="color:#22c55e">Verde</strong> — Finalizado</li></ul><h3>3. Bloquee la celda para edición</h3><p>Haga clic en <strong>"Bloquear y Editar"</strong> para reservar la celda.</p><h3>4. Dibuje las máscaras de Leucaena</h3><p>Use los botones de edición en la parte inferior del mapa:</p><ul><li><strong>Dibujar</strong> — Inicie un polígono con clics (mínimo 3 vértices).</li><li><strong>Editar</strong> — Arrastre vértices de polígonos existentes.</li><li><strong>Eliminar</strong> — Haga clic en un polígono para eliminarlo.</li></ul><h3>5. Use Street View para confirmar</h3><p>Haga clic en <strong>"Street View"</strong> y luego en el mapa para abrir la vista de calle y confirmar visualmente la leucaena.</p><h3>6. Valide los puntos</h3><p>Los puntos <strong>amarillos</strong> son válidos. Use <strong>"Seleccionar"</strong> y haga clic en un punto para marcarlo como <strong>inválido (rojo)</strong>.</p><h3>7. Finalice la celda</h3><p>Haga clic en <strong>"Desbloquear"</strong> y elija <strong>"Finalizado"</strong>. El sistema verificará que todos los puntos válidos tengan una máscara sobre ellos.</p><div class="guide-tip"><strong>Consejo:</strong> Use el botón <strong>Home</strong> (ícono de casa) para recentrar en la celda o volver a la vista general.</div>`;
  }

  // ── Media content (news links + references) ──

  const MEDIA_LINKS = [
    { title: 'Comissão aprova projeto que prevê a erradicação da leucena no país (Câmara)', url: 'https://www.camara.leg.br/noticias/1250692-comissao-aprova-projeto-que-preve-a-erradicacao-no-pais-da-leucena,-planta-exotica-invasora' },
    { title: 'Leucena: árvore invasora trazida do México que será erradicada de Campo Grande (G1)', url: 'https://g1.globo.com/ms/mato-grosso-do-sul/noticia/2025/06/06/leucena-a-arvore-invasora-trazida-do-mexico-para-alimentar-gado-que-vai-ser-erradicada-de-campo-grande.ghtml' },
    { title: 'Programa de controle e erradicação de Leucena em Salto (Prefeitura Salto)', url: 'https://salto.sp.gov.br/programa-de-controle-e-erradicacao-de-leucena-e-implantado-em-salto/' },
    { title: 'PCJ quer controlar árvores invasoras (Piracicaba)', url: 'https://piracicaba.sp.gov.br/noticias/pcj-quer-controlar-arvores-invasoras/' },
    { title: 'Projeto prevê a erradicação da leucena no país (Câmara)', url: 'https://www.camara.leg.br/noticias/1250689-projeto-preve-a-erradicacao-no-pais-da-leucena-planta-exotica-invasora' },
    { title: 'Itu inicia erradicação de árvore invasora (Itu)', url: 'https://itu.sp.gov.br/itu-inicia-erradicacao-de-arvore-invasora-que-ameaca-a-biodiversidade/' },
    { title: 'Câmara de Sumaré aprova projeto para erradicar árvore invasora (Sumaré)', url: 'https://www.camarasumare.sp.gov.br/noticias/camara-de-sumare-aprova-projeto-para-erradicar-arvore-invasora' },
    { title: 'Leucena: substituição de espécie invasora em Pompeia (Pompeia)', url: 'https://www.pompeia.sp.gov.br/noticia/3183/leucena/' },
    { title: 'Prefeitura cria plano para eliminar árvore exótica e invasora da capital (Campo Grande News)', url: 'https://www.campograndenews.com.br/meio-ambiente/prefeitura-cria-plano-para-eliminar-arvore-exotica-e-invasora-da-capital' }
  ];

  function getMediaLinksHTML() {
    return MEDIA_LINKS.map(function (l) {
      return '<li><a href="' + l.url + '" target="_blank" rel="noopener noreferrer">' + l.title + '</a></li>';
    }).join('');
  }

  function getMediaRefsHTML() {
    var refs = [
      '1976 – Efeito de densidades de semeadura e níveis de adubação nitrogenada no estabelecimento de Leucaena leucocephala (Lam) de Wit. VILELA, E.; PEDREIRA, J. V. S.',
      '2021 – Variáveis climáticas influenciam a riqueza, composição e distribuição de plantas exóticas invasoras? ALMEIDA, T. S.; ALMEIDA, R. P. S.; FABRICANTE, J. R.',
      '2019 – Exotic invasive flora evaluation on different environments and preservation conditions from a caatinga area, Petrolina, PE. ALVES, J. S.; FABRICANTE, J. R.',
      '2006 – Terrestrial vascular floras of Brazils Oceanic Archipelagos. In: Ilhas oceânicas brasileiras - da pesquisa ao manejo. ALVES, R. J. V.',
      '2020 – Invasão biológica no Parque Nacional Serra de Itabaiana, Sergipe, Brasil. ARAÚJO, K. C. T. de; FABRICANTE, J. R.',
      '2021 – Invasão biológica na Área de Proteção Ambiental Morro do Urubu, Aracaju, Sergipe, Brasil. ARAÚJO, K.; CRUZ, A. B. S.; FABRICANTE, J. R.',
      '2012 – Avaliação do potencial invasivo de espécies não-nativas utilizadas em plantio de restauração de matas ciliares. ASSIS, G.B.',
      '2010 – Análisis de riesgo y propuesta de categorizacíon de especies introducidas para Colombia. BAPTISTE, M. P.; CASTAÑO, N.; LÓPEZ, D. C.; GUTIÉRREZ, F. P.; GIL, D. L.; LASSO, C. A.',
      '2010 – Plantas invasoras em Roraima. In: Roraima - homem, ambiente e ecologia. BARBOSA, J. B. F.',
      '2012 – Invasão biológica na Mata Atlântica como resultado do processo histórico de ocupação no Morro das Andorinhas, Niterói (RJ). BARROS, A. A. M.; MACHADO, D. N. S.',
      '2001 – Problem plants of South Africa. BROMILOW, C.',
      '2014 – Exóticas invasoras nas rodovias BR 277, PR 508, PR 407, Paraná, Brasil. CARVALHO J.; FERREIRA, A. M.; BELÃO, M.; BOÇON, R.',
      '2006 – Invasion of alien plants in the caatinga biome. CAVALCANTE, A.; MAJOR, I.',
      '2011 – Plano de manejo da Área de Proteção Ambiental Praia Mole. CEPEMAR SERVIÇOS DE CONSULTORIA EM MEIO AMBIENTE',
      '2007 – Plano de manejo do Parque Estadual Paulo César Vinha. CEPEMAR SERVIÇOS DE CONSULTORIA EM MEIO AMBIENTE',
      '2007 – Plano de manejo da Área de Proteção Ambiental de Setiba. CEPEMAR SERVIÇOS DE CONSULTORIA EM MEIO AMBIENTE LTDA',
      '2020 – Espécies vegetais nos quintais do entorno do Parque Estadual Sumaúma: invasões biológicas e a conservação da biodiversidade. CRUZ, I. A.; MAGALHÃES, L. C. S.; SILVA-FORSBERG M. C.',
      '1999 – Introdução e seleção de espécies arbóreas forrageiras exóticas na região semi-árida do estado de Sergipe. DRUMOND, M. A.; FILHO, O. M. de C.; OLIVEIRA, V. R. de.',
      '1942 – Indigene versus alien in the development of arid Hawaiian vegetation. EGLER, F. E.',
      '2005 – Recuperação ambiental e contaminação biológica: aspectos ecológicos e legais. ESPÍNDOLA, M. B.; BECHARA, F. C.; BAZZO, M. S.; REIS, A.',
      '2018 – Plano de manejo da Unidade de Conservação Monumento Natural Estadual Lapa Nova de Vazante, MG. ESPÍRITO SANTO, I. F.; SANTOS, C. F. S.; FREITAS, J. R. S. R.; et al.',
      '2012 – Exotic and invasive plants of the caatingas of the São Francisco river. FABRICANTE, J. A.; SIQUEIRA-FILHO, J. A.',
      '2021 – Invasive alien plants in Sergipe, northeastern Brazil. FABRICANTE, J. R.; ARAÚJO, K. C. T.; ALMEIDA, T. S.; SANTOS, J. P. B.; REIS, D. O.',
      '2021 – Invasão biológica em sítios de restinga no nordeste brasileiro. FABRICANTE, J. R.; CRUZ, A. B. S.; REIS, F. M.; ALMEIDA, T. S.',
      '2015 – Non-native and invasive alien plants on fluvial islands in the São Francisco River, northeastern Brazil. FABRICANTE, J. R.; ZILLER, S. R.; ARAÚJO, K. C. T.; FURTADO, M. D. G.; BASSO, F. A.',
      '2015 – Plano de manejo da Área de Proteção Ambiental do Planalto Central. GEO LÓGICA CONSULTORIA AMBIENTAL',
      '2016 – Plano de manejo da Floresta Nacional de Carajás. GONÇALVES, A. R.; FERNANDES, C. H.; MARTINS, F. D.; et al.',
      '2018 – Plano de manejo da Estação Ecológica de Marília. GOVERNO DO ESTADO DE SÃO PAULO',
      '2001 – Alien weeds and invasive plants - A complete guide to declared weeds and invaders in South Africa. HENDERSON, L.',
      '1995 – Protocols for plant introductions with particular reference to forestry. HUGHES, C. E.',
      '2008 – Análises de risco - Instituto Hórus, Brasil. INSTITUTO HÓRUS DE DESENVOLVIMENTO E CONSERVAÇÃO AMBIENTAL',
      '2014 – Remanescentes naturais da Fazenda Santa Carlota, Cajuru - SP. IVANAUSKAS, N. M.; BERTANI, D. F.; MATTOS, I. F. A.; KANASHIRO, M. M.; FRANCO, G. A. D. C.; CORDEIRO, I.; BERNACCI, L. C.; MEIRA NETO, J. A. A.',
      '2017 – Diagnóstico e propostas de manejo da vegetação da Estação Ecológica de Marília, SP. IVANAUSKAS, N. M.; FRANCO, G. A. D. C.; DURIGAN, G.; MATTOS, I. F. A.; TONIATO, M. T. Z.; KANASHIRO, M. M.; PILON, N. A. L.; UDULUTSCH, R. G.',
      '2006 – Invasive alien species (IAS): concerns and status in the Philippines. JOSHI, R. C.',
      '2009 – Las especies invasoras: un reto para la restauración ecológica. LEÓN, O. A. RÍOS, O. V.',
      '2013 – Plano de manejo da Floresta Nacional de Goytacazes. LORENSI, C. J.; DE OLIVEIRA, L. W. D. R.; MACHADO, J. A.; et al.',
      '2003 – Árvores exóticas no Brasil: madeireiras, ornamentais e aromáticas. LORENZI, H.; SOUZA, H. M.; TORRES, M. A. V.; BACHER, L. B.',
      '2020 – Exotic plants in a rocky outcrop area in the municipality of Niterói, Rio de Janeiro state, Brazil. MACHADO, D. N. S.; BARROS, A. A. M.; RIBAS, L. A.',
      '2022 – Desafio ambiental: invasão biológica da leucena leucocephala na Ilha dos Franceses, em Itapemirim -ES. MACHADO, P. P.; CONTARINI, L. C.; ROCHA, L. S.; JUNIOR, J. L. L. F.; MILANEZE, L. A.; SILVA, M. A. P.; RABELLO, H.',
      '2015 – Espécies exóticas na comunidade vegetal do Parque Estadual Sumaúma. MAGALHÃES, L. C. S',
      '2012 – Plano de manejo da Reserva de Desenvolvimento Sustentável Concha D\'Ostra. MAKOTO MEIO AMBIENTE SUSTENTABILIDADE LTDA.',
      '2001 – Human dimensions of invasive alien species in Sri Lanka. MARAMBE, B.; BAMBARADENIYA, C.; KUMARA, D. K. P.; PALLEWATTA, N.',
      '2004 – Invasive alien species in Japan: the status quo and the new regulation. MITO, T.; UESUGI, T.',
      '2006 – Espécies vegetais exóticas invasoras em florestas no Rio Grande do Sul. MONDIN, C. A.',
      '2002 – Weeds of pastures and natural areas of Hawaii and their management. MOTOOKA, P.; CASTRO, L.; NELSON, D.; NAGAI, G.; CHING, L.',
      '2016 – Plano de manejo da Estação Ecológica de Corumbá. MOURA, C. J. R.; BUSATO, L. C.; GAMA, M. J. E. C.; et al.',
      '2019 – Mapeamento de espécies invasoras em três unidades de conservação no Espírito Santo, Brasil. NUNES, S. T.; COSTALONGA, S.; PINTO, F. P.',
      '2001 – Informe sobre las especies exóticas en Venezuela. OJASTI, J.; JIMÉNEZ, E. G.; OTAHOLA, E. S.; ROMÁN, L. B. G.',
      '2015 – Invasão biológica vegetal de espécies exóticas no Parque Municipal do Mindu na cidade de Manaus - AM. OLIVEIRA, R. A.',
      '2015 – Lista nacional de plantas invasoras en Cuba - 2015. OVIEDO PRIETO, R.; GONZÁLEZ-OLIVA, L.',
      '1999 – PIER Database. PIER',
      '2009 – Plano de manejo do Parque Nacional da Chapada dos Guimarães. PIRES, F. A. O.; MOTA, L. C.; BARCELLOS, E. M. B.; et al.',
      '2001 – Subsídios para a elaboração do Plano de Manejo do Horto Florestal do Litoral Norte. PROGRAMA RS RURAL',
      '2006 – Manual de identificación y manejo de malezas en las islas de Galápagos. RENTERÍA, J. L.; ATKINSON, R.; GUERRERO, A. M.; MADER, J.',
      '1999 – Commercial forestry and agroforestry as sources of invasive alien trees and shrubs. RICHARDSON, D. M.',
      '2021 – Plano de manejo da Área de Relevante Interesse Ecológico Mata de Santa Genebra. SANTAROSA, P. L.; DE SOUZA, C. F.; DA SILVA GABRIEL, C. A. J.; et al.',
      '2016 – Plano de manejo da Área de Relevante Interesse Ecológico Floresta da Cicuta. SARDELLA, F. F.; NAZARETH, V. M.; ALVES, S. L.; et al.',
      '2022 – Invasão biológica na vegetação de restinga do sítio aeroportuário de Vitória, Espírito Santo, Brasil. SEKI, M. S.; MUZZOLON-JÚNIOR, R.; CAPUCHO, G.; VIEIRA, R. S.',
      '2023 – Plano de trabalho: avaliação do impacto das invasões biológicas no Monumento Natural (MONA) Pico do Ibituruna. SETE SOLUÇÕES E TECNOLOGIA AMBIENTAL LTDA.',
      '2023 – Plano de trabalho: avaliação do impacto das invasões biológicas no Monumento Natural (MONA) Rio Piranga. SETE SOLUÇÕES E TECNOLOGIA AMBIENTAL LTDA.',
      '2023 – Plano de trabalho: avaliação do impacto das invasões biológicas no Parque Estadual de Sete Salões (PESS). SETE SOLUÇÕES E TECNOLOGIA AMBIENTAL LTDA.',
      '2023 – Plano de trabalho: avaliação do impacto das invasões biológicas no Parque Estadual do Rio Doce (PERD). SETE SOLUÇÕES E TECNOLOGIA AMBIENTAL LTDA.',
      '2018 – Flora exótica invasora dos ecossistemas de Sergipe. SILVA, F. O.',
      '2002 – Monitoramento de áreas restauradas no interior do estado de São Paulo, Brasil. SIQUEIRA, L. P.',
      '1985 – Impact of alien plants on Hawaii\'s native biota. SMITH, C.',
      '1992 – Fire and alien plants in Hawai: research and management implications for native ecosystems. SMITH, C. W.; TUNISON, J. T.',
      '2002 – Análise da colonização vegetal espontânea em ambientes modificados por medidas físicas na recuperação de áreas degradadas. TREVISOL, R. G.; NEVES, L. G.; SILVA, R. T.; VALCARCEL, R.',
      '2021 – Assessment of non-native plants. UNIVERSITY OF FLORIDA',
      '2008 – Prejuízos causados pelas espécies exóticas invasoras na Floresta Nacional de Pacotuba. XAVIER, T. M. T.; MORENO, M. R.',
      '2025 – Widespread negative effects of Leucaena leucocephala (white-popinac) invasion on regenerating areas of the Atlantic Forest. ZARDETTO, J.; SIMIONI, W.; SIQUEIRA, T.',
      '2001 – Viewing invasive species removal in a whole-ecosystem context. ZAVALETA, E.; HOBBS, R. J.; MOONEY, H. A.',
      '2011 – An overview of invasive plants in Brazil. ZENNI, R. D.; ZILLER, S. R.',
      '20xx – Subsídios para o controle de Leucaena leucocephala, espécie exótica invasora, na Ilha de Fernando de Noronha. Thayná Jeremias Mello. <a href="https://www.gov.br/icmbio/pt-br/assuntos/pesquisa/projetos-apoiados/Subsdios_para_o_controle_de_Leucaena_leucocephala_espcie_extica_invasora_na_Ilha_de_Fernando_de_Noronha.pdf" target="_blank" rel="noopener noreferrer">PDF</a>',
      '2022 – Uma proposta de erradicação da espécie exótica invasora denominada Leucena em uma área do município de Itapira-SP e o favorecimento da biodiversidade local. Anderson Martelli. <a href="https://www.periodicos.unimontes.br/index.php/verdegrande/article/view/5075/5865" target="_blank" rel="noopener noreferrer">Link</a>'
    ];
    return '<div class="guide-refs-list">' + refs.map(function (r) { return '<div class="guide-ref-item">' + r + '</div>'; }).join('') + '</div>';
  }

  function getMediaContentPT() {
    var newsTitle = T['guide.mediaNews'].pt;
    var refsTitle = T['guide.mediaRefs'].pt;
    return '<h2>Mídia</h2><h3>' + newsTitle + '</h3><ul class="guide-media-links">' + getMediaLinksHTML() + '</ul><h3>' + refsTitle + '</h3><p>Referências: <a href="https://bd.institutohorus.org.br/especies/72" target="_blank" rel="noopener noreferrer">Base de Dados Instituto Hórus – <em>Leucaena leucocephala</em></a></p>' + getMediaRefsHTML();
  }

  function getMediaContentEN() {
    var newsTitle = T['guide.mediaNews'].en;
    var refsTitle = T['guide.mediaRefs'].en;
    return '<h2>Media</h2><h3>' + newsTitle + '</h3><ul class="guide-media-links">' + getMediaLinksHTML() + '</ul><h3>' + refsTitle + '</h3><p>References: <a href="https://bd.institutohorus.org.br/especies/72" target="_blank" rel="noopener noreferrer">Instituto Hórus Database – <em>Leucaena leucocephala</em></a></p>' + getMediaRefsHTML();
  }

  function getMediaContentES() {
    var newsTitleES = T['guide.mediaNews'].es;
    var refsTitle = T['guide.mediaRefs'].es;
    return '<h2>Medios</h2><h3>' + newsTitleES + '</h3><ul class="guide-media-links">' + getMediaLinksHTML() + '</ul><h3>' + refsTitle + '</h3><p>Referencias: <a href="https://bd.institutohorus.org.br/especies/72" target="_blank" rel="noopener noreferrer">Base de Datos Instituto Hórus – <em>Leucaena leucocephala</em></a></p>' + getMediaRefsHTML();
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

  // ── Collaborate content ──

  function getCollaborateContentPT() {
    return `<h2>Seja Colaborador</h2>
<p>Você pode contribuir com o mapeamento de <em>Leucaena leucocephala</em> no estado de São Paulo. Veja como:</p>
<h3>1. Solicite o código de acesso</h3>
<p>Envie um e-mail para <a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a> solicitando seu código de acesso.</p>
<h3>2. Crie sua conta</h3>
<p>Clique em <strong>"Entrar"</strong> no canto superior direito, depois em <strong>"Cadastrar"</strong>. Informe um nome de usuário, senha e o código de acesso recebido.</p>
<h3>3. Comece a mapear!</h3>
<p>Selecione uma célula do grid, clique em <strong>"Bloquear e Editar"</strong> e comece a desenhar máscaras de leucena usando as ferramentas de edição.</p>
<h3>Requisitos</h3>
<ul>
<li>Navegador atualizado (Chrome, Firefox, Edge)</li>
<li>Conexão com internet</li>
<li>Disposição para contribuir com ciência cidadã!</li>
</ul>`;
  }

  function getCollaborateContentEN() {
    return `<h2>Become a Collaborator</h2>
<p>You can contribute to the mapping of <em>Leucaena leucocephala</em> in the state of São Paulo. Here's how:</p>
<h3>1. Request the access code</h3>
<p>Send an email to <a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a> requesting your access code.</p>
<h3>2. Create your account</h3>
<p>Click <strong>"Sign In"</strong> in the upper right corner, then <strong>"Register"</strong>. Enter a username, password, and the access code you received.</p>
<h3>3. Start mapping!</h3>
<p>Select a grid cell, click <strong>"Lock & Edit"</strong> and start drawing Leucaena masks using the editing tools.</p>
<h3>Requirements</h3>
<ul>
<li>Updated browser (Chrome, Firefox, Edge)</li>
<li>Internet connection</li>
<li>Willingness to contribute to citizen science!</li>
</ul>`;
  }

  function getCollaborateContentES() {
    return `<h2>Sea Colaborador</h2>
<p>Puede contribuir con el mapeo de <em>Leucaena leucocephala</em> en el estado de São Paulo. Así es como:</p>
<h3>1. Solicite el código de acceso</h3>
<p>Envíe un correo a <a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a> solicitando su código de acceso.</p>
<h3>2. Cree su cuenta</h3>
<p>Haga clic en <strong>"Iniciar Sesión"</strong> en la esquina superior derecha, luego en <strong>"Registrarse"</strong>. Ingrese un nombre de usuario, contraseña y el código de acceso recibido.</p>
<h3>3. ¡Empiece a mapear!</h3>
<p>Seleccione una celda del grid, haga clic en <strong>"Bloquear y Editar"</strong> y comience a dibujar máscaras de leucaena usando las herramientas de edición.</p>
<h3>Requisitos</h3>
<ul>
<li>Navegador actualizado (Chrome, Firefox, Edge)</li>
<li>Conexión a internet</li>
<li>¡Disposición para contribuir con ciencia ciudadana!</li>
</ul>`;
  }

  // ── About content ──

  function makeAboutCard(initials, name, desc) {
    return `<div class="about-card"><div class="about-card-thumb">${initials}</div><div class="about-card-info"><div class="about-card-name">${name}</div><div class="about-card-desc">${desc}</div></div></div>`;
  }

  function getAboutContentPT() {
    return `<h2>Quem Somos</h2>
<div class="about-section-title">Idealizadores</div>
<div class="about-cards">
${makeAboutCard('MF', 'Dr. Matheus Pinheiro Ferreira', 'Supervisor do projeto – ESALQ/USP. Especialista em sensoriamento remoto e geotecnologias aplicadas ao monitoramento ambiental.')}
${makeAboutCard('MB', 'Matheus Siqueira Barros', 'Doutorando – ESALQ/USP. Responsável pelo desenvolvimento da plataforma e pela pesquisa sobre mapeamento e biomassa de <em>Leucaena leucocephala</em> usando sensoriamento remoto e inteligência artificial.')}
</div>
<div class="about-section-title">Colaboradores</div>
<div class="about-cards">
${makeAboutCard('JA', 'Judith Zuleika Bertolucci Alves', 'Colaboradora no mapeamento de manchas de leucena.')}
${makeAboutCard('RM', 'Rafael Perin Menassi', 'Colaborador no mapeamento de manchas de leucena.')}
</div>`;
  }

  function getAboutContentEN() {
    return `<h2>About Us</h2>
<div class="about-section-title">Project Leaders</div>
<div class="about-cards">
${makeAboutCard('MF', 'Dr. Matheus Pinheiro Ferreira', 'Project supervisor – ESALQ/USP. Specialist in remote sensing and geotechnologies applied to environmental monitoring.')}
${makeAboutCard('MB', 'Matheus Siqueira Barros', 'PhD Candidate – ESALQ/USP. Responsible for the platform development and research on mapping and biomass of <em>Leucaena leucocephala</em> using remote sensing and artificial intelligence.')}
</div>
<div class="about-section-title">Collaborators</div>
<div class="about-cards">
${makeAboutCard('JA', 'Judith Zuleika Bertolucci Alves', 'Collaborator in leucaena patch mapping.')}
${makeAboutCard('RM', 'Rafael Perin Menassi', 'Collaborator in leucaena patch mapping.')}
</div>`;
  }

  function getAboutContentES() {
    return `<h2>Quiénes Somos</h2>
<div class="about-section-title">Creadores</div>
<div class="about-cards">
${makeAboutCard('MF', 'Dr. Matheus Pinheiro Ferreira', 'Supervisor del proyecto – ESALQ/USP. Especialista en teledetección y geotecnologías aplicadas al monitoreo ambiental.')}
${makeAboutCard('MB', 'Matheus Siqueira Barros', 'Doctorando – ESALQ/USP. Responsable del desarrollo de la plataforma y de la investigación sobre mapeo y biomasa de <em>Leucaena leucocephala</em> usando teledetección e inteligencia artificial.')}
</div>
<div class="about-section-title">Colaboradores</div>
<div class="about-cards">
${makeAboutCard('JA', 'Judith Zuleika Bertolucci Alves', 'Colaboradora en el mapeo de manchas de leucaena.')}
${makeAboutCard('RM', 'Rafael Perin Menassi', 'Colaborador en el mapeo de manchas de leucaena.')}
</div>`;
  }

  return { t, tHtml, getLang, setLang, translatePage };
})();

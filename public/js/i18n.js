window.LeucenaI18n = (function () {
  function detectLang() {
    const saved = localStorage.getItem('leucena_lang');
    if (saved) return saved;
    const nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (nav.startsWith('pt')) return 'pt';
    if (nav.startsWith('es')) return 'es';
    return 'en';
  }

  let currentLang = detectLang();

  const T = {
    // ── App title ──
    'app.title': { pt: 'leucaena.earth', en: 'leucaena.earth', es: 'leucaena.earth' },
    'app.startHere': { pt: 'Comece por aqui', en: 'Start here', es: 'Comience aquí' },

    // ── Auth ──
    'auth.login': { pt: 'Entrar', en: 'Sign In', es: 'Iniciar Sesión' },
    'auth.register': { pt: 'Cadastrar', en: 'Register', es: 'Registrarse' },
    'auth.loginSubtitle': { pt: 'Faça login para editar o mapa', en: 'Sign in to edit the map', es: 'Inicie sesión para editar el mapa' },
    'auth.registerSubtitle': { pt: 'Crie uma conta para começar a mapear', en: 'Create an account to start mapping', es: 'Cree una cuenta para empezar a mapear' },
    'auth.userPlaceholder': { pt: 'joao.silva', en: 'joao.silva', es: 'joao.silva' },
    'auth.userOrEmailPlaceholder': { pt: 'Usuário ou e-mail', en: 'Username or email', es: 'Usuario o correo' },
    'auth.passPlaceholder': { pt: 'Senha', en: 'Password', es: 'Contraseña' },
    'auth.fullNamePlaceholder': { pt: 'Nome completo', en: 'Full name', es: 'Nombre completo' },
    'auth.fullNameRequired': { pt: 'Informe seu nome completo', en: 'Please enter your full name', es: 'Ingrese su nombre completo' },
    'auth.emailPlaceholder': { pt: 'seu@email.com', en: 'your@email.com', es: 'su@email.com' },
    'auth.usernameHint': { pt: 'Apenas letras minúsculas, números e ponto', en: 'Only lowercase letters, numbers, and dot', es: 'Solo letras minúsculas, números y punto' },
    'auth.usernameInvalid': { pt: 'Usuário inválido. Use apenas letras minúsculas, números e ponto (ex: joao.silva)', en: 'Invalid username. Use only lowercase letters, numbers, and dot (e.g. joao.silva)', es: 'Usuario inválido. Use solo letras minúsculas, números y punto (ej: joao.silva)' },
    'auth.usernameNeedsLetter': { pt: 'O usuário deve conter pelo menos uma letra (ex: joao.silva)', en: 'Username must contain at least one letter (e.g. joao.silva)', es: 'El usuario debe contener al menos una letra (ej: joao.silva)' },
    'auth.confirmPassPlaceholder': { pt: 'Confirmar senha', en: 'Confirm password', es: 'Confirmar contraseña' },
    'auth.passwordMismatch': { pt: 'As senhas não coincidem', en: 'Passwords do not match', es: 'Las contraseñas no coinciden' },
    'auth.emailInvalid': { pt: 'Informe um e-mail válido', en: 'Enter a valid email', es: 'Ingrese un correo válido' },
    'auth.emailAlreadyInUse': { pt: 'Este e-mail já está em uso', en: 'This email is already in use', es: 'Este correo ya está en uso' },
    'auth.emailExistsVerified': { pt: 'Este e-mail já possui uma conta verificada.', en: 'This email already has a verified account.', es: 'Este correo ya tiene una cuenta verificada.' },
    'auth.emailExistsUnverified': { pt: 'Este e-mail já possui uma conta, mas não está verificada.', en: 'This email already has an account, but it is not verified.', es: 'Este correo ya tiene una cuenta, pero no está verificada.' },
    'auth.createAccount': { pt: 'Criar Conta', en: 'Create Account', es: 'Crear Cuenta' },
    'auth.noAccount': { pt: 'Não tem conta?', en: 'No account?', es: '¿No tiene cuenta?' },
    'auth.hasAccount': { pt: 'Já tem conta?', en: 'Already have an account?', es: '¿Ya tiene cuenta?' },
    'auth.connectionError': { pt: 'Erro de conexão. Tente novamente.', en: 'Connection error. Try again.', es: 'Error de conexión. Intente de nuevo.' },
    'auth.welcome': { pt: 'Bem-vindo, {0}!', en: 'Welcome, {0}!', es: '¡Bienvenido, {0}!' },
    'auth.disconnected': { pt: 'Desconectado', en: 'Disconnected', es: 'Desconectado' },
    'auth.loginToEdit': { pt: 'Faça login para Editar', en: 'Sign in to Edit', es: 'Inicie sesión para Editar' },
    'auth.logout': { pt: 'Sair', en: 'Logout', es: 'Salir' },
    'auth.forgotPassword': { pt: 'Esqueci minha senha', en: 'Forgot my password', es: 'Olvidé mi contraseña' },
    'auth.orSeparator': { pt: 'ou', en: 'or', es: 'o' },
    'auth.googleSignIn': { pt: 'Entrar com Google', en: 'Sign in with Google', es: 'Iniciar sesión con Google' },
    'auth.googleSignUp': { pt: 'Cadastrar com Google', en: 'Sign up with Google', es: 'Registrarse con Google' },
    'auth.verifyEmailSent': { pt: 'Um e-mail de verificação foi enviado para {0}. Verifique sua caixa de entrada.', en: 'A verification email was sent to {0}. Check your inbox.', es: 'Se envió un correo de verificación a {0}. Revise su bandeja.' },
    'auth.accountDeactivated': { pt: 'Conta desativada. Entre em contato com o administrador.', en: 'Account deactivated. Contact the administrator.', es: 'Cuenta desactivada. Contacte al administrador.' },
    'auth.resendVerification': { pt: 'Reenviar e-mail de verificação', en: 'Resend verification email', es: 'Reenviar correo de verificación' },
    'auth.resendSuccess': { pt: 'E-mail de verificação reenviado!', en: 'Verification email resent!', es: '¡Correo de verificación reenviado!' },
    'auth.verificationRequired': { pt: 'Verifique seu e-mail para poder editar o mapa.', en: 'Verify your email to be able to edit the map.', es: 'Verifique su correo para poder editar el mapa.' },
    'auth.emailNotVerifiedAction': { pt: 'Verifique seu e-mail antes de usar esta função.', en: 'Verify your email before using this feature.', es: 'Verifique su correo antes de usar esta función.' },
    'auth.verifyLinkSent': { pt: 'Enviamos um link de verificação para {0}. Verifique sua caixa de entrada.', en: 'We sent a verification link to {0}. Check your inbox.', es: 'Enviamos un enlace de verificación a {0}. Revise su bandeja.' },
    'auth.verifyLinkRecentlySent': { pt: 'Um link de verificação já foi enviado para {0}. Verifique sua caixa de entrada ou aguarde 2 minutos.', en: 'A verification link was already sent to {0}. Check your inbox or wait 2 minutes.', es: 'Ya se envió un enlace de verificación a {0}. Revise su bandeja o espere 2 minutos.' },
    'auth.noEmailContactAdmin': { pt: 'Seu cadastro não tem e-mail. Entre em contato com o administrador.', en: 'Your account has no email. Contact the administrator.', es: 'Su cuenta no tiene correo. Contacte al administrador.' },
    'auth.migrationBanner': { pt: 'Vincule sua conta ao Google para login mais rápido e seguro', en: 'Link your account to Google for faster and safer login', es: 'Vincule su cuenta a Google para un inicio de sesión más rápido y seguro' },
    'auth.migrationBannerLink': { pt: 'Vincular agora', en: 'Link now', es: 'Vincular ahora' },
    'auth.migrationBannerDismiss': { pt: 'Depois', en: 'Later', es: 'Después' },
    'profile.linkGoogle': { pt: 'Vincular conta Google', en: 'Link Google account', es: 'Vincular cuenta de Google' },
    'profile.googleLinked': { pt: 'Conta Google vinculada', en: 'Google account linked', es: 'Cuenta de Google vinculada' },
    'profile.emailNotVerified': { pt: 'E-mail não verificado', en: 'Email not verified', es: 'Correo no verificado' },
    'profile.emailVerified': { pt: 'E-mail verificado', en: 'Email verified', es: 'Correo verificado' },

    // ── Top bar ──
    'topbar.export': { pt: 'Exportar', en: 'Export', es: 'Exportar' },
    'topbar.loginToDownload': { pt: 'Faça login para baixar', en: 'Login to download', es: 'Inicie sesión para descargar' },
    'topbar.pointsGeoJSON': { pt: 'Pontos de Ocorrência (GeoJSON)', en: 'Occurrence Points (GeoJSON)', es: 'Puntos de Ocurrencia (GeoJSON)' },
    'topbar.gridGeoJSON': { pt: 'Grade SP (GeoJSON)', en: 'Grid SP (GeoJSON)', es: 'Cuadrícula SP (GeoJSON)' },
    'topbar.polygonsGeoJSON': { pt: 'Polígonos de Leucena (GeoJSON)', en: 'Leucaena Polygons (GeoJSON)', es: 'Polígonos de Leucena (GeoJSON)' },
    'topbar.onlineUsers': { pt: 'Usuários online', en: 'Online users', es: 'Usuarios en línea' },

    // ── Unlock modal ──
    'unlock.title': { pt: 'Desbloquear Célula', en: 'Unlock Cell', es: 'Desbloquear Celda' },
    'unlock.subtitle': { pt: 'Qual é o status desta célula?', en: 'What is the status of this cell?', es: '¿Cuál es el estado de esta celda?' },
    'unlock.finished': { pt: 'Finalizado', en: 'Finished', es: 'Finalizado' },
    'unlock.notFinished': { pt: 'Ainda não finalizado', en: 'Not yet finished', es: 'Aún no finalizado' },
    'unlock.cancel': { pt: 'Cancelar', en: 'Cancel', es: 'Cancelar' },
    'unlock.crowdmappingNotice': { pt: 'Esta célula contém pontos de crowdmapping e só pode ser finalizada por um administrador. Você pode salvá-la como "Ainda não finalizado".', en: 'This cell contains crowdmapping points and can only be finalized by an administrator. You can save it as "Not yet finished".', es: 'Esta celda contiene puntos de crowdmapping y solo puede ser finalizada por un administrador. Puede guardarla como "Aún no finalizado".' },

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
    'sidebar.leucenaMasks': { pt: 'Polígonos de Leucena', en: 'Leucaena Polygons', es: 'Polígonos de Leucena' },
    'sidebar.showLeucenaMasks': { pt: 'Exibir polígonos', en: 'Show polygons', es: 'Mostrar polígonos' },
    'sidebar.masksMember': { pt: 'Membros', en: 'Members', es: 'Miembros' },
    'sidebar.masksContributor': { pt: 'Colaboradores', en: 'Contributors', es: 'Colaboradores' },
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
    'sidebar.masks': { pt: 'Polígonos:', en: 'Polygons:', es: 'Polígonos:' },
    'sidebar.workedBy': { pt: 'Trabalhado por:', en: 'Worked by:', es: 'Trabajado por:' },
    'sidebar.finishedBy': { pt: 'Finalizado por:', en: 'Finished by:', es: 'Finalizado por:' },
    'sidebar.lockEdit': { pt: 'Bloquear e Editar', en: 'Lock & Edit', es: 'Bloquear y Editar' },
    'sidebar.onlineUsers': { pt: 'Usuários Online', en: 'Online Users', es: 'Usuarios en Línea' },
    'sidebar.mobilePanelTitle': { pt: 'Painel', en: 'Panel', es: 'Panel' },
    'sidebar.closePanel': { pt: 'Fechar painel', en: 'Close panel', es: 'Cerrar panel' },
    'sidebar.mappingProgress': { pt: 'Progresso', en: 'Progress', es: 'Progreso' },
    'sidebar.progressFinished': { pt: 'Finalizado', en: 'Finished', es: 'Finalizado' },
    'sidebar.progressMapping': { pt: 'Mapeando', en: 'Mapping', es: 'Mapeando' },
    'sidebar.progressToMap': { pt: 'A mapear', en: 'To map', es: 'Por mapear' },

    // ── Status labels ──
    'status.not_yet_finished': { pt: 'Ainda não finalizado', en: 'Not yet finished', es: 'Aún no finalizado' },
    'status.in_use': { pt: 'Célula em Uso', en: 'Cell in Use', es: 'Celda en Uso' },
    'status.mapping': { pt: 'Mapeando', en: 'Mapping', es: 'Mapeando' },
    'status.no_points': { pt: 'Sem pontos', en: 'No points', es: 'Sin puntos' },
    'status.finished': { pt: 'Finalizado', en: 'Finished', es: 'Finalizado' },

    // ── Toolbar ──
    'tool.select': { pt: 'Selecionar', en: 'Select', es: 'Seleccionar' },
    'tool.unlock': { pt: 'Desbloquear', en: 'Unlock', es: 'Desbloquear' },
    'tool.streetview': { pt: 'Street View (Shift+S)', en: 'Street View (Shift+S)', es: 'Street View (Shift+S)' },
    'tool.map': { pt: 'Mapa', en: 'Map', es: 'Mapa' },
    'tool.satellite': { pt: 'Satélite', en: 'Satellite', es: 'Satélite' },
    'tool.labels': { pt: 'Rótulos', en: 'Labels', es: 'Etiquetas' },
    'tool.labelsTooltip': { pt: 'Mostrar ou ocultar nomes de ruas e lugares (modo satélite)', en: 'Show or hide street and place names (satellite mode)', es: 'Mostrar u ocultar calles y lugares (modo satélite)' },
    'tool.labelsReenableHint': { pt: 'Clique aqui para voltar a mostrar os rótulos', en: 'Click here to show labels again', es: 'Haga clic aquí para volver a mostrar las etiquetas' },
    'tool.addPoints': { pt: 'Add Pontos', en: 'Add Points', es: 'Agregar Puntos' },
    'tool.delPoints': { pt: 'Remover Pontos', en: 'Remove Points', es: 'Remover Puntos' },
    'tool.draw': { pt: 'Desenhar Polígono (Shift+C)', en: 'Draw Polygon (Shift+C)', es: 'Dibujar Polígono (Shift+C)' },
    'tool.edit': { pt: 'Editar Polígono (Shift+E)', en: 'Edit Polygon (Shift+E)', es: 'Editar Polígono (Shift+E)' },
    'tool.deletePoly': { pt: 'Excluir Polígono (Shift+D)', en: 'Delete Polygon (Shift+D)', es: 'Eliminar Polígono (Shift+D)' },
    'tool.hole': { pt: 'Criar Buraco (Shift+H)', en: 'Hole Tool (Shift+H)', es: 'Crear Agujero (Shift+H)' },
    'tool.undo': { pt: 'Desfazer (Ctrl+Z)', en: 'Undo (Ctrl+Z)', es: 'Deshacer (Ctrl+Z)' },
    'tool.finishDraw': { pt: 'Finalizar desenho', en: 'Finish drawing', es: 'Finalizar dibujo' },
    'tool.home': { pt: 'Visão inicial', en: 'Initial view', es: 'Vista inicial' },
    'tool.zoomIn': { pt: 'Zoom +', en: 'Zoom +', es: 'Zoom +' },
    'tool.zoomOut': { pt: 'Zoom -', en: 'Zoom -', es: 'Zoom -' },
    'map.myLocation': { pt: 'Minha localização', en: 'My location', es: 'Mi ubicación' },
    'map.youAreHere': { pt: 'Você está aqui', en: 'You are here', es: 'Usted está aquí' },
    'map.geoNotSupported': { pt: 'Geolocalização não suportada neste navegador', en: 'Geolocation not supported in this browser', es: 'Geolocalización no soportada en este navegador' },
    'map.geoDenied': { pt: 'Permissão de localização negada. Ative nas configurações do navegador.', en: 'Location permission denied. Enable it in browser settings.', es: 'Permiso de ubicación denegado. Actívelo en la configuración del navegador.' },
    'map.geoError': { pt: 'Não foi possível obter sua localização. Verifique as permissões do navegador.', en: 'Could not get your location. Check browser permissions.', es: 'No se pudo obtener su ubicación. Verifique los permisos del navegador.' },
    'coords.hint': { pt: 'Aperte o botão direito do mouse<br>no mapa por 2s para copiar coordenadas', en: 'Hold right mouse button on the map<br>for 2s to copy coordinates', es: 'Mantenga el botón derecho del ratón<br>en el mapa por 2s para copiar coordenadas' },

    // ── Legend ──
    'legend.title': { pt: 'Legenda', en: 'Legend', es: 'Leyenda' },
    'legend.toggleTooltip': { pt: 'Abrir ou fechar a legenda', en: 'Open or close the legend', es: 'Abrir o cerrar la leyenda' },
    'legend.expandHint': { pt: 'Clique para ver a legenda de novo', en: 'Click to show the legend again', es: 'Haga clic para ver la leyenda de nuevo' },
    'legend.cells': { pt: 'Células', en: 'Cells', es: 'Celdas' },
    'legend.leucenaPoints': { pt: 'Pontos de Leucena', en: 'Leucaena Points', es: 'Puntos de Leucaena' },
    'legend.leucenaMask': { pt: 'Polígono de Leucena', en: 'Leucaena Polygon', es: 'Polígono de Leucena' },
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
    'admin.usersTitle': { pt: 'Painel do Admin', en: 'Admin Panel', es: 'Panel de Admin' },
    'admin.changePassword': { pt: 'Alterar Senha', en: 'Change Password', es: 'Cambiar Contraseña' },
    'admin.deactivateUser': { pt: 'Desativar', en: 'Deactivate', es: 'Desactivar' },
    'admin.reactivateUser': { pt: 'Reativar', en: 'Reactivate', es: 'Reactivar' },
    'admin.permanentDelete': { pt: 'Excluir permanente', en: 'Permanent delete', es: 'Eliminar permanente' },
    'admin.confirmDeactivate': { pt: 'Desativar o usuário "{0}"? Ele não poderá mais fazer login, mas seus dados e contribuições serão preservados.', en: 'Deactivate user "{0}"? They will no longer be able to log in, but their data and contributions will be preserved.', es: 'Desactivar al usuario "{0}"? No podrá iniciar sesión, pero sus datos y contribuciones se conservarán.' },
    'admin.confirmPermanentDelete': { pt: 'EXCLUIR PERMANENTEMENTE o usuário "{0}"? Esta ação é irreversível. Os polígonos serão transferidos para o usuário "deleted".', en: 'PERMANENTLY DELETE user "{0}"? This action is irreversible. Polygons will be transferred to the "deleted" user.', es: 'ELIMINAR PERMANENTEMENTE al usuario "{0}"? Esta acción es irreversible. Los polígonos serán transferidos al usuario "deleted".' },
    'admin.userDeactivated': { pt: 'Usuário desativado', en: 'User deactivated', es: 'Usuario desactivado' },
    'admin.userReactivated': { pt: 'Usuário reativado', en: 'User reactivated', es: 'Usuario reactivado' },
    'admin.inactive': { pt: 'Inativo', en: 'Inactive', es: 'Inactivo' },
    'admin.deleteUser': { pt: 'Excluir', en: 'Delete', es: 'Eliminar' },
    'admin.confirmDelete': { pt: 'Tem certeza que deseja excluir o usuário "{0}"? Os polígonos serão transferidos para o usuário "deleted".', en: 'Are you sure you want to delete user "{0}"? Polygons will be transferred to the "deleted" user.', es: '¿Está seguro de que desea eliminar al usuario "{0}"? Los polígonos serán transferidos al usuario "deleted".' },
    'admin.newPassword': { pt: 'Nova senha para "{0}":', en: 'New password for "{0}":', es: 'Nueva contraseña para "{0}":' },
    'admin.changePasswordTitle': { pt: 'Alterar senha de {0}', en: 'Change password for {0}', es: 'Cambiar contraseña de {0}' },
    'admin.changePasswordBtn': { pt: 'Alterar senha', en: 'Change password', es: 'Cambiar contraseña' },
    'admin.passwordChanged': { pt: 'Senha alterada com sucesso', en: 'Password changed successfully', es: 'Contraseña cambiada exitosamente' },
    'admin.userDeleted': { pt: 'Usuário excluído', en: 'User deleted', es: 'Usuario eliminado' },
    'admin.editProfile': { pt: 'Perfil', en: 'Profile', es: 'Perfil' },
    'admin.editFullName': { pt: 'Nome completo para "{0}":', en: 'Full name for "{0}":', es: 'Nombre completo para "{0}":' },
    'admin.editDescription': { pt: 'Descrição para "{0}":', en: 'Description for "{0}":', es: 'Descripción para "{0}":' },
    'admin.profileUpdated': { pt: 'Perfil atualizado', en: 'Profile updated', es: 'Perfil actualizado' },
    'admin.editProfileTitle': { pt: 'Editar perfil de {0}', en: 'Edit profile of {0}', es: 'Editar perfil de {0}' },
    'admin.masks': { pt: 'Polígonos', en: 'Polygons', es: 'Polígonos' },
    'admin.area': { pt: 'Área mapeada', en: 'Mapped area', es: 'Área mapeada' },
    'admin.logins': { pt: 'Logins', en: 'Logins', es: 'Logins' },
    'admin.timeOnline': { pt: 'Tempo Online', en: 'Time Online', es: 'Tiempo Online' },
    'admin.totalUsers': { pt: 'Usuários', en: 'Users', es: 'Usuarios' },
    'admin.members': { pt: 'membros', en: 'members', es: 'miembros' },
    'admin.collaborators': { pt: 'colaboradores', en: 'collaborators', es: 'colaboradores' },
    'admin.viewAsAdmin': { pt: 'Ver como Admin', en: 'View as Admin', es: 'Ver como Admin' },
    'admin.totalMasks': { pt: 'Total de polígonos', en: 'Total polygons', es: 'Total de polígonos' },
    'admin.totalArea': { pt: 'Área total mapeada', en: 'Total mapped area', es: 'Área total mapeada' },
    'admin.exportCsv': { pt: 'Exportar Usuários', en: 'Export Users', es: 'Exportar Usuarios' },
    'admin.exportLogs': { pt: 'Logs (48h)', en: 'Logs (48h)', es: 'Logs (48h)' },
    'admin.copyRecentLogs': { pt: 'Copiar log (5 min)', en: 'Copy log (5 min)', es: 'Copiar log (5 min)' },
    'admin.logsCopied': { pt: 'Log copiado!', en: 'Log copied!', es: 'Log copiado!' },
    'admin.noRecentLogs': { pt: 'Nenhum log nos últimos 5 minutos', en: 'No logs in the last 5 minutes', es: 'Sin logs en los últimos 5 minutos' },
    'admin.backupDb': { pt: 'Backup DB', en: 'Backup DB', es: 'Backup DB' },
    'admin.backupDone': { pt: 'Backup baixado com sucesso', en: 'Backup downloaded successfully', es: 'Backup descargado exitosamente' },
    'admin.importPoints': { pt: 'Importar Pontos', en: 'Import Points', es: 'Importar Puntos' },
    'admin.importFileTooLarge': { pt: 'Arquivo muito grande (máx 20MB)', en: 'File too large (max 20MB)', es: 'Archivo muy grande (máx 20MB)' },
    'admin.importInvalidJson': { pt: 'Arquivo não é um JSON válido', en: 'File is not valid JSON', es: 'El archivo no es un JSON válido' },
    'admin.importNotFeatureCollection': { pt: 'GeoJSON deve ser um FeatureCollection', en: 'GeoJSON must be a FeatureCollection', es: 'GeoJSON debe ser un FeatureCollection' },
    'admin.importEmpty': { pt: 'GeoJSON não contém features', en: 'GeoJSON contains no features', es: 'GeoJSON no contiene features' },
    'admin.importConfirm': { pt: 'Importar {0} pontos como crowdmapping (válidos)?', en: 'Import {0} points as crowdmapping (valid)?', es: '¿Importar {0} puntos como crowdmapping (válidos)?' },
    'admin.importUploading': { pt: 'Enviando pontos...', en: 'Uploading points...', es: 'Subiendo puntos...' },
    'admin.importSuccess': { pt: '{0} pontos importados com sucesso!', en: '{0} points imported successfully!', es: '¡{0} puntos importados con éxito!' },
    'admin.importSkipped': { pt: 'ignorados', en: 'skipped', es: 'ignorados' },
    'admin.importDuplicates': { pt: '{0} ponto(s) ignorado(s) — já existem no banco', en: '{0} point(s) skipped — already exist in database', es: '{0} punto(s) ignorado(s) — ya existen en la base' },
    'admin.importSkippedMsg': { pt: '{0} ponto(s) com erro de formato', en: '{0} point(s) with format error', es: '{0} punto(s) con error de formato' },
    'admin.importAllDuplicates': { pt: 'Todos os pontos já existiam no banco', en: 'All points already exist in database', es: 'Todos los puntos ya existen en la base' },
    'admin.createUser': { pt: 'Criar Usuário', en: 'Create User', es: 'Crear Usuario' },
    'admin.createUserTitle': { pt: 'Criar Usuário', en: 'Create User', es: 'Crear Usuario' },
    'admin.createUserSubmit': { pt: 'Criar', en: 'Create', es: 'Crear' },
    'admin.createUserCancel': { pt: 'Cancelar', en: 'Cancel', es: 'Cancelar' },
    'admin.createUserAllFields': { pt: 'Preencha todos os campos', en: 'Fill in all fields', es: 'Complete todos los campos' },
    'admin.createUserSuccess': { pt: 'Usuário "{0}" criado com sucesso', en: 'User "{0}" created successfully', es: 'Usuario "{0}" creado exitosamente' },
    
    'admin.verified': { pt: 'Verificado', en: 'Verified', es: 'Verificado' },
    'admin.notVerified': { pt: 'Não verificado', en: 'Not verified', es: 'No verificado' },
    'admin.verifyUser': { pt: 'Verificar', en: 'Verify', es: 'Verificar' },
    'admin.verifySuccess': { pt: 'Usuário verificado com sucesso', en: 'User verified successfully', es: 'Usuario verificado exitosamente' },

    'admin.renameUser': { pt: 'Renomear', en: 'Rename', es: 'Renombrar' },
    'admin.renamePrompt': { pt: 'Novo nome de usuário para "{0}":', en: 'New username for "{0}":', es: 'Nuevo nombre de usuario para "{0}":' },
    'admin.renameSuccess': { pt: 'Usuário "{0}" renomeado para "{1}"', en: 'User "{0}" renamed to "{1}"', es: 'Usuario "{0}" renombrado a "{1}"' },
    'admin.createdAt': { pt: 'Criado em', en: 'Created', es: 'Creado' },
    'admin.lastAccess': { pt: 'Último acesso', en: 'Last access', es: 'Último acceso' },
    'admin.activeNow': { pt: 'Ativo agora', en: 'Active now', es: 'Activo ahora' },
    'admin.minutesAgo': { pt: 'há {0} minutos', en: '{0} min ago', es: 'hace {0} min' },
    'admin.hoursAgo': { pt: 'há {0} horas', en: '{0}h ago', es: 'hace {0}h' },
    'admin.daysAgo': { pt: 'há {0} dias', en: '{0}d ago', es: 'hace {0}d' },
    'admin.never': { pt: 'Nunca', en: 'Never', es: 'Nunca' },
    'admin.sectionEquipe': { pt: 'Equipe', en: 'Team', es: 'Equipo' },
    'admin.sectionColaboradores': { pt: 'Colaboradores', en: 'Contributors', es: 'Colaboradores' },
    'admin.colabUnverifiedCount': { pt: '{0} não verificados', en: '{0} unverified', es: '{0} sin verificar' },
    'admin.sectionLogs': { pt: 'Exportar & Logs', en: 'Export & Logs', es: 'Exportar & Logs' },
    'admin.sectionData': { pt: 'Usuários & Dados', en: 'Users & Data', es: 'Usuarios & Datos' },
    'admin.sectionMaintenance': { pt: 'Manutenção', en: 'Maintenance', es: 'Mantenimiento' },
    'admin.dedupBtn': { pt: 'Remover Duplicados', en: 'Remove Duplicates', es: 'Eliminar Duplicados' },
    'admin.dedupScanning': { pt: 'Buscando duplicados...', en: 'Scanning for duplicates...', es: 'Buscando duplicados...' },
    'admin.dedupNone': { pt: 'Nenhum ponto duplicado encontrado!', en: 'No duplicate points found!', es: '¡No se encontraron puntos duplicados!' },
    'admin.dedupConfirm': { pt: 'Foram encontrados {0} pontos duplicados (mesma posição até 5 casas decimais). Deseja removê-los? O primeiro ponto de cada posição será mantido.', en: '{0} duplicate points found (same position to 5 decimal places). Remove them? The first point at each position will be kept.', es: 'Se encontraron {0} puntos duplicados (misma posición hasta 5 decimales). ¿Eliminarlos? Se mantendrá el primer punto de cada posición.' },
    'admin.dedupSuccess': { pt: '{0} pontos duplicados removidos com sucesso!', en: '{0} duplicate points removed successfully!', es: '¡{0} puntos duplicados eliminados con éxito!' },
    'admin.dedupFail': { pt: 'Erro ao remover duplicados', en: 'Failed to remove duplicates', es: 'Error al eliminar duplicados' },
    'admin.dedupUndo': { pt: 'Desfazer', en: 'Undo', es: 'Deshacer' },
    'admin.dedupUndoSuccess': { pt: '{0} pontos restaurados com sucesso!', en: '{0} points restored successfully!', es: '¡{0} puntos restaurados con éxito!' },
    'admin.dedupUndoFail': { pt: 'Erro ao desfazer', en: 'Failed to undo', es: 'Error al deshacer' },
    'admin.dedupUndoNone': { pt: 'Nenhuma deduplicação para desfazer', en: 'No deduplication to undo', es: 'No hay deduplicación para deshacer' },
    'admin.dedupModalTitle': { pt: 'Remover Pontos Duplicados', en: 'Remove Duplicate Points', es: 'Eliminar Puntos Duplicados' },
    'admin.dedupModalConfirm': { pt: 'Confirmar Remoção', en: 'Confirm Removal', es: 'Confirmar Eliminación' },
    'admin.dedupModalCancel': { pt: 'Cancelar', en: 'Cancel', es: 'Cancelar' },
    'admin.dedupRemoving': { pt: 'Removendo duplicados...', en: 'Removing duplicates...', es: 'Eliminando duplicados...' },

    // ── Welcome modal ──
    'welcome.title': { pt: 'Novidades!', en: "What's new!", es: '¡Novedades!' },
    'welcome.videoAdded': {
      pt: 'Foi adicionado um vídeo na seção "Como Mapear" explicando o procedimento de mapeamento.',
      en: 'A video has been added to the "How to Map" section explaining the mapping procedure.',
      es: 'Se agregó un video en la sección "Cómo Mapear" que explica el procedimiento de mapeo.'
    },
    'welcome.objective': {
      pt: 'O objetivo é que sejam desenhados polígonos ao redor dos aglomerados de leucena (áreas onde há duas ou mais leucenas juntas) sobre as imagens de satélite. O vídeo explica como fazer isso passo a passo!',
      en: 'The goal is to draw polygons around leucaena clusters (areas where two or more leucaena trees grow together) over satellite imagery. The video explains how to do it step by step!',
      es: 'El objetivo es dibujar polígonos alrededor de los aglomerados de leucena (áreas donde hay dos o más leucenas juntas) sobre las imágenes de satélite. ¡El video explica cómo hacerlo paso a paso!'
    },
    'welcome.dontShowAgain': { pt: 'Não mostrar novamente', en: "Don't show again", es: 'No mostrar de nuevo' },
    'welcome.goToVideo': { pt: 'Ver vídeo', en: 'Watch video', es: 'Ver video' },

    // ── Tour steps ──
    'tour.startTour': { pt: 'Fazer o tour da plataforma', en: 'Take the platform tour', es: 'Hacer el tour de la plataforma' },
    'tour.skip': { pt: 'Pular', en: 'Skip', es: 'Saltar' },
    'tour.next': { pt: 'Próximo', en: 'Next', es: 'Siguiente' },
    'tour.finish': { pt: 'Entendi!', en: 'Got it!', es: '¡Entendido!' },
    'tour.step1': {
      pt: 'Comece por aqui: documentação, tutoriais em vídeo e informações sobre o projeto.',
      en: 'Start here: documentation, video tutorials, and project information.',
      es: 'Empiece aquí: documentación, tutoriales en video e información del proyecto.'
    },
    'tour.step2': {
      pt: 'Seu perfil: após login, clique aqui para ver e editar suas informações.',
      en: 'Your profile: after login, click here to view and edit your info.',
      es: 'Su perfil: después de iniciar sesión, haga clic aquí para ver y editar su información.'
    },
    'tour.step3': {
      pt: 'Abra o painel lateral para ver filtros, informações da célula selecionada e os usuários online.',
      en: 'Open the side panel to see filters, selected cell info, and online users.',
      es: 'Abra el panel lateral para ver filtros, información de la celda y usuarios en línea.'
    },
    'tour.step4': {
      pt: 'Ferramentas do mapa: alterne Satélite/Mapa e ative Rótulos para facilitar a navegação.',
      en: 'Map tools: switch Satellite/Map and enable Labels to navigate more easily.',
      es: 'Herramientas del mapa: cambie Satélite/Mapa y active Etiquetas para navegar mejor.'
    },
    'tour.step5': {
      pt: 'Minha localização: centralize o mapa na sua posição para se orientar (celular e computador).',
      en: 'My location: center the map on your position to get oriented (mobile and desktop).',
      es: 'Mi ubicación: centre el mapa en su posición para orientarse (móvil y escritorio).'
    },
    'tour.step6': {
      pt: 'Este é o mapa: clique nas células e explore para começar a mapear.',
      en: 'This is the map: click grid cells and explore to start mapping.',
      es: 'Este es el mapa: haga clic en las celdas y explore para empezar a mapear.'
    },

    // ── Debug (map / stats modal) ──
    'debug.siteViews': { pt: 'Visualizações do site', en: 'Site views', es: 'Visitas al sitio' },
    'debug.mapNotReady': { pt: 'Mapa ainda não carregado', en: 'Map not loaded yet', es: 'Mapa aún no cargado' },

    // ── Password Reset ──
    'reset.title': { pt: 'Recuperar Senha', en: 'Reset Password', es: 'Recuperar Contraseña' },
    'reset.subtitle': { pt: 'Informe seu e-mail cadastrado. Enviaremos um link para redefinir sua senha.', en: 'Enter your registered e-mail. We will send you a link to reset your password.', es: 'Ingrese su correo electrónico registrado. Le enviaremos un enlace para restablecer su contraseña.' },
    'reset.emailPlaceholder': { pt: 'Seu e-mail', en: 'Your e-mail', es: 'Su correo electrónico' },
    'reset.submit': { pt: 'Enviar link', en: 'Send link', es: 'Enviar enlace' },
    'reset.emailSent': { pt: 'Se o e-mail estiver cadastrado, você receberá um link de recuperação.', en: 'If the e-mail is registered, you will receive a recovery link.', es: 'Si el correo está registrado, recibirá un enlace de recuperación.' },
    'reset.googleOnly': { pt: 'Esta conta usa login Google. Use o botão "Entrar com Google".', en: 'This account uses Google login. Use the "Sign in with Google" button.', es: 'Esta cuenta usa inicio de sesión con Google. Use el botón "Iniciar sesión con Google".' },
    'reset.contactHint': { pt: 'Em caso de qualquer problema, entre em contato: <a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a>', en: 'If you have any issues, contact: <a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a>', es: 'Si tiene algún problema, contacte: <a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a>' },
    'reset.backToLogin': { pt: 'Voltar ao login', en: 'Back to login', es: 'Volver al login' },
    'auth.contactHint': { pt: 'Em caso de qualquer problema, entre em contato: <a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a>', en: 'If you have any issues, contact: <a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a>', es: 'Si tiene algún problema, contacte: <a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a>' },

    // ── Profile (Quem Somos) ──
    'profile.title': { pt: 'Meu perfil', en: 'My profile', es: 'Mi perfil' },
    'profile.clickHintTooltip': { pt: 'Clique aqui para abrir seu perfil', en: 'Click here to open your profile', es: 'Haga clic aquí para abrir su perfil' },
    'profile.subtitleMember': { pt: 'Estas informações aparecem na seção "Quem Somos" do site.', en: 'This information appears in the "About Us" section of the site.', es: 'Esta información aparece en la sección "Quiénes Somos" del sitio.' },
    'profile.subtitleContributor': { pt: 'Crie 1+ polígono de leucena para aparecer no nosso site como colaborador(a) da leucaena.earth!', en: 'Create 1+ leucaena polygon to be featured on our site as a leucaena.earth collaborator!', es: '¡Cree 1+ polígono de leucena para aparecer en nuestro sitio como colaborador(a) de leucaena.earth!' },
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
    'profile.email': { pt: 'E-mail', en: 'Email', es: 'Correo electrónico' },
    'profile.emailPlaceholder': { pt: 'seu@email.com', en: 'your@email.com', es: 'su@correo.com' },
    'profile.fullNamePlaceholder': { pt: 'Seu nome completo', en: 'Your full name', es: 'Su nombre completo' },
    'about.equipe': { pt: 'Membros', en: 'Members', es: 'Miembros' },
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
    'toast.validityRestricted': { pt: 'Apenas membros podem alterar a validade de pontos', en: 'Only members can change point validity', es: 'Solo los miembros pueden cambiar la validez de puntos' },
    'toast.markedInvalid': { pt: 'Ponto marcado como inválido', en: 'Point marked as invalid', es: 'Punto marcado como inválido' },
    'toast.markedValid': { pt: 'Ponto marcado como válido', en: 'Point marked as valid', es: 'Punto marcado como válido' },
    'toast.markedDoubt': { pt: 'Ponto marcado como incerto', en: 'Point marked as uncertain', es: 'Punto marcado como incierto' },
    'toast.panWarning': { pt: 'Você está se afastando da célula em edição. Clique em "Desbloquear" para parar de editar.', en: 'You are moving away from the editing cell. Click "Unlock" to stop editing.', es: 'Se está alejando de la celda en edición. Haga clic en "Desbloquear" para dejar de editar.' },
    'toast.zoomMinEdit': { pt: 'Zoom mínimo durante edição. Desbloqueie a célula para navegar livremente.', en: 'Minimum zoom while editing. Unlock the cell to navigate freely.', es: 'Zoom mínimo durante edición. Desbloquee la celda para navegar libremente.' },

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
    'toast.contributorNoDelete': { pt: 'Colaboradores não podem deletar polígonos', en: 'Contributors cannot delete polygons', es: 'Colaboradores no pueden eliminar polígonos' },
    'export.masksDisclaimer': { pt: 'Os pontos de ocorrência e os polígonos de leucena ainda estão em fase de validação e não estão disponíveis para download no momento. Esses dados estarão abertos ao público a partir do segundo semestre de 2026, quando o processo de validação será concluído.', en: 'Occurrence points and leucaena polygons are still undergoing validation and are not available for download at this time. This data will be publicly available starting in the second semester of 2026, once the validation process is complete.', es: 'Los puntos de ocurrencia y los polígonos de leucena aún están en fase de validación y no están disponibles para descarga en este momento. Estos datos estarán abiertos al público a partir del segundo semestre de 2026, cuando se complete el proceso de validación.' },
    'toolSwitch.title': { pt: '⚠️ Polígono em andamento', en: '⚠️ Polygon in progress', es: '⚠️ Polígono en progreso' },
    'toolSwitch.message': { pt: 'Você tem um polígono sendo desenhado. O que deseja fazer?', en: 'You have a polygon being drawn. What would you like to do?', es: 'Tiene un polígono en proceso de dibujo. ¿Qué desea hacer?' },
    'toolSwitch.cancelDraw': { pt: 'Cancelar polígono e trocar ferramenta', en: 'Cancel polygon and switch tool', es: 'Cancelar polígono y cambiar herramienta' },
    'toolSwitch.finishDraw': { pt: 'Finalizar polígono e trocar ferramenta', en: 'Finish polygon and switch tool', es: 'Finalizar polígono y cambiar herramienta' },
    'toolSwitch.continue': { pt: 'Cancelar', en: 'Cancel', es: 'Cancelar' },
    'deleteWarn.title': { pt: '⚠️ Atenção', en: '⚠️ Warning', es: '⚠️ Atención' },
    'deleteWarn.message': { pt: 'Você está prestes a excluir polígonos. Clique em um polígono no mapa para removê-lo permanentemente.', en: 'You are about to delete polygons. Click a polygon on the map to permanently remove it.', es: 'Está a punto de eliminar polígonos. Haga clic en un polígono en el mapa para eliminarlo permanentemente.' },
    'deleteWarn.ok': { pt: 'Entendi, continuar', en: 'I understand, continue', es: 'Entendido, continuar' },
    'deleteWarn.cancel': { pt: 'Cancelar', en: 'Cancel', es: 'Cancelar' },
    'toast.holeSelectMask': { pt: 'Clique em um polígono para criar um buraco', en: 'Click a polygon to create a hole', es: 'Haga clic en un polígono para crear un agujero' },
    'toast.holeDrawNow': { pt: 'Desenhe o buraco dentro do polígono selecionado', en: 'Draw the hole inside the selected polygon', es: 'Dibuje el agujero dentro del polígono seleccionado' },
    'toast.holeCreated': { pt: 'Buraco criado no polígono', en: 'Hole created in polygon', es: 'Agujero creado en el polígono' },
    'toast.holeOutsidePoly': { pt: 'O buraco deve estar dentro do polígono', en: 'Hole must be inside the polygon', es: 'El agujero debe estar dentro del polígono' },
    'toast.holeInsideHole': { pt: 'Não é possível criar um buraco dentro de outro buraco', en: 'Cannot create a hole inside another hole', es: 'No se puede crear un agujero dentro de otro agujero' },
    'toast.lockCellToDelete': { pt: 'Bloqueie a célula para excluir seus polígonos', en: 'Lock the cell to delete its polygons', es: 'Bloquee la celda para eliminar sus polígonos' },
    'toast.polyDeleted': { pt: 'Polígono excluído', en: 'Polygon deleted', es: 'Polígono eliminado' },
    'toast.polyDeleteFail': { pt: 'Falha ao excluir polígono', en: 'Failed to delete polygon', es: 'Error al eliminar polígono' },
    'toast.polyRestored': { pt: 'Polígono restaurado (Ctrl+Z)', en: 'Polygon restored (Ctrl+Z)', es: 'Polígono restaurado (Ctrl+Z)' },
    'toast.polyRestoreFail': { pt: 'Falha ao restaurar polígono', en: 'Failed to restore polygon', es: 'Error al restaurar polígono' },
    'toast.drawCancelled': { pt: 'Desenho cancelado', en: 'Drawing cancelled', es: 'Dibujo cancelado' },

    // ── Tool hint badges ──
    'badge.draw': { pt: 'V = vértice · Clique direito ou Enter = finalizar · Ctrl+Z = desfazer', en: 'V = vertex · Right-click or Enter = finish · Ctrl+Z = undo', es: 'V = vértice · Clic derecho o Enter = finalizar · Ctrl+Z = deshacer' },
    'badge.drawTouch': { pt: 'Toque no mapa para adicionar vértices', en: 'Tap on the map to add vertices', es: 'Toque en el mapa para añadir vértices' },
    'badge.delete': { pt: 'Clique em um polígono para selecioná-lo', en: 'Click a polygon to select it', es: 'Haga clic en un polígono para seleccionarlo' },
    'badge.deleteConfirm': { pt: 'Aperte Delete para excluir · Esc para cancelar · Ctrl+Z = restaurar', en: 'Press Delete to remove · Esc to cancel · Ctrl+Z = restore', es: 'Presione Delete para eliminar · Esc para cancelar · Ctrl+Z = restaurar' },
    'badge.deleteConfirmTouch': { pt: 'Polígono selecionado', en: 'Polygon selected', es: 'Polígono seleccionado' },
    'badge.deleteBtn': { pt: 'Excluir', en: 'Delete', es: 'Eliminar' },
    'badge.cancelBtn': { pt: 'Cancelar', en: 'Cancel', es: 'Cancelar' },
    'badge.edit': { pt: 'Ctrl+Z = desfazer edição', en: 'Ctrl+Z = undo edit', es: 'Ctrl+Z = deshacer edición' },
    'badge.editTouch': { pt: 'Arraste os vértices para editar', en: 'Drag vertices to edit', es: 'Arrastre los vértices para editar' },
    'badge.pointSelected': { pt: 'Clique com o botão direito para mudar de status', en: 'Right-click to change status', es: 'Clic derecho para cambiar estado' },

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
    'point.titleDoubt': { pt: 'Ponto #{0} (incerto)', en: 'Point #{0} (uncertain)', es: 'Punto #{0} (incierto)' },

    // ── Ranking ──
    'ranking.title': { pt: 'Ranking de Colaboradores', en: 'Collaborators Ranking', es: 'Ranking de Colaboradores' },
    'ranking.position': { pt: 'Você está em {0}º lugar de {1} colaboradores', en: 'You are in {0}th place out of {1} collaborators', es: 'Estás en {0}º lugar de {1} colaboradores' },
    'ranking.stats': { pt: '{0} polígonos · {1} ha mapeados', en: '{0} polygons · {1} ha mapped', es: '{0} polígonos · {1} ha mapeados' },
    'ranking.widgetPosition': { pt: 'Ranking: {0}º de {1}', en: 'Ranking: {0}th of {1}', es: 'Ranking: {0}º de {1}' },
    'ranking.widgetZero': { pt: 'Comece a mapear! Veja como', en: 'Start mapping! See how', es: '¡Empieza a mapear! Mira cómo' },
    'ranking.widgetPublic': { pt: 'Ranking colaboradores', en: 'Collaborator ranking', es: 'Ranking colaboradores' },
    'ranking.zeroMasksMsg': { pt: 'Você ainda não mapeou nenhuma área. Comece agora!', en: "You haven't mapped any area yet. Start now!", es: '¡Aún no has mapeado ningún área. Empieza ahora!' },
    'ranking.howToMap': { pt: 'Como mapear', en: 'How to map', es: 'Cómo mapear' },
    'ranking.chooseCell': { pt: 'Escolher célula', en: 'Choose cell', es: 'Elegir celda' },
    'ranking.maskCount': { pt: '{0} polígonos', en: '{0} polygons', es: '{0} polígonos' },
    'ranking.area': { pt: '{0} ha', en: '{0} ha', es: '{0} ha' },
    'ranking.medalTooltip': { pt: '{0}º lugar no mapeamento de polígonos de leucaena', en: '{0}th place in leucaena polygon mapping', es: '{0}º lugar en el mapeo de polígonos de leucaena' },
    'ranking.firstMaskTitle': { pt: 'Primeiro polígono!', en: 'First polygon!', es: '¡Primer polígono!' },
    'ranking.firstMaskMsg': { pt: 'Parabéns! Você acabou de criar seu primeiro polígono de leucena. Continue mapeando para subir no ranking!', en: 'Congratulations! You just created your first leucaena polygon. Keep mapping to climb the ranking!', es: '¡Felicidades! Acabas de crear tu primer polígono de leucena. ¡Sigue mapeando para subir en el ranking!' },
    'ranking.rankUpTitle': { pt: 'Subiu no ranking!', en: 'Rank up!', es: '¡Subiste en el ranking!' },
    'ranking.rankUpMsg': { pt: 'Você subiu para o {0}º lugar no ranking de colaboradores!', en: 'You moved up to {0}th place in the collaborators ranking!', es: '¡Subiste al {0}º lugar en el ranking de colaboradores!' }
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
    const prev = currentLang;
    currentLang = lang;
    localStorage.setItem('leucena_lang', lang);
    if (prev !== lang && typeof LeucenaApp !== 'undefined' && LeucenaApp.logEvent) {
      LeucenaApp.logEvent('lang_change', null, null, { from: prev, to: lang });
    }
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

    if (typeof LeucenaMap !== 'undefined' && LeucenaMap.refreshLabelToggleTitleForLang) {
      LeucenaMap.refreshLabelToggleTitleForLang();
    }

    if (typeof LeucenaApp !== 'undefined' && LeucenaApp.refreshLegendToggleTitleForLang) {
      LeucenaApp.refreshLegendToggleTitleForLang();
    }

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

  var ICO = {
    draw: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/></svg>',
    edit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    del: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
    hole: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="2 2 22 2 22 22 2 22"/><polygon points="7 7 17 7 17 17 7 17" stroke-dasharray="3 2"/></svg>',
    sel: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>',
    unlock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>',
    sv: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><line x1="2" y1="12" x2="22" y2="12"/></svg>',
    home: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    lock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
  };

  function btn(icon, label, special) {
    return '<span class="guide-btn-ref' + (special ? ' guide-btn-special' : '') + '">' + icon + ' ' + label + '</span>';
  }

  function step(num, title, body) {
    return '<div class="guide-step-card"><h3><span class="guide-step-num">' + num + '</span>' + title + '</h3>' + body + '</div>';
  }

  function getHowtoContentPT() {
    return '<h2>Como fazer o mapeamento</h2>' +
    '<div class="guide-objective"><strong>Objetivo:</strong> Criar polígonos ao redor de <strong>aglomerados de leucena</strong> (áreas onde há duas ou mais leucenas juntas) visíveis na imagem de satélite. Cada ponto verde no mapa representa uma ocorrência registrada — sua tarefa é desenhar polígonos que cubram esses pontos e a área de leucena ao redor deles.</div>' +

    '<div class="guide-video"><h3>📺 Vídeo tutorial</h3><p>Assista ao vídeo abaixo para ver o passo a passo completo do mapeamento:</p><div class="guide-video-wrapper"><iframe src="https://www.youtube.com/embed/S7NCnasL1oQ" title="Como mapear no leucaena.earth" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div>' +

    step(1, 'Crie sua conta', '<p>No canto superior direito, clique em <strong>"Entrar"</strong>. Você pode usar sua <strong>conta Google</strong> ou criar uma conta com <strong>nome de usuário e senha</strong>.</p>') +

    step(2, 'Entenda o mapa', '<p>O mapa está dividido em <strong>células (quadrados)</strong>. Cada célula tem um status indicado pela cor:</p>' +
      '<ul>' +
      '<li><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#7c3aed;vertical-align:middle;margin-right:6px"></span><strong>Roxo</strong> — Ainda não finalizado (priorize estas!)</li>' +
      '<li><span style="display:inline-block;width:12px;height:12px;border-radius:2px;border:2px solid #eab308;vertical-align:middle;margin-right:6px"></span><strong>Amarelo (vazado)</strong> — Em uso por outro colaborador</li>' +
      '<li><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#FFFF59;vertical-align:middle;margin-right:6px"></span><strong>Amarelo</strong> — Mapeando (possui polígonos, mas não finalizado)</li>' +
      '<li><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#d4d4d8;vertical-align:middle;margin-right:6px"></span><strong>Cinza</strong> — Sem pontos de ocorrência</li>' +
      '<li><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#22c55e;vertical-align:middle;margin-right:6px"></span><strong>Verde</strong> — Finalizado</li>' +
      '</ul>' +
      '<p>Clique em qualquer célula para ver seu status e informações na barra lateral.</p>') +

    step(3, 'Bloqueie a célula', '<p>Clique no botão ' + btn(ICO.lock, 'Bloquear e Editar') + ' na barra lateral. A célula ficará reservada para você e as ferramentas de edição aparecerão.</p>' +
      '<div class="guide-warning"><strong>Importante:</strong> Enquanto a célula estiver bloqueada, nenhum outro usuário pode editá-la. Lembre-se de desbloquear quando terminar!</div>') +

    step(4, 'Desenhe os polígonos', '<p>Localize os <strong>aglomerados de leucena</strong> na imagem de satélite (áreas onde há duas ou mais leucenas juntas) e use o botão:</p>' +
      '<p>' + btn(ICO.draw, 'Desenhar') + ' — Clique no mapa para criar os vértices do polígono. Cada clique adiciona um ponto. Para <strong>fechar o polígono</strong>, clique no primeiro ponto (ele ficará destacado) ou dê um <strong>duplo-clique</strong>.</p>' +
      '<ul>' +
      '<li>Mínimo de <strong>3 vértices</strong> para formar um polígono.</li>' +
      '<li>O polígono deve <strong>cobrir toda a área de leucena</strong> visível, incluindo os pontos de ocorrência próximos.</li>' +
      '<li>Priorize <strong>aglomerados</strong> — áreas com várias árvores juntas.</li>' +
      '</ul>') +

    step(5, 'Edite os polígonos', '<p>Precisa ajustar um polígono que já desenhou? Use:</p>' +
      '<p>' + btn(ICO.edit, 'Editar') + ' — Clique no polígono e arraste os vértices (pontos brancos) para reposicioná-los. Você também pode arrastar o ponto médio entre dois vértices para criar um novo vértice.</p>') +

    step(6, 'Crie buracos nos polígonos', '<p>Se dentro de um polígono grande houver uma área <strong>sem leucena</strong> (por exemplo, um prédio ou estrada), use:</p>' +
      '<p>' + btn(ICO.hole, 'Criar buraco', true) + ' — Primeiro clique no polígono-alvo (ele ficará destacado com borda laranja). Em seguida, desenhe o contorno da área interna que <strong>não</strong> é leucena. Esse recorte será excluído do polígono.</p>') +

    step(7, 'Exclua polígonos', '<p>Desenhou um polígono errado? Use:</p>' +
      '<p>' + btn(ICO.del, 'Excluir') + ' — Clique no polígono que deseja remover. Uma confirmação será exibida antes da exclusão.</p>' +
      '<div class="guide-warning"><strong>Nota:</strong> Você só pode excluir polígonos que <strong>você mesmo</strong> desenhou.</div>') +

    step(8, 'Use o Street View', '<p>Na dúvida se a vegetação é leucena? Use:</p>' +
      '<p>' + btn(ICO.sv, 'Street View') + ' — Clique no botão na barra inferior e depois clique em qualquer ponto do mapa. Uma janela do Google Street View abrirá no local, permitindo que você confirme visualmente a espécie. Procure pelas características: folhas bipinadas, flores brancas esféricas e vagens.</p>') +

    step(9, 'Desbloqueie a célula', '<p>Quando terminar o trabalho na célula, clique no botão:</p>' +
      '<p>' + btn(ICO.unlock, 'Desbloquear') + ' na barra inferior. Um modal aparecerá com duas opções:</p>' +
      '<ul>' +
      '<li>' + btn(ICO.check, 'Finalizado') + ' — Marque se <strong>todos</strong> os pontos de ocorrência válidos estiverem cobertos por polígonos. O sistema verificará automaticamente.</li>' +
      '<li>' + btn('', 'Ainda não finalizado') + ' — Use se você ainda precisa voltar depois, ou se não conseguiu cobrir todos os pontos.</li>' +
      '</ul>') +

    '<div class="guide-tip"><strong>Dicas úteis:</strong>' +
    '<ul style="margin-top:6px">' +
    '<li>Use o botão ' + btn(ICO.home, 'Home') + ' para recentrar na célula ou voltar à visão geral.</li>' +
    '<li>Alterne entre <strong>Satélite</strong> e <strong>Mapa</strong> para melhor visualização das copas das árvores.</li>' +
    '<li>Use <strong>Ctrl+Z</strong> para desfazer a última ação (ao adicionar ou remover pontos).</li>' +
    '<li>Use o <strong>zoom</strong> para ver detalhes das copas — leucenas têm copas arredondadas com tom verde-claro.</li>' +
    '</ul></div>';
  }

  function getHowtoContentEN() {
    return '<h2>How to Map</h2>' +
    '<div class="guide-objective"><strong>Objective:</strong> Create polygons around <strong>leucaena clusters</strong> (areas where two or more leucaena trees grow together) visible in the satellite imagery. Each green dot on the map represents a recorded occurrence — your task is to draw polygons covering these points and the leucaena area around them.</div>' +

    '<div class="guide-video"><h3>📺 Video tutorial</h3><p>Watch the video below for a complete step-by-step mapping walkthrough:</p><div class="guide-video-wrapper"><iframe src="https://www.youtube.com/embed/S7NCnasL1oQ" title="How to map on leucaena.earth" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div>' +

    step(1, 'Create your account', '<p>In the upper right corner, click <strong>"Sign In"</strong>. You can use your <strong>Google account</strong> or create an account with a <strong>username and password</strong>.</p>') +

    step(2, 'Understand the map', '<p>The map is divided into <strong>cells (squares)</strong>. Each cell has a status indicated by its color:</p>' +
      '<ul>' +
      '<li><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#7c3aed;vertical-align:middle;margin-right:6px"></span><strong>Purple</strong> — Not yet finished (prioritize these!)</li>' +
      '<li><span style="display:inline-block;width:12px;height:12px;border-radius:2px;border:2px solid #eab308;vertical-align:middle;margin-right:6px"></span><strong>Yellow (hollow)</strong> — In use by another collaborator</li>' +
      '<li><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#FFFF59;vertical-align:middle;margin-right:6px"></span><strong>Yellow</strong> — Mapping (has polygons but not finished)</li>' +
      '<li><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#d4d4d8;vertical-align:middle;margin-right:6px"></span><strong>Gray</strong> — No occurrence points</li>' +
      '<li><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#22c55e;vertical-align:middle;margin-right:6px"></span><strong>Green</strong> — Finished</li>' +
      '</ul>' +
      '<p>Click any cell to view its status and information in the sidebar.</p>') +

    step(3, 'Lock the cell', '<p>Click the ' + btn(ICO.lock, 'Lock & Edit') + ' button in the sidebar. The cell will be reserved for you and the editing tools will appear.</p>' +
      '<div class="guide-warning"><strong>Important:</strong> While the cell is locked, no other user can edit it. Remember to unlock when you\'re done!</div>') +

    step(4, 'Draw the polygons', '<p>Locate <strong>leucaena clusters</strong> in the satellite imagery (areas where two or more leucaena trees grow together) and use the button:</p>' +
      '<p>' + btn(ICO.draw, 'Draw') + ' — Click on the map to create polygon vertices. Each click adds a point. To <strong>close the polygon</strong>, click on the first point (it will be highlighted) or <strong>double-click</strong>.</p>' +
      '<ul>' +
      '<li>Minimum of <strong>3 vertices</strong> to form a polygon.</li>' +
      '<li>The polygon should <strong>cover the entire leucaena area</strong> visible, including nearby occurrence points.</li>' +
      '<li>Prioritize <strong>clusters</strong> — areas with multiple trees grouped together.</li>' +
      '</ul>') +

    step(5, 'Edit the polygons', '<p>Need to adjust a polygon you already drew? Use:</p>' +
      '<p>' + btn(ICO.edit, 'Edit') + ' — Click the polygon and drag the vertices (white dots) to reposition them. You can also drag the midpoint between two vertices to create a new one.</p>') +

    step(6, 'Create holes in polygons', '<p>If inside a large polygon there is an area <strong>without leucaena</strong> (for example, a building or road), use:</p>' +
      '<p>' + btn(ICO.hole, 'Create hole', true) + ' — First click the target polygon (it will be highlighted with an orange border). Then draw the outline of the internal area that is <strong>not</strong> leucaena. This cutout will be excluded from the polygon.</p>') +

    step(7, 'Delete polygons', '<p>Drew a polygon by mistake? Use:</p>' +
      '<p>' + btn(ICO.del, 'Delete') + ' — Click the polygon you want to remove. A confirmation will be shown before deletion.</p>' +
      '<div class="guide-warning"><strong>Note:</strong> You can only delete polygons that <strong>you</strong> drew.</div>') +

    step(8, 'Use Street View', '<p>Not sure if the vegetation is leucaena? Use:</p>' +
      '<p>' + btn(ICO.sv, 'Street View') + ' — Click the button in the bottom toolbar, then click anywhere on the map. A Google Street View window will open at that location, allowing you to visually confirm the species. Look for: bipinnate leaves, white spherical flowers, and seed pods.</p>') +

    step(9, 'Unlock the cell', '<p>When you\'re done working on the cell, click:</p>' +
      '<p>' + btn(ICO.unlock, 'Unlock') + ' in the bottom toolbar. A modal will appear with two options:</p>' +
      '<ul>' +
      '<li>' + btn(ICO.check, 'Finished') + ' — Select if <strong>all</strong> valid occurrence points are covered by polygons. The system will verify automatically.</li>' +
      '<li>' + btn('', 'Not yet finished') + ' — Use if you still need to come back later, or couldn\'t cover all points.</li>' +
      '</ul>') +

    '<div class="guide-tip"><strong>Useful tips:</strong>' +
    '<ul style="margin-top:6px">' +
    '<li>Use the ' + btn(ICO.home, 'Home') + ' button to re-center on the cell or return to the overview.</li>' +
    '<li>Switch between <strong>Satellite</strong> and <strong>Map</strong> views for better tree canopy visualization.</li>' +
    '<li>Use <strong>Ctrl+Z</strong> to undo the last action (when adding or removing points).</li>' +
    '<li>Use <strong>zoom</strong> to see canopy details — leucaena has rounded canopies with a light-green tone.</li>' +
    '</ul></div>';
  }

  function getHowtoContentES() {
    return '<h2>Cómo mapear</h2>' +
    '<div class="guide-objective"><strong>Objetivo:</strong> Crear polígonos alrededor de <strong>aglomerados de leucaena</strong> (áreas donde hay dos o más leucaenas juntas) visibles en la imagen satelital. Cada punto verde en el mapa representa una ocurrencia registrada — su tarea es dibujar polígonos que cubran estos puntos y el área de leucaena a su alrededor.</div>' +

    '<div class="guide-video"><h3>📺 Video tutorial</h3><p>Mire el video a continuación para ver el paso a paso completo del mapeo:</p><div class="guide-video-wrapper"><iframe src="https://www.youtube.com/embed/S7NCnasL1oQ" title="Cómo mapear en leucaena.earth" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div>' +

    step(1, 'Cree su cuenta', '<p>En la esquina superior derecha, haga clic en <strong>"Iniciar Sesión"</strong>. Puede usar su <strong>cuenta de Google</strong> o crear una cuenta con <strong>nombre de usuario y contraseña</strong>.</p>') +

    step(2, 'Entienda el mapa', '<p>El mapa está dividido en <strong>celdas (cuadrados)</strong>. Cada celda tiene un estado indicado por su color:</p>' +
      '<ul>' +
      '<li><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#7c3aed;vertical-align:middle;margin-right:6px"></span><strong>Púrpura</strong> — Aún no finalizado (¡priorice estas!)</li>' +
      '<li><span style="display:inline-block;width:12px;height:12px;border-radius:2px;border:2px solid #eab308;vertical-align:middle;margin-right:6px"></span><strong>Amarillo (hueco)</strong> — En uso por otro colaborador</li>' +
      '<li><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#FFFF59;vertical-align:middle;margin-right:6px"></span><strong>Amarillo</strong> — Mapeando (tiene polígonos pero no finalizado)</li>' +
      '<li><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#d4d4d8;vertical-align:middle;margin-right:6px"></span><strong>Gris</strong> — Sin puntos de ocurrencia</li>' +
      '<li><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#22c55e;vertical-align:middle;margin-right:6px"></span><strong>Verde</strong> — Finalizado</li>' +
      '</ul>' +
      '<p>Haga clic en cualquier celda para ver su estado e información en la barra lateral.</p>') +

    step(3, 'Bloquee la celda', '<p>Haga clic en el botón ' + btn(ICO.lock, 'Bloquear y Editar') + ' en la barra lateral. La celda quedará reservada para usted y las herramientas de edición aparecerán.</p>' +
      '<div class="guide-warning"><strong>Importante:</strong> Mientras la celda esté bloqueada, ningún otro usuario puede editarla. ¡Recuerde desbloquear cuando termine!</div>') +

    step(4, 'Dibuje los polígonos', '<p>Localice los <strong>aglomerados de leucaena</strong> en la imagen satelital (áreas donde hay dos o más leucaenas juntas) y use el botón:</p>' +
      '<p>' + btn(ICO.draw, 'Dibujar') + ' — Haga clic en el mapa para crear los vértices del polígono. Cada clic agrega un punto. Para <strong>cerrar el polígono</strong>, haga clic en el primer punto (estará resaltado) o haga <strong>doble clic</strong>.</p>' +
      '<ul>' +
      '<li>Mínimo de <strong>3 vértices</strong> para formar un polígono.</li>' +
      '<li>El polígono debe <strong>cubrir toda el área de leucaena</strong> visible, incluyendo los puntos de ocurrencia cercanos.</li>' +
      '<li>Priorice <strong>aglomerados</strong> — áreas con varios árboles juntos.</li>' +
      '</ul>') +

    step(5, 'Edite los polígonos', '<p>¿Necesita ajustar un polígono ya dibujado? Use:</p>' +
      '<p>' + btn(ICO.edit, 'Editar') + ' — Haga clic en el polígono y arrastre los vértices (puntos blancos) para reposicionarlos. También puede arrastrar el punto medio entre dos vértices para crear uno nuevo.</p>') +

    step(6, 'Cree agujeros en los polígonos', '<p>Si dentro de un polígono grande hay un área <strong>sin leucaena</strong> (por ejemplo, un edificio o carretera), use:</p>' +
      '<p>' + btn(ICO.hole, 'Crear agujero', true) + ' — Primero haga clic en el polígono objetivo (se resaltará con borde naranja). Luego dibuje el contorno del área interna que <strong>no</strong> es leucaena. Este recorte será excluido del polígono.</p>') +

    step(7, 'Elimine polígonos', '<p>¿Dibujó un polígono por error? Use:</p>' +
      '<p>' + btn(ICO.del, 'Eliminar') + ' — Haga clic en el polígono que desea eliminar. Se mostrará una confirmación antes de la eliminación.</p>' +
      '<div class="guide-warning"><strong>Nota:</strong> Solo puede eliminar polígonos que <strong>usted mismo</strong> dibujó.</div>') +

    step(8, 'Use Street View', '<p>¿No está seguro si la vegetación es leucaena? Use:</p>' +
      '<p>' + btn(ICO.sv, 'Street View') + ' — Haga clic en el botón en la barra inferior y luego haga clic en cualquier punto del mapa. Se abrirá una ventana de Google Street View en esa ubicación, permitiéndole confirmar visualmente la especie. Busque: hojas bipinnadas, flores blancas esféricas y vainas.</p>') +

    step(9, 'Desbloquee la celda', '<p>Cuando termine el trabajo en la celda, haga clic en:</p>' +
      '<p>' + btn(ICO.unlock, 'Desbloquear') + ' en la barra inferior. Aparecerá un modal con dos opciones:</p>' +
      '<ul>' +
      '<li>' + btn(ICO.check, 'Finalizado') + ' — Seleccione si <strong>todos</strong> los puntos de ocurrencia válidos están cubiertos por polígonos. El sistema verificará automáticamente.</li>' +
      '<li>' + btn('', 'Aún no finalizado') + ' — Use si necesita volver después, o no pudo cubrir todos los puntos.</li>' +
      '</ul>') +

    '<div class="guide-tip"><strong>Consejos útiles:</strong>' +
    '<ul style="margin-top:6px">' +
    '<li>Use el botón ' + btn(ICO.home, 'Inicio') + ' para recentrar en la celda o volver a la vista general.</li>' +
    '<li>Alterne entre <strong>Satélite</strong> y <strong>Mapa</strong> para mejor visualización de las copas.</li>' +
    '<li>Use <strong>Ctrl+Z</strong> para deshacer la última acción (al agregar o eliminar puntos).</li>' +
    '<li>Use el <strong>zoom</strong> para ver detalles de las copas — la leucaena tiene copas redondeadas con tono verde claro.</li>' +
    '</ul></div>';
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
    return `<h2>Documentação</h2>
<p><strong>Estamos construindo um trabalho coletivo</strong> que integra <strong>IA</strong>, <strong>sensoriamento remoto</strong> e <strong>mapeamento colaborativo</strong> para mapear <em>Leucaena leucocephala</em> e estimar a biomassa associada.</p>
<p>A iniciativa está vinculada à pesquisa desenvolvida na <strong>ESALQ/USP</strong>, sob orientação do <strong>Prof. Dr. Matheus Pinheiro Ferreira</strong>, com financiamento da <strong>FAPESP</strong> e vinculada ao projeto <em>“Tecnologia LiDAR para Monitoramento Florestal em São Paulo: Apoio a Políticas Públicas de Mitigação das Mudanças Climáticas”</em> (processo nº <strong>24/15211-1</strong>) e ao <strong>CCARBON/USP</strong> – Center for Carbon Research in Tropical Agriculture.</p>
<p>Atualmente, nossos esforços estão concentrados no estado de <strong>São Paulo</strong>, onde estamos estruturando a base de dados e os métodos. Ao mesmo tempo, a plataforma está sendo desenvolvida de forma <strong>aberta</strong> e <strong>escalável</strong>, permitindo sua aplicação em outras regiões e contextos no futuro.</p>
<p>Se você se interessa por espécies invasoras, geotecnologias ou carbono, vale muito a pena dar uma olhada em <a href="https://leucaena.earth" target="_blank" rel="noopener noreferrer">leucaena.earth</a>.</p>

<h3>Título do Projeto</h3><p><em>Revelando a distribuição espacial e a biomassa aérea de <strong>Leucaena leucocephala</strong> no Estado de São Paulo usando sensoriamento remoto e inteligência artificial</em></p><h3>Pesquisador</h3><p>Matheus Siqueira Barros</p><h3>Orientador</h3><p>Prof. Dr. Matheus Pinheiro Ferreira</p><h3>Descrição do Projeto</h3><p>Esta pesquisa investiga a distribuição espacial e a biomassa aérea da espécie invasora <em>Leucaena leucocephala</em> em todo o estado de São Paulo, Brasil. O projeto combina imagens ópticas de altíssima resolução espacial (25 cm de GSD) e dados LiDAR com técnicas de inteligência artificial para detectar áreas dominadas por essa espécie e estimar sua biomassa.</p><p>O projeto desenvolve métodos de aprendizado profundo, especialmente redes neurais convolucionais (CNNs), para realizar a fusão de dados LiDAR e ópticos e mapear áreas dominadas por <em>Leucaena</em> em escala estadual.</p><h3>Objetivo da Plataforma</h3><p>Esta plataforma foi desenvolvida para apoiar a pesquisa permitindo:</p><ul><li>Mapeamento colaborativo de manchas de <em>Leucaena leucocephala</em></li><li>Digitalização de polígonos da copa por colaboradores</li><li>Validação entre pontos e polígonos mapeados</li><li>Rastreamento das contribuições de cada participante</li><li>Exportação dos dados mapeados para análises posteriores</li></ul><h3>Equipe do projeto</h3><p>Judith Zuleika Bertolucci Alves<br>Rafael Perin Menassi</p><h3>Contato</h3><p>Matheus Siqueira Barros<br><a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a></p><h3>Local</h3><p>Piracicaba – São Paulo – Brasil<br>${month} de ${year}</p>

<div class="docs-logos">
  <div class="docs-logos-section">
    <div class="docs-logos-title">Financiamento</div>
    <div class="docs-logos-grid">
      <a class="docs-logo-card docs-logo-img" href="https://fapesp.br/" target="_blank" rel="noopener noreferrer"><img src="/img/sponsors/fapesp.png" alt="FAPESP"></a>
    </div>
  </div>
  <div class="docs-logos-section">
    <div class="docs-logos-title">Realização</div>
    <div class="docs-logos-grid">
      <a class="docs-logo-card docs-logo-img" href="http://esalq.usp.br/" target="_blank" rel="noopener noreferrer"><img src="/img/partners/esalq-usp.jpg" alt="ESALQ/USP"></a>
      <a class="docs-logo-card docs-logo-img" href="https://ccarbon.usp.br/" target="_blank" rel="noopener noreferrer"><img src="/img/partners/ccarbon.jpg" alt="CCARBON/USP"></a>
    </div>
  </div>
  <div class="docs-logos-section">
    <div class="docs-logos-title">Parceiros</div>
    <div class="docs-logos-grid">
      <a class="docs-logo-card docs-logo-img" href="https://www.igc.sp.gov.br/" target="_blank" rel="noopener noreferrer"><img src="/img/partners/IGC.jpg" alt="IGC"></a>
      <a class="docs-logo-card docs-logo-img" href="https://www.instagram.com/florestal_brasil/" target="_blank" rel="noopener noreferrer"><img src="/img/partners/florestal-brasil.jpg" alt="Florestal Brasil"></a>
      <a class="docs-logo-card docs-logo-img" href="https://www.instagram.com/identplantas/" target="_blank" rel="noopener noreferrer"><img src="/img/partners/identplantas.jpg" alt="Identplantas"></a>
      <a class="docs-logo-card docs-logo-img" href="https://www.cepegeo.ufscar.br/" target="_blank" rel="noopener noreferrer"><img src="/img/partners/cepe-geo.jpg" alt="CePE-Geo"></a>
    </div>
  </div>
</div>`;
  }

  function getDocsEN(month, year) {
    return `<h2>Documentation</h2>
<p><strong>We are building a collective effort</strong> integrating <strong>AI</strong>, <strong>remote sensing</strong>, and <strong>collaborative mapping</strong> to map <em>Leucaena leucocephala</em> and estimate associated biomass.</p>
<p>This initiative is linked to research at <strong>ESALQ/USP</strong>, supervised by <strong>Prof. Dr. Matheus Pinheiro Ferreira</strong>, funded by <strong>FAPESP</strong> and connected to the project <em>“LiDAR Technology for Forest Monitoring in São Paulo: Support for Public Policies to Mitigate Climate Change”</em> (grant process no. <strong>24/15211-1</strong>) and to <strong>CCARBON/USP</strong> – Center for Carbon Research in Tropical Agriculture.</p>
<p>Our current efforts focus on the state of <strong>São Paulo</strong>, where we are structuring the database and methods. At the same time, the platform is being developed in an <strong>open</strong> and <strong>scalable</strong> way, allowing future application in other regions and contexts.</p>
<p>If you are interested in invasive species, geotechnologies, or carbon, take a look at <a href="https://leucaena.earth" target="_blank" rel="noopener noreferrer">leucaena.earth</a>.</p>

<h3>Project Title</h3><p><em>Revealing the spatial distribution and aboveground biomass of <strong>Leucaena leucocephala</strong> in the State of São Paulo using remote sensing and artificial intelligence</em></p><h3>Researcher</h3><p>Matheus Siqueira Barros</p><h3>Advisor</h3><p>Prof. Dr. Matheus Pinheiro Ferreira</p><h3>Project Description</h3><p>This research investigates the spatial distribution and aboveground biomass of the invasive species <em>Leucaena leucocephala</em> across the state of São Paulo, Brazil. The project combines very high spatial resolution optical imagery (25 cm GSD) and LiDAR data with artificial intelligence techniques to detect areas dominated by this species and estimate its biomass.</p><p>The project develops deep learning methods, especially convolutional neural networks (CNNs), to fuse LiDAR and optical data and map <em>Leucaena</em>-dominated areas at the state scale.</p><h3>Platform Objective</h3><p>This platform was developed to support the research by enabling:</p><ul><li>Collaborative mapping of <em>Leucaena leucocephala</em> patches</li><li>Canopy polygon digitization by contributors</li><li>Validation between mapped points and polygons</li><li>Tracking of each participant's contributions</li><li>Export of mapped data for further analysis</li></ul><h3>Project team</h3><p>Judith Zuleika Bertolucci Alves<br>Rafael Perin Menassi</p><h3>Contact</h3><p>Matheus Siqueira Barros<br><a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a></p><h3>Location</h3><p>Piracicaba – São Paulo – Brazil<br>${month} ${year}</p>

<div class="docs-logos">
  <div class="docs-logos-section">
    <div class="docs-logos-title">Funding</div>
    <div class="docs-logos-grid">
      <a class="docs-logo-card docs-logo-img" href="https://fapesp.br/" target="_blank" rel="noopener noreferrer"><img src="/img/sponsors/fapesp.png" alt="FAPESP"></a>
    </div>
  </div>
  <div class="docs-logos-section">
    <div class="docs-logos-title">Host institutions</div>
    <div class="docs-logos-grid">
      <a class="docs-logo-card docs-logo-img" href="http://esalq.usp.br/" target="_blank" rel="noopener noreferrer"><img src="/img/partners/esalq-usp.jpg" alt="ESALQ/USP"></a>
      <a class="docs-logo-card docs-logo-img" href="https://ccarbon.usp.br/" target="_blank" rel="noopener noreferrer"><img src="/img/partners/ccarbon.jpg" alt="CCARBON/USP"></a>
    </div>
  </div>
  <div class="docs-logos-section">
    <div class="docs-logos-title">Partners</div>
    <div class="docs-logos-grid">
      <a class="docs-logo-card docs-logo-img" href="https://www.igc.sp.gov.br/" target="_blank" rel="noopener noreferrer"><img src="/img/partners/IGC.jpg" alt="IGC"></a>
      <a class="docs-logo-card docs-logo-img" href="https://www.instagram.com/florestal_brasil/" target="_blank" rel="noopener noreferrer"><img src="/img/partners/florestal-brasil.jpg" alt="Florestal Brasil"></a>
      <a class="docs-logo-card docs-logo-img" href="https://www.instagram.com/identplantas/" target="_blank" rel="noopener noreferrer"><img src="/img/partners/identplantas.jpg" alt="Identplantas"></a>
      <a class="docs-logo-card docs-logo-img" href="https://www.cepegeo.ufscar.br/" target="_blank" rel="noopener noreferrer"><img src="/img/partners/cepe-geo.jpg" alt="CePE-Geo"></a>
    </div>
  </div>
</div>`;
  }

  function getDocsES(month, year) {
    return `<h2>Documentación</h2>
<p><strong>Estamos construyendo un esfuerzo colectivo</strong> que integra <strong>IA</strong>, <strong>teledetección</strong> y <strong>mapeo colaborativo</strong> para mapear <em>Leucaena leucocephala</em> y estimar la biomasa asociada.</p>
<p>La iniciativa está vinculada a la investigación desarrollada en <strong>ESALQ/USP</strong>, bajo la dirección del <strong>Prof. Dr. Matheus Pinheiro Ferreira</strong>, con financiación de <strong>FAPESP</strong> y vinculada al proyecto <em>“Tecnología LiDAR para el Monitoreo Forestal en São Paulo: Apoyo a Políticas Públicas de Mitigación del Cambio Climático”</em> (proceso nº <strong>24/15211-1</strong>) y al <strong>CCARBON/USP</strong> – Center for Carbon Research in Tropical Agriculture.</p>
<p>Actualmente, nuestros esfuerzos se concentran en el estado de <strong>São Paulo</strong>, donde estamos estructurando la base de datos y los métodos. Al mismo tiempo, la plataforma se desarrolla de forma <strong>abierta</strong> y <strong>escalable</strong>, permitiendo su aplicación en otras regiones y contextos en el futuro.</p>
<p>Si te interesan las especies invasoras, las geotecnologías o el carbono, vale la pena visitar <a href="https://leucaena.earth" target="_blank" rel="noopener noreferrer">leucaena.earth</a>.</p>

<h3>Título del Proyecto</h3><p><em>Revelando la distribución espacial y la biomasa aérea de <strong>Leucaena leucocephala</strong> en el Estado de São Paulo usando teledetección e inteligencia artificial</em></p><h3>Investigador</h3><p>Matheus Siqueira Barros</p><h3>Director</h3><p>Prof. Dr. Matheus Pinheiro Ferreira</p><h3>Descripción del Proyecto</h3><p>Esta investigación estudia la distribución espacial y la biomasa aérea de la especie invasora <em>Leucaena leucocephala</em> en todo el estado de São Paulo, Brasil. El proyecto combina imágenes ópticas de muy alta resolución espacial (25 cm de GSD) y datos LiDAR con técnicas de inteligencia artificial para detectar áreas dominadas por esta especie y estimar su biomasa.</p><p>El proyecto desarrolla métodos de aprendizaje profundo, especialmente redes neuronales convolucionales (CNNs), para fusionar datos LiDAR y ópticos y mapear áreas dominadas por <em>Leucaena</em> a escala estatal.</p><h3>Objetivo de la Plataforma</h3><p>Esta plataforma fue desarrollada para apoyar la investigación permitiendo:</p><ul><li>Mapeo colaborativo de manchas de <em>Leucaena leucocephala</em></li><li>Digitalización de polígonos de copa por colaboradores</li><li>Validación entre puntos y polígonos mapeados</li><li>Seguimiento de las contribuciones de cada participante</li><li>Exportación de los datos mapeados para análisis posteriores</li></ul><h3>Equipo del proyecto</h3><p>Judith Zuleika Bertolucci Alves<br>Rafael Perin Menassi</p><h3>Contacto</h3><p>Matheus Siqueira Barros<br><a href="mailto:ms.barros@usp.br">ms.barros@usp.br</a></p><h3>Ubicación</h3><p>Piracicaba – São Paulo – Brasil<br>${month} de ${year}</p>

<div class="docs-logos">
  <div class="docs-logos-section">
    <div class="docs-logos-title">Financiación</div>
    <div class="docs-logos-grid">
      <a class="docs-logo-card docs-logo-img" href="https://fapesp.br/" target="_blank" rel="noopener noreferrer"><img src="/img/sponsors/fapesp.png" alt="FAPESP"></a>
    </div>
  </div>
  <div class="docs-logos-section">
    <div class="docs-logos-title">Realización</div>
    <div class="docs-logos-grid">
      <a class="docs-logo-card docs-logo-img" href="http://esalq.usp.br/" target="_blank" rel="noopener noreferrer"><img src="/img/partners/esalq-usp.jpg" alt="ESALQ/USP"></a>
      <a class="docs-logo-card docs-logo-img" href="https://ccarbon.usp.br/" target="_blank" rel="noopener noreferrer"><img src="/img/partners/ccarbon.jpg" alt="CCARBON/USP"></a>
    </div>
  </div>
  <div class="docs-logos-section">
    <div class="docs-logos-title">Socios</div>
    <div class="docs-logos-grid">
      <a class="docs-logo-card docs-logo-img" href="https://www.igc.sp.gov.br/" target="_blank" rel="noopener noreferrer"><img src="/img/partners/IGC.jpg" alt="IGC"></a>
      <a class="docs-logo-card docs-logo-img" href="https://www.instagram.com/florestal_brasil/" target="_blank" rel="noopener noreferrer"><img src="/img/partners/florestal-brasil.jpg" alt="Florestal Brasil"></a>
      <a class="docs-logo-card docs-logo-img" href="https://www.instagram.com/identplantas/" target="_blank" rel="noopener noreferrer"><img src="/img/partners/identplantas.jpg" alt="Identplantas"></a>
      <a class="docs-logo-card docs-logo-img" href="https://www.cepegeo.ufscar.br/" target="_blank" rel="noopener noreferrer"><img src="/img/partners/cepe-geo.jpg" alt="CePE-Geo"></a>
    </div>
  </div>
</div>`;
  }

  // ── Collaborate content ──

  function getCollaborateContentPT() {
    return `<h2>Seja Colaborador</h2>
<p>Você pode contribuir com o mapeamento de <em>Leucaena leucocephala</em> no estado de São Paulo. Veja como:</p>
<h3>1. Crie sua conta</h3>
<p>Clique em <strong>"Entrar"</strong> no canto superior direito. Você pode se cadastrar com sua <strong>conta Google</strong> (mais rápido) ou com <strong>nome de usuário e senha</strong>. Se optar por e-mail/senha, um e-mail de verificação será enviado.</p>
<h3>2. Comece a mapear!</h3>
<p>Selecione uma célula do grid, clique em <strong>"Bloquear e Editar"</strong> e comece a desenhar polígonos de leucena usando as ferramentas de edição.</p>
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
<h3>1. Create your account</h3>
<p>Click <strong>"Sign In"</strong> in the upper right corner. You can register with your <strong>Google account</strong> (fastest) or with a <strong>username and password</strong>. If you choose email/password, a verification email will be sent.</p>
<h3>2. Start mapping!</h3>
<p>Select a grid cell, click <strong>"Lock & Edit"</strong> and start drawing leucaena polygons using the editing tools.</p>
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
<h3>1. Cree su cuenta</h3>
<p>Haga clic en <strong>"Iniciar Sesión"</strong> en la esquina superior derecha. Puede registrarse con su <strong>cuenta de Google</strong> (más rápido) o con <strong>nombre de usuario y contraseña</strong>. Si elige correo/contraseña, se enviará un correo de verificación.</p>
<h3>2. ¡Empiece a mapear!</h3>
<p>Seleccione una celda del grid, haga clic en <strong>"Bloquear y Editar"</strong> y comience a dibujar polígonos de leucena usando las herramientas de edición.</p>
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

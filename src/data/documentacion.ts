// Documentación de ingeniería de Antídoto: requerimientos funcionales y no
// funcionales. Fuente de verdad de /admin/docs; mismo formato que la
// documentación de codebymike.net/docs, así un requisito se revisa en un diff
// como cualquier otro cambio de código.
//
// El estado se escribe mirando el código, no la intención: "parcial" quiere
// decir que existe una parte (por ejemplo la API) y falta otra (la pantalla).

export type Estado = "implementado" | "parcial" | "planeado";
export type Prioridad = "alta" | "media" | "baja";

export interface Requisito {
  id: string;
  titulo: string;
  descripcion: string;
  prioridad: Prioridad;
  estado: Estado;
  /** Dónde vive en el código (ruta, tabla, archivo). */
  origen?: string;
  /** Cómo se comprueba: test, revisión manual, restricción de la BD... */
  verificacion?: string;
  /** Notas técnicas, decisiones de diseño o riesgos conocidos. */
  notas?: string;
  /** Ids de otros RF/RNF vinculados. */
  relacionados?: string[];
}

export interface Modulo {
  id: string;
  nombre: string;
  items: Requisito[];
}

// --- Requerimientos funcionales -----------------------------------------------

export const REQUISITOS_FUNCIONALES: Modulo[] = [
  {
    id: "participante",
    nombre: "Misiones del participante",
    items: [
      {
        id: "RF-001",
        titulo: "Entrada con nombre y código de actividad",
        descripcion:
          "El participante entra a su misión desde la landing escribiendo su nombre y el código que le dio su empresa, sin crear cuenta.",
        prioridad: "alta",
        estado: "implementado",
        origen: "src/components/LandingScreen.tsx, joinActivity en src/lib/actions.ts",
        verificacion: "Revisión manual del flujo landing → /mision con un código del seed.",
        notas: "El código se compara sin distinguir mayúsculas (UPPER en findByCode).",
        relacionados: ["RF-002", "RF-004", "RNF-03"],
      },
      {
        id: "RF-002",
        titulo: "Aceptación obligatoria de la política de datos",
        descripcion:
          "No se puede entrar sin aceptar la política de tratamiento de datos; la fecha de aceptación queda guardada con la participación.",
        prioridad: "alta",
        estado: "implementado",
        origen: "participations.accepted_policy_at (NOT NULL)",
        verificacion: "La columna es NOT NULL: una participación sin aceptación no se puede insertar.",
        relacionados: ["RF-003", "RF-601", "RNF-06"],
      },
      {
        id: "RF-003",
        titulo: "Consulta de política y términos",
        descripcion:
          "Desde la landing se abren en un modal la política de tratamiento de datos y los términos y condiciones vigentes.",
        prioridad: "media",
        estado: "implementado",
        origen: "src/components/PolicyModal.tsx, tabla legal_texts",
        notas: "Si la base no responde, la landing carga un texto de respaldo en vez de romperse.",
        relacionados: ["RF-305"],
      },
      {
        id: "RF-004",
        titulo: "Rechazo de códigos inexistentes o vencidos",
        descripcion:
          "Un código que no existe devuelve un error genérico; uno vencido informa la fecha en que venció y pide contactar al administrador.",
        prioridad: "alta",
        estado: "parcial",
        origen: "joinActivity en src/lib/actions.ts, resolveEstado en src/lib/queries.ts",
        verificacion: "src/lib/expiry.test.mts cubre el límite del día en hora de Colombia.",
        notas:
          "Un código en estado 'pausado' todavía deja entrar: /mision solo muestra un aviso. Falta decidir si la pausa debe bloquear la entrada.",
        relacionados: ["RF-301", "RNF-03"],
      },
      {
        id: "RF-005",
        titulo: "Vista de la misión con avance propio y del grupo",
        descripcion:
          "El participante ve la misión, su avance y el avance promedio y número de participantes de su grupo.",
        prioridad: "alta",
        estado: "implementado",
        origen: "src/app/mision/page.tsx, currentParticipation en src/lib/participation.ts",
        relacionados: ["RNF-10"],
      },
      {
        id: "RF-006",
        titulo: "Completar la misión",
        descripcion:
          "El participante marca la misión como completada y llega a una pantalla de cierre con su resultado.",
        prioridad: "alta",
        estado: "parcial",
        origen: "src/lib/experience-actions.ts, src/app/mision/completada/page.tsx",
        notas:
          "Solo las actividades de la biblioteca (RF-903) se completan y calculan el puntaje. Una misión común (sin escenas) ya no se puede asignar; si queda un código viejo apuntando a una, /mision lo explica en vez de marcarla como completada con un puntaje inventado.",
        relacionados: ["RF-206", "RF-904"],
      },
      {
        id: "RF-007",
        titulo: "Reanudar y salir de la actividad",
        descripcion:
          "La participación se recuerda 30 días en una cookie: la portada lleva directo a la misión. Desde otro dispositivo se retoma entrando con el mismo nombre y apellido y el mismo código. Salir pide confirmación y solo olvida la sesión en ese dispositivo.",
        prioridad: "media",
        estado: "implementado",
        origen: "PARTICIPATION_COOKIE en src/lib/participation.ts, joinActivity y leaveActivity en src/lib/actions.ts, src/components/LeaveConfirm.tsx",
        relacionados: ["RNF-04"],
      },
    ],
  },
  {
    id: "acceso",
    nombre: "Acceso al portal y roles",
    items: [
      {
        id: "RF-101",
        titulo: "Inicio de sesión con usuario y contraseña",
        descripcion: "Los administradores entran al portal con usuario y contraseña propios del sistema.",
        prioridad: "alta",
        estado: "implementado",
        origen: "src/app/admin/login/page.tsx, login en src/lib/auth.ts",
        relacionados: ["RNF-01", "RNF-02", "RNF-03"],
      },
      {
        id: "RF-102",
        titulo: "Cierre de sesión",
        descripcion: "El administrador cierra su sesión y el token queda invalidado en el servidor.",
        prioridad: "media",
        estado: "implementado",
        origen: "destroySession en src/lib/auth.ts",
        relacionados: ["RNF-02"],
      },
      {
        id: "RF-103",
        titulo: "Roles superadmin y admin de empresa",
        descripcion:
          "El superadmin ve todas las empresas y gestiona empresas, textos legales y auditoría; el admin de empresa solo ve los grupos, códigos, juegos y partidas de la suya.",
        prioridad: "alta",
        estado: "implementado",
        origen: "admin_users.role, src/lib/scope.ts",
        verificacion: "src/lib/scope.test.mts cubre el filtro por empresa y los permisos sobre juegos.",
        relacionados: ["RNF-05"],
      },
      {
        id: "RF-104",
        titulo: "Gestión de usuarios del portal",
        descripcion:
          "El superadmin da acceso a los admins de cada empresa desde la página de la empresa y a otros superadmins desde Ajustes. La contraseña inicial se genera y se muestra una sola vez; también puede generar otra o desactivar a alguien, y en ambos casos se le cierran las sesiones.",
        prioridad: "media",
        estado: "implementado",
        origen: "src/lib/user-actions.ts, src/components/admin/users/PortalUsersPanel.tsx, tabla admin_user_disabled",
        verificacion: "src/lib/admin-users.test.mts cubre usuario, contraseña mínima y la contraseña generada.",
        notas:
          "Desactivar no borra: el nombre sigue en el historial y en las partidas. Nadie se desactiva a sí mismo ni al último superadmin activo. El admin de empresa no gestiona usuarios.",
        relacionados: ["RF-103", "RF-105", "RNF-01"],
      },
      {
        id: "RF-105",
        titulo: "Cambiar la propia contraseña",
        descripcion:
          "Cada administrador cambia su contraseña en Mi cuenta escribiendo la actual; sus otras sesiones abiertas se cierran.",
        prioridad: "media",
        estado: "implementado",
        origen: "src/app/admin/(portal)/cuenta/page.tsx, changeOwnPassword en src/lib/user-actions.ts",
        notas: "Mínimo 10 caracteres y límite de 5 intentos cada 15 minutos, como el login.",
        relacionados: ["RF-104", "RNF-01"],
      },
    ],
  },
  {
    id: "actividades",
    nombre: "Actividades y seguimiento",
    items: [
      {
        id: "RF-201",
        titulo: "Listado de actividades con métricas",
        descripcion:
          "La portada del superadmin (Inicio) lista las actividades jugables con búsqueda, número de códigos, participantes y avance promedio. El admin de empresa entra directo a la página de su empresa.",
        prioridad: "alta",
        estado: "implementado",
        origen: "src/app/admin/(portal)/page.tsx, listMissions en src/lib/queries.ts",
        notas: "Desde el 2026-09-25 solo salen las actividades con escena (mission_experiences): las del prototipo (m1, m2) no se podían jugar. No cuentan los códigos ni las empresas archivados.",
        relacionados: ["RF-103", "RNF-10"],
      },
      {
        id: "RF-202",
        titulo: "Detalle de actividad con tendencia",
        descripcion:
          "Cada actividad muestra participantes, avance promedio, grupos activos y la tendencia de avance de las últimas 6 semanas.",
        prioridad: "alta",
        estado: "implementado",
        origen: "src/components/admin/ActivityResults.tsx, src/app/admin/(portal)/actividades/[id]/page.tsx, src/app/admin/(portal)/empresas/[id]/actividades/[missionId]/page.tsx, getTrend",
        notas:
          "La misma vista sirve para todas las empresas (se abre desde la Biblioteca) o para una sola (desde la página de la empresa), con el mismo filtro de alcance que vería su admin. Una empresa sin códigos en esa actividad no ve ni su metadata.",
        relacionados: ["RF-203"],
      },
      {
        id: "RF-203",
        titulo: "Comparación de grupos",
        descripcion:
          "La tabla de grupos permite filtrar por estado, buscar empresa o grupo y expandir una fila para ver una muestra de participantes.",
        prioridad: "media",
        estado: "implementado",
        origen: "src/components/admin/GroupsTable.tsx, listGroups, listParticipants",
      },
      {
        id: "RF-204",
        titulo: "Exportar actividad a CSV",
        descripcion: "El admin descarga el resumen por grupo de una actividad en CSV que Excel abre con tildes correctas.",
        prioridad: "media",
        estado: "implementado",
        origen: "src/app/admin/(portal)/actividades/[id]/export/route.ts",
        notas:
          "El archivo lleva BOM UTF-8 para Excel y respeta el mismo filtro por empresa (?empresa= para la vista de una sola). Usa el mismo csvCell que el export de partidas: neutraliza fórmulas (=, +, -, @) y el nombre va en filename* para admitir tildes. Desde el 2026-09-26 el botón se llama \"CSV de códigos\" para distinguirlo del CSV de participantes (RF-914).",
        relacionados: ["RF-103", "RF-914"],
      },
      {
        id: "RF-205",
        titulo: "Duplicar actividad",
        descripcion: "El superadmin duplica una misión existente para reutilizarla como base de otra.",
        prioridad: "baja",
        estado: "planeado",
        notas:
          "Retirado el 2026-09-25: copiaba título y descripción pero no la escena, así que la copia no se podía jugar. Si vuelve, debe copiar también su fila de mission_experiences.",
      },
      {
        id: "RF-206",
        titulo: "Crear y editar el contenido de una misión",
        descripcion: "El superadmin crea misiones nuevas y edita su título, etiqueta, descripción y contenido desde el portal.",
        prioridad: "media",
        estado: "planeado",
        notas: "Las misiones hoy salen del seed; el portal solo las lista y duplica.",
        relacionados: ["RF-006"],
      },
    ],
  },
  {
    id: "configuracion",
    nombre: "Configuración, auditoría y avisos",
    items: [
      {
        id: "RF-301",
        titulo: "Asignar una actividad a una empresa",
        descripcion:
          "El superadmin asigna una actividad de la biblioteca a una empresa elegida de la lista (nunca escrita a mano) con una fecha de cierre opcional y elige qué datos se le piden a cada participante (cargo de una lista y lugar); se crea el código para sus participantes.",
        prioridad: "alta",
        estado: "implementado",
        origen: "assignActivity en src/lib/actions.ts, src/app/admin/(portal)/asignar/page.tsx, src/components/admin/AssignForm.tsx, tabla activity_codes",
        notas:
          "Formato PREFIJO-EMPRESA-XXXXXX: sufijo de 6 caracteres con crypto (sin 0/O ni 1/I), ~1.000 millones de combinaciones; antes eran 2 dígitos y bastaban 89 intentos. Se reintenta hasta 10 veces si choca con el UNIQUE. Desde el 2026-09-25 solo asigna el superadmin (antes un nombre mal escrito creaba una empresa nueva sin avisar) y una serie se asigna completa desde su primera estación. Los datos que pide el código van en activity_code_profile (RF-913).",
        relacionados: ["RF-004", "RF-302", "RF-913"],
      },
      {
        id: "RF-302",
        titulo: "Códigos de cada empresa: estado, pausa y fecha de cierre",
        descripcion:
          "La página de cada empresa muestra sus códigos con estado, fecha de cierre y participantes, un botón para copiarlos, y permite pausarlos, reanudarlos y cambiar la fecha de cierre.",
        prioridad: "media",
        estado: "implementado",
        origen: "listCompanyAssignments en src/lib/queries.ts, setCodePaused y setCodeExpiry en src/lib/actions.ts, src/components/admin/CopyCode.tsx",
        notas:
          "El estado 'vencido' se deriva de expires_at (src/lib/expiry.ts): el día elegido sirve completo y vence al terminar ese día en hora de Colombia, no a medianoche UTC (antes vencía la tarde del día anterior).",
        relacionados: ["RNF-10"],
      },
      {
        id: "RF-303",
        titulo: "Empresas como centro del portal",
        descripcion:
          "El menú gira alrededor de la empresa: Empresas lista las activas y las archivadas, y la página de cada una reúne sus actividades con avance, resultados, informe PDF, códigos y su marca. El admin de empresa solo ve la suya.",
        prioridad: "alta",
        estado: "implementado",
        origen:
          "src/app/admin/(portal)/empresas/page.tsx, src/app/admin/(portal)/empresas/[id]/page.tsx, saveCompanyBrand en src/lib/brand-actions.ts, listCompaniesWithBrand en src/lib/company-brand.ts",
        notas:
          "Reorganizado el 2026-09-25 porque asignar, ver el avance por empresa o borrar estaba repartido entre Actividades, Biblioteca y Configuración. Configuración se retiró: los textos legales y el historial quedaron en Ajustes (src/app/admin/(portal)/ajustes/page.tsx) y /admin/config redirige.",
        relacionados: ["RF-307", "RF-309"],
      },
      {
        id: "RF-309",
        titulo: "Archivar empresas y quitar actividades sin perder resultados",
        descripcion:
          "Archivar una empresa la saca de las listas, sus códigos dejan de aceptar participantes y su admin pierde el acceso; quitar una actividad deja su código sin efecto y fuera de los informes. Nada se borra y ambos se restauran.",
        prioridad: "alta",
        estado: "implementado",
        origen:
          "archiveCompany, restoreCompany, archiveCode y restoreCode en src/lib/actions.ts, LIVE_CODE en src/lib/scope.ts, tablas company_archive y activity_code_archive en db/schema.sql",
        notas:
          "Reemplaza al borrado en cascada (deleteCompany), que eliminaba en silencio los resultados de los participantes. Decisión del usuario (2026-09-25): archivar, no borrar. Producción necesita scripts/migrate.mjs para las tablas nuevas.",
        relacionados: ["RF-303", "RF-004"],
      },
      {
        id: "RF-307",
        titulo: "Marca de la empresa (co-branding)",
        descripcion:
          "Al crear o editar una empresa se configuran su logo, un color principal, uno secundario opcional y un mensaje de bienvenida. Participantes, juegos en vivo y reportes la ven con esa marca y un sello discreto de Antídoto.",
        prioridad: "media",
        estado: "implementado",
        origen:
          "src/components/admin/brand/BrandEditor.tsx, src/lib/brand-palette.ts, src/lib/company-brand.ts, tabla company_branding",
        verificacion: "src/lib/brand-palette.test.mts y src/lib/logo-file.test.mts.",
        notas:
          "El superadmin edita cualquier empresa; el admin de empresa, la suya desde Mi empresa › Logo y colores (src/app/admin/(portal)/empresas/[id]/marca/page.tsx). El editor recorta y comprime el logo en el navegador (máx. 200 KB), sugiere colores leídos del logo y muestra la vista previa en vivo. De cada color se derivan todos los tonos con contraste AA garantizado: si el botón no se lee, se oscurece y se avisa. Un logo pensado para el fondo contrario se muestra sobre una placa. Sin marca configurada todo se ve como antes.",
        relacionados: ["RF-303", "RF-308"],
      },
      {
        id: "RF-308",
        titulo: "Reportes PDF con la marca de la empresa",
        descripcion:
          "Cada actividad tiene un reporte por empresa y cada partida en vivo el suyo, como hoja A4 con logo y colores de la empresa, lista para imprimir o guardar como PDF.",
        prioridad: "media",
        estado: "implementado",
        origen: "src/components/report/ReportFrame.tsx, src/app/admin/reporte/actividad/[id]/[companyId]/page.tsx, src/app/admin/reporte/partida/[gameId]/[matchId]/page.tsx",
        notas:
          "El admin de empresa solo abre el de la suya. El CSV se mantiene igual para Excel. Si algún participante llenó la ficha (RF-913), la tabla del reporte de actividad suma las columnas Cargo y Municipio.",
        relacionados: ["RF-307", "RF-913"],
      },
      {
        id: "RF-304",
        titulo: "Edición de textos legales",
        descripcion: "El superadmin edita la política de datos y los términos; la landing muestra la versión nueva al instante.",
        prioridad: "media",
        estado: "implementado",
        origen: "updateLegalText en src/lib/actions.ts",
        relacionados: ["RF-003"],
      },
      {
        id: "RF-305",
        titulo: "Bitácora de auditoría",
        descripcion:
          "Toda acción administrativa (códigos, empresas, textos legales, juegos, partidas) queda registrada con autor y fecha, filtrada por empresa.",
        prioridad: "alta",
        estado: "implementado",
        origen: "audit en src/lib/admin-guard.ts, tabla audit_log",
        relacionados: ["RF-306", "RNF-07"],
      },
      {
        id: "RF-306",
        titulo: "Notificaciones del portal",
        descripcion:
          "La campana muestra las entradas de auditoría posteriores a la última lectura del admin y permite marcarlas como leídas.",
        prioridad: "baja",
        estado: "implementado",
        origen: "src/components/admin/NotificationsBell.tsx, listNotifications",
      },
    ],
  },
  {
    id: "juegos",
    nombre: "Editor de juegos en vivo",
    items: [
      {
        id: "RF-401",
        titulo: "Crear y listar juegos",
        descripcion: "El admin crea juegos (sets de preguntas reutilizables) y los lista con búsqueda, separando activos y archivados.",
        prioridad: "alta",
        estado: "implementado",
        origen: "src/app/admin/(portal)/juegos/page.tsx, src/lib/live-games.ts",
      },
      {
        id: "RF-402",
        titulo: "Cuatro tipos de pregunta",
        descripcion:
          "Cada pregunta es quiz (2 a 4 opciones, una o más correctas), verdadero/falso, encuesta (sin correctas) o nube de palabras (texto libre), con tiempo límite de 5 a 240 segundos.",
        prioridad: "alta",
        estado: "implementado",
        origen: "src/components/admin/live/GameEditor.tsx, tablas live_questions y live_options",
        verificacion: "src/lib/live-validation.test.mts cubre las reglas de cada tipo.",
        relacionados: ["RF-403"],
      },
      {
        id: "RF-403",
        titulo: "Validación del juego antes de guardar",
        descripcion:
          "El editor marca los errores campo por campo mientras se escribe, y el servidor vuelve a validar todo lo que llega del navegador.",
        prioridad: "alta",
        estado: "implementado",
        origen: "parseGameDraft en src/lib/live-validation.ts",
        verificacion: "Tests de live-validation: límites de texto, opciones, correctas y normalización.",
        relacionados: ["RNF-08"],
      },
      {
        id: "RF-404",
        titulo: "Juegos globales y de empresa",
        descripcion:
          "Un juego sin empresa es global: lo crea un superadmin y todas las empresas lo usan pero no lo editan. Los de empresa solo los ve y edita esa empresa.",
        prioridad: "media",
        estado: "implementado",
        origen: "visibleGamesFilter, canEditGame en src/lib/scope.ts",
        verificacion: "src/lib/scope.test.mts",
        relacionados: ["RF-103"],
      },
      {
        id: "RF-405",
        titulo: "Juegos con partidas en solo lectura",
        descripcion: "Un juego que ya se jugó no se puede editar, para no alterar sus reportes; se ofrece duplicarlo.",
        prioridad: "media",
        estado: "implementado",
        origen: "saveGame, duplicateGame en src/lib/live-games-actions.ts",
        notas: "live_matches.game_id no tiene ON DELETE: un juego se archiva primero y solo uno archivado se puede eliminar, borrando antes sus partidas en la misma transacción (deleteGame, 2026-10-01).",
        relacionados: ["RF-406", "RF-701"],
      },
      {
        id: "RF-406",
        titulo: "Archivar y restaurar juegos",
        descripcion: "El admin archiva juegos que ya no usa y puede restaurarlos o, ya archivados, eliminarlos del todo.",
        prioridad: "baja",
        estado: "implementado",
        origen: "archiveGame, restoreGame, deleteGame en src/lib/live-games-actions.ts, src/components/admin/live/DeleteGameButton.tsx",
      },
    ],
  },
  {
    id: "partida",
    nombre: "Partida en vivo (host y proyector)",
    items: [
      {
        id: "RF-501",
        titulo: "Lanzar una partida con PIN",
        descripcion:
          "El admin lanza un juego y obtiene una partida con PIN de 6 dígitos, único entre las partidas abiertas, y pasa a la pantalla del proyector.",
        prioridad: "alta",
        estado: "implementado",
        origen: "createMatch en src/lib/live-match.ts, POST /api/live/matches",
        verificacion: "Índice único parcial idx_live_matches_open_pin; generatePin cubierto en live-engine.test.mts.",
        notas: "Una partida abierta más de 12 horas se da por abandonada y libera su PIN.",
        relacionados: ["RF-502"],
      },
      {
        id: "RF-502",
        titulo: "Sala de espera en el proyector",
        descripcion: "El proyector muestra el PIN, un código QR para entrar y los apodos de los jugadores a medida que llegan.",
        prioridad: "alta",
        estado: "implementado",
        origen: "src/components/live/host/HostLobby.tsx, src/components/live/QrCode.tsx",
        relacionados: ["RF-503", "RF-504"],
      },
      {
        id: "RF-503",
        titulo: "Expulsar jugadores",
        descripcion: "El host saca a un jugador desde la sala o, ya empezada la partida, desde el panel que abre el contador de jugadores del footer (doble toque para confirmar); el expulsado deja de contar en respuestas y ranking y no puede volver a entrar desde ese celular.",
        prioridad: "media",
        estado: "implementado",
        origen: "kickPlayer en src/lib/live-match.ts, POST /api/live/host/[matchId]/kick, src/components/live/host/KickList.tsx",
      },
      {
        id: "RF-504",
        titulo: "Abrir y cerrar la entrada",
        descripcion: "El host bloquea la entrada de nuevos jugadores y puede volver a abrirla.",
        prioridad: "media",
        estado: "implementado",
        origen: "comandos lockJoin y unlockJoin en src/lib/live-engine.ts",
      },
      {
        id: "RF-505",
        titulo: "Control del flujo de la partida",
        descripcion:
          "El host inicia, salta al revelado, muestra el ranking, pasa a la siguiente pregunta, pausa, reanuda y termina antes de tiempo.",
        prioridad: "alta",
        estado: "implementado",
        origen: "applyCommand en src/lib/live-engine.ts, src/components/live/host/HostScreen.tsx",
        verificacion: "live-engine.test.mts recorre las transiciones válidas e inválidas de cada comando.",
        relacionados: ["RF-506", "RNF-09"],
      },
      {
        id: "RF-506",
        titulo: "Cierre automático de la pregunta",
        descripcion: "La pregunta se cierra sola al vencer el tiempo o cuando responden todos los jugadores activos.",
        prioridad: "alta",
        estado: "implementado",
        origen: "shouldEndQuestion en src/lib/live-engine.ts, POST /api/live/host/[matchId]/tick, POST /api/live/tick",
        notas:
          "No hay proceso vivo en el servidor: el proyector avisa cuando su reloj llega a cero y el servidor decide con el suyo. Es idempotente. Si el proyector se cerró, los celulares hacen lo mismo entre 1 y 3 s después (cada uno con un retraso distinto), así la pregunta no se queda abierta.",
        relacionados: ["RNF-09", "RNF-12"],
      },
      {
        id: "RF-507",
        titulo: "Revelado con resultados de la pregunta",
        descripcion:
          "Al cerrar, el proyector muestra la respuesta correcta y cuántos eligieron cada opción; en la nube de palabras, las 50 más repetidas.",
        prioridad: "alta",
        estado: "implementado",
        origen: "questionStats, groupWords en src/lib/live-engine.ts, HostReveal.tsx",
        verificacion: "live-engine.test.mts cubre estadísticas y agrupación de palabras.",
      },
      {
        id: "RF-508",
        titulo: "Puntaje por rapidez y racha, ranking y podio",
        descripcion:
          "Acertar al instante da 1000 puntos y al final del tiempo 500; desde el segundo acierto seguido suma +100 por racha (tope 500). Tras cada pregunta hay ranking y al final un podio.",
        prioridad: "alta",
        estado: "implementado",
        origen: "basePoints, streakBonus, computeLeaderboard en src/lib/live-engine.ts, HostLeaderboard.tsx, HostPodium.tsx",
        verificacion: "live-engine.test.mts cubre puntaje, racha cortada por fallo o no respuesta y desempates.",
        notas: "Puntajes y rachas no se guardan: se calculan desde live_answers.",
        relacionados: ["RNF-10"],
      },
      {
        id: "RF-509",
        titulo: "Tope de jugadores por partida",
        descripcion: "Una partida admite hasta 100 jugadores; al llenarse, la entrada responde con un mensaje claro.",
        prioridad: "media",
        estado: "implementado",
        origen: "MAX_PLAYERS en src/lib/live-match.ts",
        relacionados: ["RNF-13"],
      },
      {
        id: "RF-510",
        titulo: "Volver a la pantalla del host",
        descripcion:
          "Cerrar el proyector a media partida pide confirmación. Si igual se cierra, el historial del juego y el reporte de la partida ofrecen \"Volver a la pantalla en vivo\" mientras siga abierta (y no pasen 12 horas). Los celulares avisan \"El anfitrión se desconectó\" si el host lleva 8 s fuera.",
        prioridad: "media",
        estado: "implementado",
        origen:
          "liveMatchOpen en src/lib/live-report-format.ts, src/components/admin/live/MatchHistory.tsx, presencia en src/components/live/useLiveChannel.ts",
        verificacion:
          "live-report-format.test.mts cubre cuándo una partida sigue abierta. Probado en navegador el 2026-10-06: el aviso sale 8 s después de cerrar la pestaña del host y no aparece mientras está abierta.",
        relacionados: ["RF-506", "RNF-13"],
      },
    ],
  },
  {
    id: "jugador",
    nombre: "Jugador en vivo (celular)",
    items: [
      {
        id: "RF-601",
        titulo: "Unirse con PIN y apodo",
        descripcion:
          "El jugador entra desde el celular con el PIN (o el QR), un apodo único en la partida y la aceptación de la política de datos.",
        prioridad: "alta",
        estado: "implementado",
        origen: "POST /api/live/join, joinMatch en src/lib/live-match.ts, src/app/jugar/page.tsx, src/components/live/player/JoinForm.tsx",
        notas:
          "El QR abre /jugar?pin= con el PIN ya puesto. El apodo se limpia de caracteres invisibles y se compara sin mayúsculas.",
        relacionados: ["RF-002", "RNF-03"],
      },
      {
        id: "RF-602",
        titulo: "Responder desde el celular",
        descripcion:
          "El jugador ve las opciones con su forma y color y responde una sola vez por pregunta; la respuesta se mide con el reloj del servidor.",
        prioridad: "alta",
        estado: "implementado",
        origen: "POST /api/live/answer, submitAnswer, src/components/live/AnswerTile.tsx, src/components/live/player/PlayerGame.tsx",
        notas: "El toque se marca al instante y se deshace si el servidor rechaza la respuesta. La nube de palabras usa un campo de texto.",
        relacionados: ["RNF-09", "RNF-12"],
      },
      {
        id: "RF-603",
        titulo: "Resultado propio tras cada pregunta",
        descripcion: "Tras el revelado, el celular muestra si acertó, los puntos ganados, la racha y su posición.",
        prioridad: "alta",
        estado: "implementado",
        origen: "playerSnapshot, src/components/live/player/PlayerGame.tsx",
        relacionados: ["RF-508"],
      },
      {
        id: "RF-604",
        titulo: "Reconexión sin perder la partida",
        descripcion: "Si el celular se bloquea o pierde señal, al volver recupera su lugar y el estado actual de la partida.",
        prioridad: "alta",
        estado: "implementado",
        origen: "GET /api/live/me, PLAYER_COOKIE en src/lib/live-http.ts, applyPublicEvent en src/lib/live-client-state.ts, src/components/live/useLiveChannel.ts",
        notas: "Si Ably reconecta sin poder reanudar el canal, el celular pide la foto de estado a /api/live/me. Falta probarlo en un celular real.",
        relacionados: ["RNF-11"],
      },
      {
        id: "RF-605",
        titulo: "Salir de la partida",
        descripcion: "El jugador abandona la partida (doble toque) y su celular queda libre para entrar a otra. En la sala de espera se borra de la partida y su apodo queda libre; ya empezada, sigue en ella y en los reportes.",
        prioridad: "baja",
        estado: "implementado",
        origen: "POST /api/live/leave, leaveMatch en src/lib/live-match.ts, src/components/live/player/PlayerApp.tsx",
        notas: "Quien cierra el navegador sin salir sigue contando como activo: \"respondieron todos\" no se cumple y la pregunta cierra por tiempo.",
      },
    ],
  },
  {
    id: "reportes",
    nombre: "Reportes de partidas",
    items: [
      {
        id: "RF-701",
        titulo: "Reporte de una partida",
        descripcion:
          "Al terminar, el admin consulta el detalle de la partida: ranking final, respuestas por pregunta y resultado de cada jugador.",
        prioridad: "alta",
        estado: "implementado",
        origen: "getMatchReport en src/lib/live-reports.ts, src/app/admin/(portal)/juegos/[id]/partidas/[matchId]/page.tsx",
        relacionados: ["RF-405", "RF-702"],
      },
      {
        id: "RF-702",
        titulo: "Exportar partida a CSV",
        descripcion: "El detalle de una partida se descarga en CSV, igual que las actividades.",
        prioridad: "media",
        estado: "implementado",
        origen: "src/app/admin/(portal)/juegos/[id]/partidas/[matchId]/export/route.ts",
        notas: "Lleva BOM UTF-8 para Excel y respeta el filtro por empresa de getMatchReport.",
        relacionados: ["RF-204"],
      },
      {
        id: "RF-703",
        titulo: "Historial de partidas por juego",
        descripcion: "Cada juego lista sus partidas anteriores con fecha, host y número de jugadores.",
        prioridad: "baja",
        estado: "implementado",
        origen: "src/app/admin/(portal)/juegos/[id]/page.tsx",
      },
    ],
  },
  {
    id: "desafio",
    nombre: "Desafío a su ritmo (asíncrono)",
    items: [
      {
        id: "RF-801",
        titulo: "Asignar un juego como desafío con fecha de cierre",
        descripcion:
          "Además de la partida en vivo, el admin asigna el juego como desafío: elige fecha y hora de cierre (mínimo 5 minutos, máximo 60 días) y obtiene un PIN, un enlace y un QR para compartir.",
        prioridad: "alta",
        estado: "implementado",
        origen: "assignChallenge en src/lib/live-games-actions.ts, src/components/admin/live/PlayPanel.tsx, tabla live_challenges en db/schema.sql",
        verificacion: "parseClosesAt cubierto en src/lib/live-challenge-engine.test.mts.",
        notas:
          "Es una fila más de live_matches (comparte PIN, jugadores, respuestas y reportes) marcada por live_challenges. La hora local del admin viaja en ISO con zona y se guarda en UTC.",
        relacionados: ["RF-501", "RF-802"],
      },
      {
        id: "RF-802",
        titulo: "Compartir y cerrar el desafío",
        descripcion:
          "La página del desafío muestra el enlace con el PIN incluido, botón para copiarlo, QR y fecha de cierre, y permite cerrarlo antes de tiempo con doble confirmación.",
        prioridad: "alta",
        estado: "implementado",
        origen: "src/components/admin/live/ChallengeShare.tsx, closeChallenge en src/lib/live-challenge.ts",
        notas: "Al vencer la fecha el desafío deja de aceptar jugadores y respuestas aunque la fila siga en 'lobby'; closeExpiredChallenges la pasa a 'finished' al crear otra partida.",
        relacionados: ["RF-801", "RF-805"],
      },
      {
        id: "RF-803",
        titulo: "Jugar el desafío a su ritmo desde el celular",
        descripcion:
          "El jugador entra con el enlace o el PIN y su apodo, ve cada pregunta con sus opciones completas y avanza cuando quiere. Cada pregunta tiene su propio reloj y la entrada \"¡Prepárate!\", y tras responder ve si acertó y la respuesta correcta.",
        prioridad: "alta",
        estado: "implementado",
        origen: "src/components/live/player/ChallengeGame.tsx, advanceChallenge en src/lib/live-challenge.ts, POST /api/live/challenge/next",
        verificacion: "advance y challengePhase cubiertos en src/lib/live-challenge-engine.test.mts; flujo completo probado por HTTP y en el navegador en local.",
        notas: "Sin Ably: cada paso es un POST y una foto por /api/live/me. No se puede saltar una pregunta abierta y un doble toque no avanza dos veces (UPDATE condicionado).",
        relacionados: ["RF-601", "RF-804"],
      },
      {
        id: "RF-804",
        titulo: "Puntaje, un intento por celular y resultado final",
        descripcion:
          "El puntaje por rapidez y racha es el mismo del modo en vivo. La cookie del jugador dura hasta una semana después del cierre, así que al volver ve su resultado en vez de empezar de nuevo. Al terminar ve sus puntos, aciertos, su puesto y el top 5 del momento.",
        prioridad: "alta",
        estado: "implementado",
        origen: "scoreAndSave en src/lib/live-match.ts, challengeSnapshot en src/lib/live-challenge.ts",
        notas: "Un intento por celular, no por persona: borrando cookies se puede volver a entrar con otro apodo. Es el mismo límite que Kahoot con apodos.",
        relacionados: ["RF-508"],
      },
      {
        id: "RF-805",
        titulo: "Reporte del desafío",
        descripcion:
          "El reporte del desafío usa la misma vista de las partidas: ranking (\"hasta ahora\" mientras está abierto), resultados por pregunta, cuántos terminaron y export CSV.",
        prioridad: "media",
        estado: "implementado",
        origen: "getMatchReport en src/lib/live-reports.ts, src/components/admin/live/MatchHistory.tsx",
        relacionados: ["RF-701", "RF-702"],
      },
    ],
  },
  {
    id: "experiencias",
    nombre: "Biblioteca de experiencias interactivas",
    items: [
      {
        id: "RF-901",
        titulo: "Biblioteca de experiencias",
        descripcion:
          "El portal tiene una biblioteca (como el catálogo de plantillas de Genially) con las escenas interactivas listas para usar, agrupadas por serie, con miniatura, número de riesgos, duración y participantes.",
        prioridad: "alta",
        estado: "implementado",
        origen: "src/app/admin/(portal)/biblioteca/page.tsx, src/app/admin/(portal)/biblioteca/actividad/[key]/page.tsx, src/components/admin/LibraryCard.tsx, src/lib/experiences/catalog.ts, listLibrary en src/lib/experience-data.ts",
        notas:
          "Las escenas se programan (arte, animación y dónde está cada riesgo); la base guarda qué misión usa cada una. Decisión del usuario (2026-09-23): escenas en código con textos editables, sin editor visual por ahora. Desde el 2026-10-01 una actividad con estaciones es una sola tarjeta (LibraryCard) con su página en /admin/biblioteca/actividad/[key], y la biblioteca suma los juegos en vivo en pestañas.",
        relacionados: ["RF-902", "RF-903"],
      },
      {
        id: "RF-902",
        titulo: "Usar una experiencia con una empresa",
        descripcion:
          "Desde la biblioteca, \"Asignar a una empresa\" abre el formulario de asignación con la experiencia elegida. La experiencia reutiliza códigos, participaciones, avance, puntaje y exportación de las misiones.",
        prioridad: "alta",
        estado: "implementado",
        origen: "ensureExperienceMission en src/lib/experience-data.ts, assignActivity en src/lib/actions.ts, tabla mission_experiences en db/schema.sql",
        notas:
          "La misión de cada experiencia tiene id fijo (exp-<clave>): crearla dos veces no duplica nada. Una serie de varias estaciones lleva el nombre de la serie (\"Ruta del café\"), no el de su primera estación.",
        relacionados: ["RF-301", "RF-001"],
      },
      {
        id: "RF-903",
        titulo: "Escena de la finca: encontrar los riesgos de la forma de trabajar",
        descripcion:
          "El participante entra con su código y ve a Ramiro, recolector, subir un bulto de café con malas prácticas en una finca de ladera en pixel art estilo Habbo. En tres momentos (agarrar, subir, llevar) toca donde ve un error y elige qué está mal entre 3 opciones; recibe la explicación y la buena práctica. Al final ve la forma correcta animada, una insignia y su resumen.",
        prioridad: "alta",
        estado: "implementado",
        origen:
          "src/components/experience/ExperiencePlayer.tsx, src/components/experience/scenes/finca.ts, src/components/experience/scenes/finca-art.ts, src/app/mision/page.tsx",
        verificacion:
          "Flujo completo probado en Chromium headless (escritorio y celular): código, intro, respuestas buenas y malas, pista, rendirse, final y cierre; respuestas y puntaje verificados en la base. Capturas del arte con scripts/escena-png.mts.",
        notas:
          "Diseño y contenido en docs/investigacion-ux-habbo.md. Arte, fuente (Tiny5, OFL) y sonidos propios: nada de Habbo ni de Juan Valdez. Siete riesgos con respaldo: Resolución 2400 de 1979 art. 392, ecuación de NIOSH y estudios en recolectores colombianos.",
        relacionados: ["RF-904", "RF-905", "RNF-17"],
      },
      {
        id: "RF-904",
        titulo: "Calificación en el servidor y reanudación",
        descripcion:
          "El navegador recibe las preguntas sin la respuesta; el servidor califica, guarda cada riesgo una sola vez y actualiza avance y puntaje (0 a 10 por aciertos a la primera). Al volver, el participante sigue donde iba. Rendirse revela los que faltan como no encontrados.",
        prioridad: "alta",
        estado: "implementado",
        origen: "answerExperienceRisk y revealExperienceRisks en src/lib/experience-actions.ts, tabla experience_answers en db/schema.sql",
        verificacion: "Proyección pública sin respuestas, calificación y validación cubiertas en src/lib/experiences.test.mts.",
        notas: "Se copia el texto de la opción elegida: si luego se editan los textos, el reporte no cambia.",
        relacionados: ["RF-006", "RF-906"],
      },
      {
        id: "RF-905",
        titulo: "Editar los textos de cada riesgo",
        descripcion:
          "El superadmin edita título, pregunta, las 3 opciones, cuál es la correcta, la explicación y la buena práctica de cada riesgo, y puede restaurar el texto original. El admin de empresa los ve en solo lectura.",
        prioridad: "media",
        estado: "implementado",
        origen: "src/app/admin/(portal)/biblioteca/[key]/page.tsx, src/components/admin/RiskTextsEditor.tsx, tabla experience_risk_texts en db/schema.sql",
        verificacion: "validateRiskTexts cubierto en src/lib/experiences.test.mts; guardar, rechazar opciones repetidas y restaurar probados en el navegador.",
        relacionados: ["RF-901"],
      },
      {
        id: "RF-906",
        titulo: "Reporte por riesgo y vista previa",
        descripcion:
          "La actividad de una escena muestra, por riesgo, qué porcentaje lo encontró, cuántos acertaron a la primera y el error más común. El admin prueba cualquier escena a pantalla completa sin guardar respuestas.",
        prioridad: "media",
        estado: "implementado",
        origen: "experienceRiskStats en src/lib/experience-data.ts, src/components/admin/ActivityResults.tsx, src/app/admin/escena/[key]/page.tsx",
        notas: "El admin de empresa solo ve las respuestas de su empresa (companyFilter). Desde el 2026-09-26 el resumen se filtra por cargo, departamento y municipio (RF-914).",
        relacionados: ["RF-202", "RF-904", "RF-914"],
      },
      {
        id: "RF-907",
        titulo: "Estación 2 de la ruta del café: transporte y conducción",
        descripcion:
          "Ramiro lleva el café pergamino en su yipao por una carretera destapada de montaña hasta la cooperativa. En tres momentos (salir, manejar, descargar) el participante encuentra siete riesgos de tránsito y de fatiga: carga alta y suelta, un pasajero encima de la carga, llanta lisa, celular al volante, sin cinturón, sueño y el yipao en bajada sin freno ni tacos. Mientras maneja, la vía corre por debajo y la cámara se acerca a la cabina. Al final ve el viaje hecho bien y gana la insignia Conductor seguro.",
        prioridad: "alta",
        estado: "implementado",
        origen:
          "src/components/experience/scenes/transporte.ts, src/components/experience/scenes/transporte-art.ts, src/components/experience/scenes/transporte-map.ts, RUTA_CAFE_TRANSPORTE en src/lib/experiences/catalog.ts",
        verificacion:
          "Siete riesgos respondidos en la vista previa y flujo del participante con código en Chromium headless; capturas de momentos, historia y final con node scripts/escena-png.mts <carpeta> 2 --escena=transporte --zonas.",
        notas:
          "Decisiones del usuario (2026-09-24): Willys (yipao), conducción animada sin minijuego y Ramiro al volante. Respaldo: Ley 769 de 2002 (arts. 28, 30, 82, 83 y 131 C.21, C.37, C.38) y Resolución 40595 de 2022 (PESV). Detalle en docs/investigacion-ux-habbo.md, sección 8.",
        relacionados: ["RF-903", "RF-908"],
      },
      {
        id: "RF-908",
        titulo: "Serie encadenada: la ruta se juega con un solo código",
        descripcion:
          "Las estaciones de una serie se juegan en orden con el código de la primera: al terminar una se desbloquea la siguiente y, al volver, el participante sigue en la primera estación con riesgos pendientes. El avance y el puntaje se calculan sobre todos los riesgos de la ruta y solo se termina la actividad al cerrar la última estación.",
        prioridad: "alta",
        estado: "implementado",
        origen:
          "seriesFrom y seriesEntry en src/lib/experiences/catalog.ts, missionStations en src/lib/experience-data.ts, ExperiencePlayer en src/components/experience/ExperiencePlayer.tsx",
        verificacion:
          "Tests de serie en src/lib/experiences.test.mts (ids únicos en toda la ruta, orden, puntaje sobre 14 riesgos); en el navegador, finca a transporte con recarga a mitad de ruta y cierre, con 14 respuestas y puntaje verificados en la base.",
        notas:
          "Sin cambios de base de datos: los ids de riesgo son únicos en toda la serie, así las respuestas de todas las estaciones caben en la misma participación. Las estaciones siguientes no se asignan solas a una empresa; el reporte de la actividad agrupa los riesgos por estación. Desde el 2026-09-26 entre estación y estación se vuelve al mapa de la ruta (RF-912).",
        relacionados: ["RF-902", "RF-904", "RF-906", "RF-912"],
      },
      {
        id: "RF-909",
        titulo: "Estación 3 de la ruta del café: la trilladora",
        descripcion:
          "Fabio, operario, recibe el pergamino en la bodega de una trilladora dibujada como una sala de Habbo. En tres momentos (recibir, trillar, destrabar) el participante encuentra siete riesgos: saco de 70 kg al hombro, arrume alto y ladeado, montacargas sin carril marcado, ruido sin protección auditiva, polvo sin tapabocas, correa sin guarda y destrabar la máquina encendida. Al trillar y destrabar la cámara se acerca a la máquina. Al final ve el trabajo bien hecho (carretilla, estiba con esquineros, franjas, protección personal, guarda y bloqueo con candado y tarjeta) y gana la insignia Operario seguro.",
        prioridad: "alta",
        estado: "implementado",
        origen:
          "src/components/experience/scenes/trilladora.ts, src/components/experience/scenes/trilladora-art.ts, src/components/experience/scenes/trilladora-map.ts, RUTA_CAFE_TRILLADORA en src/lib/experiences/catalog.ts",
        verificacion:
          "Siete riesgos respondidos en la vista previa y ruta completa de participante (finca, transporte y trilladora) con código en Chromium headless: 21 respuestas y cierre verificados en la base. Capturas con node scripts/escena-png.mts <carpeta> 2 --escena=trilladora --zonas.",
        notas:
          "Ruta decidida por el usuario (2026-09-24): cinco estaciones (finca, transporte, trilladora, tostión y tienda). Respaldo: Resolución 2400 de 1979 (arts. 88, 128, 177, 203, 267, 392 y 396) y estudios sobre polvo de café en plantas. La cámara con zoom quedó como pieza común (Camera en scenes/common.ts). Detalle en docs/investigacion-ux-habbo.md, sección 9.",
        relacionados: ["RF-907", "RF-908"],
      },
      {
        id: "RF-910",
        titulo: "Estación 4 de la ruta del café: la tostión",
        descripcion:
          "Luz, maestra tostadora, trabaja en una planta de tostión (sala de Habbo con tostadora de tambor, cilindro de gas, colector de cascarilla, extractor, bandeja de enfriamiento, molino y estante). En tres momentos (preparar, tostar, enfriar) el participante encuentra siete riesgos: buscar una fuga de gas con llama, extensión regada por el piso, cascarilla acumulada junto al fuego, humo sin extracción, muestra sin guantes, pelo suelto sobre las aspas y granos regados en el piso. Al final ve el trabajo bien hecho y gana la insignia Tostadora segura.",
        prioridad: "alta",
        estado: "implementado",
        origen:
          "src/components/experience/scenes/tostion.ts, src/components/experience/scenes/tostion-art.ts, src/components/experience/scenes/tostion-map.ts, RUTA_CAFE_TOSTION en src/lib/experiences/catalog.ts",
        verificacion:
          "Siete riesgos respondidos en la vista previa y ruta completa de participante (cuatro estaciones) con código en Chromium headless: 28 respuestas y cierre verificados en la base. Capturas con node scripts/escena-png.mts <carpeta> 2 --escena=tostion --zonas.",
        notas:
          "Respaldo: Resolución 2400 de 1979 (arts. 29, 32, 121, 125, 161, 171, 177, 536 y 543) y evaluaciones de NIOSH en tostadoras (monóxido de carbono y diacetilo). El avatar ganó pelo largo, moño, cofia y la opción sin bigote. La sala de la trilladora quedó parametrizada (con o sin puerta, colores). Detalle en docs/investigacion-ux-habbo.md, sección 10.",
        relacionados: ["RF-908", "RF-909"],
      },
      {
        id: "RF-911",
        titulo: "Estación 5 de la ruta del café: la tienda (cierre de la ruta)",
        descripcion:
          "Sara, barista, abre la tienda, prepara bebidas y atiende la hora pico en una sala de Habbo con barra, vitrina, caja, máquina de espresso, lavaplatos, estante alto y una fila de clientes. En tres momentos (abrir, preparar, atender) el participante encuentra siete riesgos: chanclas para trapear, piso mojado sin aviso, regleta mojada junto al lavaplatos, la mano bajo el vapor de la lanceta, un cuchillo escondido en el lavaplatos, subirse a un butaco y atender sola la hora pico con un cliente agresivo. Al final ve el trabajo bien hecho, gana la insignia Barista segura y cierra la Ruta del café.",
        prioridad: "alta",
        estado: "implementado",
        origen:
          "src/components/experience/scenes/tienda.ts, src/components/experience/scenes/tienda-art.ts, src/components/experience/scenes/tienda-map.ts, RUTA_CAFE_TIENDA en src/lib/experiences/catalog.ts",
        verificacion:
          "Siete riesgos respondidos en la vista previa y ruta completa de participante (cinco estaciones) con código en Chromium headless: 35 respuestas distintas y cierre verificados en la base. El test de ids únicos en la serie detectó un choque (calzado en la finca y en la tienda) y se corrigió antes de publicar.",
        notas:
          "Respaldo: Resolución 2400 de 1979 (arts. 32, 121, 176, 177, 365, 642 y 643), Resolución 2646 de 2008 (riesgo psicosocial) y la guía de OSHA para trabajo en restaurantes. El resumen de la última estación celebra la ruta completa y la biblioteca ya no muestra la tarjeta de estación en construcción. Detalle en docs/investigacion-ux-habbo.md, sección 11.",
        relacionados: ["RF-908", "RF-910"],
      },
      {
        id: "RF-912",
        titulo: "Mapa de la ruta, bienvenida de Ramiro y tutorial",
        descripcion:
          "El participante llega a un mapa de la ruta con las estaciones en zigzag unidas por un camino de tierra: ve cuáles terminó, cuál sigue y cuáles siguen cerradas, y entra a cada una desde su ficha. La primera vez, Ramiro da la bienvenida encima del mapa en un diálogo de máquina de escribir (qué es la misión, cuántas estaciones y minutos, cómo se ganan los granos y que se puede parar y seguir después). En la primera estación, un tutorial enseña los controles antes de buscar. Una barra superior, como la de Habbo, muestra la marca, dónde está, el monedero de granos y riesgos, el sonido, volver al mapa y salir.",
        prioridad: "alta",
        estado: "implementado",
        origen:
          "src/components/experience/RouteHub.tsx, src/components/experience/TopBar.tsx, src/components/experience/progress.ts, src/components/experience/ExperiencePlayer.tsx, src/components/experience/player.module.css",
        verificacion: "Revisión manual en la vista previa del admin (/admin/escena/<clave>), que muestra la bienvenida con una ficha de ejemplo sin guardar nada.",
        notas:
          "Granos: 100 por riesgo acertado a la primera y 25 por encontrado con error (GRAINS_CORRECT y GRAINS_FOUND en src/lib/experiences/texts.ts); la duración total suma el campo minutes de cada estación. El tutorial sale una vez por navegador (localStorage, con respaldo si no hay almacenamiento). Quien ya tenía avance antes de que existiera la bienvenida no la ve. Con movimiento reducido el texto sale completo, sin máquina de escribir.",
        relacionados: ["RF-908", "RF-913", "RNF-28"],
      },
      {
        id: "RF-913",
        titulo: "Ficha del participante: cargo y lugar de listas cerradas",
        descripcion:
          "Al cerrar la bienvenida, el participante elige su cargo de la lista que armó el admin al asignar la actividad y su departamento y municipio de la DIVIPOLA del DANE (33 departamentos, 1.122 municipios). Cada código decide qué pide: cargo, lugar, ambos o nada. Al asignar otra actividad a la misma empresa, el formulario propone sus últimos cargos.",
        prioridad: "alta",
        estado: "implementado",
        origen:
          "src/lib/profile.ts, src/lib/participant-profile.ts, src/lib/colombia.ts, saveWelcome en src/lib/experience-actions.ts, src/components/admin/AssignForm.tsx, tablas activity_code_profile y participant_profiles en db/schema.sql",
        verificacion:
          "src/lib/profile.test.mts: DIVIPOLA completa y sin códigos repetidos, lectura de la lista de cargos (vacíos, repetidos, límites) y validación de la ficha contra las listas. La columna municipio solo admite 5 dígitos (CHECK en la base).",
        notas:
          "Solo listas cerradas para que los reportes se filtren sin \"Bogota\", \"bogotá\" y \"Bta\" por separado. Se guarda el código DANE del municipio; los dos primeros dígitos son el departamento. Lo que el código no pide se guarda vacío aunque llegue. La ficha se puede guardar con la actividad pausada: son datos del participante, no respuestas. Producción necesita scripts/migrate.mjs para las dos tablas nuevas.",
        relacionados: ["RF-301", "RF-912", "RF-914", "RF-002"],
      },
      {
        id: "RF-914",
        titulo: "Resultados por cargo y lugar, y CSV de participantes",
        descripcion:
          "El resumen por riesgo de una actividad se filtra por cargo, departamento y municipio, con las opciones que de verdad respondieron sus participantes. El botón \"CSV de participantes\" descarga una fila por persona con empresa, código, nombre, cargo, departamento, municipio, código DANE, avance, puntaje, estado e inicio, con el mismo filtro aplicado.",
        prioridad: "media",
        estado: "implementado",
        origen:
          "profileOptions, experienceRiskStats y listProfiledParticipants en src/lib/experience-data.ts, src/components/admin/ProfileFilters.tsx, src/app/admin/(portal)/actividades/[id]/participantes/route.ts",
        notas:
          "Mismo alcance que la página: el admin de empresa solo ve y exporta la suya, y ?empresa= limita el CSV a una sola. El municipio manda sobre el departamento si llegan los dos. El CSV usa BOM UTF-8 y csvCell, como RF-204.",
        relacionados: ["RF-204", "RF-906", "RF-913"],
      },
      {
        id: "RF-915",
        titulo: "Ayudas para encontrar los errores de la escena",
        descripcion:
          "La escena ayuda sin que el participante tenga que pedirlo. Si pasan 15 segundos sin tocar nada, o fallan 3 toques seguidos, un anillo dorado pulsante señala un riesgo pendiente del momento actual; si sigue sin salir, 12 segundos después se suma la pista escrita. Si en el momento actual ya encontró todo, late la pestaña del momento que aún tiene pendientes. Cada pestaña de momento muestra cuántos riesgos lleva encontrados (o un check). Los riesgos por encontrar del panel se tocan: despliegan una pista corta de dónde mirar, cambian la escena al momento donde está el riesgo y lo señalan. Un toque junto a un riesgo avisa \"Estás cerca\" y en pantallas táctiles la zona de toque es más generosa.",
        prioridad: "alta",
        estado: "implementado",
        origen:
          "autoHelp, showStar, openClue, nearPending y StarRing en src/components/experience/ExperiencePlayer.tsx, campo clue de RiskDef en src/lib/experiences/types.ts y sus 35 textos en src/lib/experiences/catalog.ts, estilos .ring, .momentCount, .momentNudge y .questClue en player.module.css",
        verificacion:
          "src/lib/experiences.test.mts: cada riesgo trae una pista de 15 a 90 caracteres que no repite la respuesta correcta. Revisión en Chromium en escritorio y celular: ayuda tras 3 toques fallidos y tras 14 s de inactividad, segundo nivel con pista escrita, pista del panel, aviso de cercanía y pestaña del siguiente momento.",
        notas:
          "Decisión del usuario (2026-10-01): la ayuda es gratis, no resta granos, y el botón Pista se conserva. Las pistas viven en el código, no en la base: cambiarlas es un cambio de código y no requiere migración. La estrella dibujada en la escena mide pocos píxeles y casi no se veía en celular, por eso se le suma un anillo HTML que sigue a la zona. Quedaron descartados por ahora los marcadores permanentes sobre todas las zonas, porque convertirían la búsqueda en juzgar zonas ya marcadas.",
        relacionados: ["RF-908", "RF-912", "RNF-18"],
      },
      {
        id: "RF-916",
        titulo: "La escena aguanta mala conexión, pausas y vencimientos",
        descripcion:
          "Si la señal se corta o se cuelga al responder, la pregunta sigue abierta, se marca la opción elegida y se avisa con un mensaje claro; al volver la señal la respuesta se reenvía sola, o se puede tocar de nuevo. Un aviso fijo arriba dice \"Sin conexión\" mientras no haya red. Al abrir una pregunta se comprueba que la actividad siga abierta: si se pausó, venció o terminó la sesión, una ventana lo explica antes de elegir (la pausa deja \"Comprobar de nuevo\"; las demás, volver al inicio). \"Terminar la ruta\", \"Ya no encuentro más\" y guardar la ficha de bienvenida avisan y dejan reintentar en vez de congelarse.",
        prioridad: "alta",
        estado: "implementado",
        origen:
          "choose, recheck, reportBlocked y el efecto de comprobación en src/components/experience/ExperiencePlayer.tsx, src/components/experience/connection.tsx, src/components/experience/FinishRouteButton.tsx, src/lib/with-timeout.ts, checkActivity, completeExperience y BlockReason en src/lib/experience-actions.ts",
        verificacion:
          "src/lib/with-timeout.test.mts. Revisión en Chromium (escritorio y celular) con la red cortada y restaurada: aviso, pregunta abierta, reenvío automático y respuesta guardada una sola vez; pausa y vencimiento durante el juego con la ventana correcta.",
        notas:
          "Reintentar es seguro porque el servidor guarda la primera respuesta de cada riesgo (INSERT OR IGNORE) y devuelve la guardada. Pasados 20 s sin respuesta se trata como fallo; la petición original no se cancela. Antes, un corte de red dejaba la ventana de la pregunta congelada y una pausa solo se sabía después de elegir. completeExperience reemplaza a finishExperience: devuelve un resultado en vez de redirigir y el cliente navega al cierre.",
        relacionados: ["RF-912", "RF-915", "RNF-18"],
      },
      {
        id: "RF-917",
        titulo: "Cierre personal de la ruta y repaso",
        descripcion:
          "Al terminar la ruta, la pantalla de misión cumplida muestra el resultado de la persona: riesgos a la primera, encontrados, granos, las insignias de las estaciones y hasta 3 prácticas de lo que no le salió a la primera (primero lo que no encontró) bajo \"Llévate a tu turno\". Debajo, \"Repasa lo que viste\" despliega cada estación con todos sus riesgos: cómo le fue, lo que eligió frente a lo correcto, la explicación y la práctica. Las misiones que no son de escenas siguen como antes.",
        prioridad: "media",
        estado: "implementado",
        origen:
          "buildRecap en src/lib/experiences/recap.ts, participationRecap en src/lib/experience-data.ts, src/components/experience/RouteRecap.tsx, src/app/mision/completada/page.tsx",
        verificacion:
          "src/lib/experiences.test.mts (resumen personal: clasificación, orden de prácticas, textos editados). Revisión en Chromium en escritorio y celular con una participación de 35 respuestas mezcladas.",
        notas:
          "El repaso usa <details>, sin JavaScript, para cargar rápido con señal débil. Usa los textos vigentes (los que edita el superadmin). No es un certificado ni la encuesta antes/después, que siguen descartados por ahora.",
        relacionados: ["RF-912", "RF-913"],
      },
      {
        id: "RF-918",
        titulo: "Lupa y viñeta de acercamiento en la escena",
        descripcion:
          "En el celular la escena se ve a ~0,9x y los detalles de 2 a 4 px se pierden. Mientras se busca, la escena se acerca hasta 3x pellizcando con dos dedos (o con Ctrl y la rueda o el trackpad en el computador) o con los botones de lupa de la esquina, con los píxeles nítidos; con un dedo se mueve la vista. Tocar con la lupa puesta sigue marcando riesgos, y el toque cuenta al soltar, así arrastrar o pellizcar no abre preguntas. La estrella de ayuda lleva la vista hasta el riesgo. Al tocar una zona, la ventana de la pregunta muestra arriba un recorte ampliado y animado de lo tocado para confirmar qué es antes de responder; la ventana del resultado lo repite mientras se juega.",
        prioridad: "alta",
        estado: "implementado",
        origen:
          "Gestos, vista (--vz, --vx, --vy), sceneLeft y sceneTop en src/components/experience/SceneCanvas.tsx; ZoneLoupe, botones de lupa y foco de la estrella en src/components/experience/ExperiencePlayer.tsx; iconos lupa y alejar en PixelIcon.tsx; estilos .zoomBar y .loupe en player.module.css",
        verificacion:
          "Revisión en Chromium con celular emulado (390 px, toque real por CDP): pellizco a 3x sin abrir preguntas, arrastre, botones, toque con zoom que abre la pregunta con viñeta, pista que centra la vista y anillo sobre la estrella. En escritorio (1366 px) el clic abre la pregunta con su viñeta.",
        notas:
          "No cambia el arte: sirve para todas las escenas, también las futuras. La lupa solo funciona en la búsqueda; la historia y la forma correcta se ven completas. Sin lupa, un dedo sobre la escena sigue haciendo scroll de la página. El retoque puntual de objetos difíciles (cuchillo, celular, cinturón, llanta) queda para donde la lupa no alcance, según pendientes.md.",
        relacionados: ["RF-912", "RF-915", "RNF-18"],
      },
    ],
  },
];

// --- Requerimientos no funcionales (categorías ISO/IEC 25010) ------------------

export const REQUISITOS_NO_FUNCIONALES: Modulo[] = [
  {
    id: "seguridad",
    nombre: "Seguridad",
    items: [
      {
        id: "RNF-01",
        titulo: "Contraseñas con scrypt",
        descripcion:
          "Las contraseñas se guardan como scrypt$salt$hash con sal aleatoria por usuario y se comparan en tiempo constante.",
        prioridad: "alta",
        estado: "implementado",
        origen: "hashPassword, verifyPassword en src/lib/auth.ts",
        notas: "Crypto nativo de Node, sin dependencias ni proveedor externo de identidad.",
      },
      {
        id: "RNF-02",
        titulo: "Sesiones opacas con token hasheado",
        descripcion:
          "La sesión es un token aleatorio de 32 bytes en cookie httpOnly, secure y SameSite=Lax; la base solo guarda su SHA-256 y vence a los 7 días.",
        prioridad: "alta",
        estado: "implementado",
        origen: "createSession, currentUser en src/lib/auth.ts, tabla sessions",
        notas: "Una fuga de la tabla sessions no permite suplantar a nadie. Las sesiones vencidas se borran en cada login (purgeExpiredSessions).",
      },
      {
        id: "RNF-03",
        titulo: "Límite de intentos contra fuerza bruta",
        descripcion:
          "El login admite 10 intentos por IP cada 5 minutos y 5 por usuario desde una misma IP cada 15 (atado a la IP para que nadie pueda bloquear al superadmin desde fuera); los códigos de actividad y los PIN, 15 fallos por IP por minuto.",
        prioridad: "alta",
        estado: "implementado",
        origen: "src/lib/rate-limit.ts, tabla rate_limit_hits",
        notas:
          "En la entrada de participantes solo cuentan los fallos: un equipo entero entra desde la misma IP de la oficina. La ventana se calcula en SQLite porque comparar su formato de fecha con ISO nunca limitaba (bug corregido el 22 sep 2026).",
        relacionados: ["RF-001", "RF-101", "RF-601"],
      },
      {
        id: "RNF-04",
        titulo: "Identificadores no adivinables",
        descripcion: "Los ids de participaciones y jugadores que viajan en cookies son aleatorios (16 bytes), nunca secuenciales.",
        prioridad: "alta",
        estado: "implementado",
        origen: "participations.id, live_players.id",
      },
      {
        id: "RNF-05",
        titulo: "Aislamiento por empresa en el servidor",
        descripcion:
          "Un admin de empresa nunca recibe datos de otra: el filtro se aplica en SQL en el servidor, también en el CSV y en las partidas, y los campos de empresa del formulario se ignoran.",
        prioridad: "alta",
        estado: "implementado",
        origen: "companyFilter en src/lib/scope.ts",
        verificacion: "src/lib/scope.test.mts",
        relacionados: ["RF-103"],
      },
      {
        id: "RNF-06",
        titulo: "Content Security Policy con nonce",
        descripcion:
          "Cada respuesta lleva una CSP con nonce por request y strict-dynamic, frame-ancestors 'none' y conexiones permitidas solo al propio sitio y a Ably.",
        prioridad: "media",
        estado: "implementado",
        origen: "src/proxy.ts",
      },
      {
        id: "RNF-07",
        titulo: "Mismo origen en las acciones en vivo",
        descripcion:
          "Los endpoints de /api/live exigen que cada POST venga del mismo sitio, igual que las Server Actions; los clientes de Ably solo reciben tokens de lectura.",
        prioridad: "alta",
        estado: "implementado",
        origen: "sameOrigin en src/lib/live-http.ts, createTokenRequest en src/lib/realtime.ts",
        notas: "Solo el servidor publica en Ably: ninguna respuesta llega al proyector sin pasar por validación y por el reloj del servidor.",
      },
      {
        id: "RNF-08",
        titulo: "Entrada del navegador tratada como no confiable",
        descripcion:
          "Todo lo que llega del cliente se valida y normaliza en el servidor: borradores de juegos, apodos (sin caracteres invisibles) y palabras de la nube.",
        prioridad: "alta",
        estado: "implementado",
        origen: "parseGameDraft, normalizeNickname, normalizeWord",
        verificacion: "live-validation.test.mts y live-engine.test.mts",
      },
    ],
  },
  {
    id: "fiabilidad",
    nombre: "Fiabilidad",
    items: [
      {
        id: "RNF-09",
        titulo: "El reloj lo manda el servidor",
        descripcion:
          "El inicio y el final de cada pregunta se guardan en epoch ms del servidor; una respuesta posterior al cierre (más 500 ms de margen de red) se rechaza.",
        prioridad: "alta",
        estado: "implementado",
        origen: "live_matches.question_ends_at, ANSWER_GRACE_MS, checkAnswer",
        verificacion: "live-engine.test.mts cubre respuestas en tiempo, en el margen y fuera de él.",
        notas: "El tiempo de respuesta se topa al límite, así que el margen no da ventaja.",
      },
      {
        id: "RNF-10",
        titulo: "Métricas calculadas, nunca guardadas",
        descripcion:
          "Participantes, avance, promedio, estado vencido, puntajes, rachas y ranking se calculan en cada consulta desde los datos base.",
        prioridad: "alta",
        estado: "implementado",
        origen: "db/schema.sql (comentarios de cabecera), src/lib/queries.ts",
        notas: "Evita contadores desincronizados a costa de consultas algo más pesadas, aceptable al volumen actual.",
      },
      {
        id: "RNF-11",
        titulo: "Recuperación ante eventos perdidos",
        descripcion:
          "Si un cliente pierde un evento de tiempo real, se resincroniza con la foto completa del estado; un evento que no encaja se ignora.",
        prioridad: "media",
        estado: "implementado",
        origen: "applyPublicEvent, applyHostEvent en src/lib/live-client-state.ts",
        verificacion: "src/lib/live-client-state.test.mts",
      },
      {
        id: "RNF-12",
        titulo: "Concurrencia optimista en la partida",
        descripcion:
          "El estado de la partida solo se guarda si la fila sigue como se leyó; si el host y la última respuesta cierran la pregunta a la vez, gana uno y el revelado no se publica dos veces.",
        prioridad: "alta",
        estado: "implementado",
        origen: "src/lib/live-match.ts",
        notas: "La restricción UNIQUE(player_id, question_id) también frena dobles envíos de respuesta.",
      },
      {
        id: "RNF-13",
        titulo: "Todo en capas gratuitas",
        descripcion:
          "El sistema funciona sin pagar ningún servicio: Vercel Hobby, Turso free y Ably free (6M mensajes al mes, 200 conexiones simultáneas).",
        prioridad: "alta",
        estado: "implementado",
        origen: "src/lib/realtime.ts, MAX_PLAYERS en src/lib/live-match.ts",
        notas:
          "Restricción del proyecto. Por eso no hay Redis ni WebSockets propios y se topa a 100 jugadores por partida. De la presencia de Ably solo participa el host (para avisar en los celulares que se desconectó): cada entrada o salida suya se reparte a lo sumo a 100 celulares, unos cientos de mensajes por partida. Los jugadores no entran en presencia, porque eso sí multiplicaría los mensajes. Vercel Hobby no admite uso comercial.",
        relacionados: ["RF-509"],
      },
    ],
  },
  {
    id: "eficiencia",
    nombre: "Eficiencia de desempeño",
    items: [
      {
        id: "RNF-14",
        titulo: "Cliente de base de datos liviano",
        descripcion: "El cliente de Turso se importa desde @libsql/client/web para no arrastrar unos 19 MB de binarios nativos a cada función.",
        prioridad: "media",
        estado: "implementado",
        origen: "src/lib/db.ts",
      },
      {
        id: "RNF-15",
        titulo: "Tiempo real sin conexiones largas en el servidor",
        descripcion:
          "Ninguna función queda abierta durante la partida: Ably reparte los eventos y las funciones de Vercel solo atienden requests cortos.",
        prioridad: "alta",
        estado: "implementado",
        origen: "src/lib/realtime.ts",
        notas: "Vercel Hobby corta las funciones a los 300 s: una partida de 20 minutos no cabe en una conexión.",
      },
      {
        id: "RNF-16",
        titulo: "Partida fluida con 50 jugadores",
        descripcion: "Con 50 celulares respondiendo a la vez, el proyector refleja el contador de respuestas en menos de un segundo.",
        prioridad: "alta",
        estado: "parcial",
        origen: "scripts/live-load.mjs",
        verificacion: "Prueba de carga con bots por HTTP contra /api/live y Ably (Fase 8).",
        notas: "Probado en local con 100 bots (~1.300 mensajes de Ably por corrida). Ably free limita 50 msg/s por canal: el canal del host es de mejor esfuerzo y el proyector se resincroniza cada 2 s. Falta medir contra un preview de Vercel.",
      },
    ],
  },
  {
    id: "usabilidad",
    nombre: "Usabilidad y accesibilidad",
    items: [
      {
        id: "RNF-17",
        titulo: "Interfaz en español y fiel al diseño",
        descripcion:
          "Todos los textos están en español y la interfaz sigue el prototipo de claude.ai/design y la marca Antídoto (paleta y tipografía).",
        prioridad: "media",
        estado: "implementado",
        origen: "src/lib/theme.ts, src/app/globals.css",
      },
      {
        id: "RNF-18",
        titulo: "Mensajes de error accionables",
        descripcion: "Cada error le dice a la persona qué pasó y qué hacer (esperar, contactar al administrador, revisar un campo).",
        prioridad: "media",
        estado: "implementado",
        origen: "src/lib/actions.ts, GameEditor.tsx",
      },
      {
        id: "RNF-19",
        titulo: "Respuestas distinguibles sin color",
        descripcion: "Las opciones de respuesta se reconocen por forma además de color, para daltónicos y proyectores con poco contraste.",
        prioridad: "media",
        estado: "implementado",
        origen: "src/components/live/AnswerShape.tsx",
      },
      {
        id: "RNF-20",
        titulo: "Foco visible y navegación por teclado",
        descripcion: "Enlaces y botones muestran foco visible al navegar con teclado.",
        prioridad: "media",
        estado: "parcial",
        origen: "src/app/globals.css",
        notas: "Falta una revisión completa con lector de pantalla, sobre todo en el editor de juegos.",
      },
      {
        id: "RNF-21",
        titulo: "Sonido y animación en el modo en vivo",
        descripcion: "La partida en vivo usa música, sonidos y animaciones para marcar tiempo, revelado y podio, con opción de silenciar.",
        prioridad: "baja",
        estado: "implementado",
        origen: "src/components/live/sound.ts, src/components/live/host/HostPodium.tsx, docs/investigacion-ux-kahoot.md",
        notas: "Sonido sintetizado solo en el proyector, con música y efectos por separado; vibración en el celular. Falta escuchar los graves en los parlantes reales de la sala.",
      },
      {
        id: "RNF-28",
        titulo: "Movimiento con respaldo (pase de misión)",
        descripcion:
          "La entrada, el login, el inicio del portal y misión cumplida usan un solo lenguaje de movimiento (pase impreso, celdas split-flap, sello). El HTML del servidor es el estado final: sin JS o con movimiento reducido todo se ve completo y quieto, y si el script llega tarde la entrada se omite.",
        prioridad: "media",
        estado: "implementado",
        origen: "src/components/motion, src/app/motion.css, src/lib/split-flap.ts, src/lib/guilloche.ts",
        verificacion:
          "split-flap.test.mts y guilloche.test.mts; capturas con Playwright en 1440x900 y 390x844, con y sin movimiento reducido.",
        notas: "Unos 31 KB gz de JS en la entrada y 28 KB gz en el portal, casi todo GSAP. Las repeticiones de la sesión solo hacen un fundido corto.",
      },
    ],
  },
  {
    id: "portabilidad",
    nombre: "Portabilidad y compatibilidad",
    items: [
      {
        id: "RNF-22",
        titulo: "Responsive: celular, portátil y proyector",
        descripcion:
          "La landing, la misión y el jugador en vivo se usan desde el celular; el portal desde portátil; el host se ve bien en un proyector.",
        prioridad: "alta",
        estado: "parcial",
        notas: "Landing, misión, escenas y jugador en vivo son responsive (desde el 2026-10-01 el celular acostado usa el diseño de celular). Falta probarlos en celulares y en un proyector reales.",
      },
      {
        id: "RNF-23",
        titulo: "Instalable como PWA",
        descripcion: "El sitio publica manifiesto e iconos (192, 512 y maskable) para instalarse en la pantalla de inicio.",
        prioridad: "baja",
        estado: "implementado",
        origen: "src/app/manifest.ts, src/app/pwa-icon-*",
      },
      {
        id: "RNF-24",
        titulo: "Desarrollo local sin la nube",
        descripcion: "Todo el sistema corre en local con turso dev, que habla el mismo protocolo HTTP que la base en la nube.",
        prioridad: "media",
        estado: "implementado",
        origen: "README.md, scripts/migrate.mjs, scripts/seed.mjs",
      },
    ],
  },
  {
    id: "mantenibilidad",
    nombre: "Mantenibilidad",
    items: [
      {
        id: "RNF-25",
        titulo: "Reglas del juego como lógica pura",
        descripcion: "El motor de la partida no toca red ni base de datos, así las reglas se prueban sin Ably ni Turso.",
        prioridad: "alta",
        estado: "implementado",
        origen: "src/lib/live-engine.ts, src/lib/live-validation.ts, src/lib/live-client-state.ts",
        verificacion: "Suite de node --test: npm test.",
      },
      {
        id: "RNF-26",
        titulo: "Esquema idempotente",
        descripcion: "db/schema.sql se puede aplicar varias veces sobre la misma base sin romperla (CREATE ... IF NOT EXISTS).",
        prioridad: "media",
        estado: "implementado",
        origen: "db/schema.sql, scripts/migrate.mjs",
      },
      {
        id: "RNF-27",
        titulo: "Documentación trazable al código",
        descripcion: "Requisitos, historias y kanban viven como datos tipados en el repo y un test comprueba que sus referencias cruzadas existen.",
        prioridad: "baja",
        estado: "implementado",
        origen: "src/data/documentacion.ts, src/data/iteraciones.ts",
        verificacion: "src/data/documentacion.test.mts",
      },
    ],
  },
];

/** Todos los requisitos en una lista plana, para buscar por id. */
export const TODOS_LOS_REQUISITOS: Requisito[] = [...REQUISITOS_FUNCIONALES, ...REQUISITOS_NO_FUNCIONALES].flatMap(
  (m) => m.items
);

export function contarPorEstado(modulos: Modulo[]): Record<Estado, number> {
  const cuenta: Record<Estado, number> = { implementado: 0, parcial: 0, planeado: 0 };
  for (const m of modulos) for (const r of m.items) cuenta[r.estado]++;
  return cuenta;
}

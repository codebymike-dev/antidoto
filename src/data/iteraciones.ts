// Kanban XP de Antídoto, reconstruido del historial real de git
// (mikerb95/antidoto). Mismo formato que el tablero de codebymike.net/docs/kanban:
// iteraciones con historias "Como X, quiero Y para Z", cada una con su
// Definition of Done y anclada a sus commits por rango de fechas.
//
// El "par" refleja la programación en pareja humano-IA: Mike conduce las
// decisiones de producto y diseño y un agente de IA actúa como navegador.

export const REPO = "https://github.com/mikerb95/antidoto";

/** Enlace a los commits de un rango de fechas en la rama principal. */
export function commitsUrl(since: string, until: string): string {
  return `${REPO}/commits/main/?since=${since}&until=${until}`;
}

export interface Par {
  nombre: string;
  rol: string;
  color: string;
}

export const PARES = {
  MR: { nombre: "Mike Rodríguez", rol: "Conductor (humano)", color: "#0F181D" },
  IA: { nombre: "Claude", rol: "Navegador (IA)", color: "#1C99CA" },
} satisfies Record<string, Par>;

export interface Columna {
  id: string;
  nombre: string;
  color: string;
}

export const COLUMNAS: Columna[] = [
  { id: "cola", nombre: "Cola (pendiente)", color: "#9FB8C2" },
  { id: "iteracion", nombre: "Planeada", color: "#5B4FC4" },
  { id: "desarrollo", nombre: "En desarrollo", color: "#1C99CA" },
  { id: "aceptacion", nombre: "En aceptación", color: "#C98A1B" },
  { id: "aceptada", nombre: "Aceptada", color: "#2E7D5B" },
];

export type EstadoDoD = "pass" | "fail" | "pend";

export interface CriterioDoD {
  texto: string;
  estado: EstadoDoD;
}

export interface Historia {
  id: string;
  titulo: string;
  tipo: "historia" | "bug" | "tarea" | "spike";
  valor: "alto" | "medio" | "bajo";
  col: "cola" | "iteracion" | "desarrollo" | "aceptacion" | "aceptada";
  par: keyof typeof PARES;
  fecha?: string;
  tags: string[];
  /** Requisitos que la historia implementa (ids de src/data/documentacion.ts). */
  requisitos: string[];
  dod: CriterioDoD[];
}

export interface Iteracion {
  id: string;
  fase: string;
  nombre: string;
  rango: string;
  /** Rango para el enlace a commits; nulo en iteraciones que aún no empiezan. */
  ghSince: string | null;
  ghUntil: string | null;
  /** Commits del periodo según el historial real. */
  commits?: number;
  resumen: string;
  historias: Historia[];
}

// Helpers de DoD para reducir ruido al escribir.
const ok = (texto: string): CriterioDoD => ({ texto, estado: "pass" });
const pend = (texto: string): CriterioDoD => ({ texto, estado: "pend" });

export const ITERACIONES: Iteracion[] = [
  {
    id: "it-prototipo",
    fase: "Fase 1 · Fundación",
    nombre: "Importación del prototipo de diseño",
    rango: "19 sep 2026",
    ghSince: "2026-09-19",
    ghUntil: "2026-09-19",
    commits: 31,
    resumen:
      "Se trae a Next.js el prototipo de claude.ai/design pantalla por pantalla: landing, misión, cierre, login y el portal admin completo, todavía con datos de ejemplo y estado en memoria. Fija la paleta, Poppins y los componentes base que el resto del proyecto reutiliza.",
    historias: [
      {
        id: "AN-01",
        titulo: "Como participante, quiero una landing clara donde escribir mi nombre y mi código para empezar mi misión sin crear cuenta",
        tipo: "historia",
        valor: "alto",
        col: "aceptada",
        par: "MR",
        fecha: "2026-09-19",
        tags: ["landing", "diseño"],
        requisitos: ["RF-001", "RF-002", "RF-003"],
        dod: [
          ok("LandingScreen con campos de nombre y código, casilla de política y modal legal."),
          ok("Fondo animado (Blobs), Poppins y paleta de marca aplicados desde theme.ts."),
        ],
      },
      {
        id: "AN-02",
        titulo: "Como administrador, quiero un portal con menú, actividades, detalle y configuración para gestionar las misiones de mis clientes",
        tipo: "historia",
        valor: "alto",
        col: "aceptada",
        par: "MR",
        fecha: "2026-09-19",
        tags: ["portal", "diseño"],
        requisitos: ["RF-201", "RF-202", "RF-301"],
        dod: [
          ok("AdminShell con navegación, campana de notificaciones y cierre de sesión."),
          ok("Pantallas de menú de actividades, detalle con comparación y configuración por pestañas."),
          ok("Copy en español fiel al prototipo."),
        ],
      },
    ],
  },
  {
    id: "it-backend",
    fase: "Fase 1 · Fundación",
    nombre: "Backend real sobre Turso",
    rango: "19 sep 2026",
    ghSince: "2026-09-19",
    ghUntil: "2026-09-19",
    commits: 21,
    resumen:
      "El prototipo pasa a tener datos de verdad: esquema en Turso, migración y seed, autenticación propia con scrypt y sesiones en tabla, participaciones con cookie y todas las pantallas del portal leyendo de la base. Se descarta Clerk para no sumar proveedor ni costo.",
    historias: [
      {
        id: "AN-03",
        titulo: "Como participante, quiero que mi entrada y mi avance queden guardados para volver a mi misión desde el mismo celular",
        tipo: "historia",
        valor: "alto",
        col: "aceptada",
        par: "IA",
        fecha: "2026-09-19",
        tags: ["turso", "participación"],
        requisitos: ["RF-001", "RF-004", "RF-005", "RF-007", "RNF-04"],
        dod: [
          ok("Tabla participations con id aleatorio y aceptación de política obligatoria."),
          ok("Cookie httpOnly de 30 días y página /mision con avance propio y del grupo."),
          ok("Código vencido rechazado con la fecha de vencimiento."),
        ],
      },
      {
        id: "AN-04",
        titulo: "Como administrador, quiero entrar al portal con mi usuario y contraseña para que solo el equipo autorizado vea los datos",
        tipo: "historia",
        valor: "alto",
        col: "aceptada",
        par: "IA",
        fecha: "2026-09-19",
        tags: ["auth", "seguridad"],
        requisitos: ["RF-101", "RF-102", "RNF-01", "RNF-02"],
        dod: [
          ok("Contraseñas scrypt$salt$hash comparadas en tiempo constante."),
          ok("Sesión opaca: token aleatorio en cookie, solo su SHA-256 en la tabla sessions."),
          ok("Seed crea el primer superadmin con SEED_ADMIN_*."),
        ],
      },
      {
        id: "AN-05",
        titulo: "Como admin de empresa, quiero ver solo las actividades y grupos de mi empresa para no mezclar datos con otros clientes",
        tipo: "historia",
        valor: "alto",
        col: "aceptada",
        par: "IA",
        fecha: "2026-09-19",
        tags: ["roles", "seguridad"],
        requisitos: ["RF-103", "RNF-05"],
        dod: [
          ok("Roles super y empresa con CHECK en admin_users."),
          ok("Filtro por empresa aplicado en SQL en todas las consultas del portal."),
        ],
      },
      {
        id: "AN-06",
        titulo: "Como administrador, quiero generar códigos, gestionar empresas y exportar resultados a CSV para operar las campañas sin tocar la base",
        tipo: "historia",
        valor: "alto",
        col: "aceptada",
        par: "IA",
        fecha: "2026-09-19",
        tags: ["configuración", "reportes"],
        requisitos: ["RF-204", "RF-205", "RF-301", "RF-302", "RF-303", "RF-304", "RF-305", "RF-306"],
        dod: [
          ok("Generación de códigos PREFIJO-EMPRESANN con reintento ante choque."),
          ok("Alta y baja de empresas, textos legales editables y bitácora de auditoría."),
          ok("Export CSV por actividad con BOM para Excel."),
          ok("Métricas calculadas desde participations, nunca guardadas."),
        ],
      },
    ],
  },
  {
    id: "it-pulido",
    fase: "Fase 2 · Pulido y endurecimiento",
    nombre: "Pulido visual, login por usuario y SEO",
    rango: "19 sep 2026",
    ghSince: "2026-09-19",
    ghUntil: "2026-09-20",
    commits: 34,
    resumen:
      "Pasada de acabado sobre todo lo construido: el login cambia de correo a usuario, los botones se unifican en clases con estados hover y foco, el login y la landing se vuelven responsive y cada página recibe metadata, iconos y sitemap.",
    historias: [
      {
        id: "AN-07",
        titulo: "Como administrador, quiero entrar con un nombre de usuario en vez de un correo para no depender de cuentas corporativas",
        tipo: "tarea",
        valor: "medio",
        col: "aceptada",
        par: "IA",
        fecha: "2026-09-19",
        tags: ["auth"],
        requisitos: ["RF-101"],
        dod: [ok("admin_users usa username único; el login lo normaliza a minúsculas.")],
      },
      {
        id: "AN-08",
        titulo: "Como participante, quiero que la landing y el login se vean bien en mi celular para entrar desde donde esté",
        tipo: "historia",
        valor: "medio",
        col: "aceptada",
        par: "MR",
        fecha: "2026-09-19",
        tags: ["responsive", "diseño"],
        requisitos: ["RNF-17", "RNF-22"],
        dod: [
          ok("Clases de botón unificadas (primario, secundario, relleno, icono, navegación) con hover."),
          ok("Landing y login responsive."),
          ok("Metadata por página, icono Apple, Open Graph y sitemap."),
        ],
      },
    ],
  },
  {
    id: "it-seguridad",
    fase: "Fase 2 · Pulido y endurecimiento",
    nombre: "Seguridad, PWA y páginas de error",
    rango: "20 sep 2026",
    ghSince: "2026-09-20",
    ghUntil: "2026-09-20",
    commits: 38,
    resumen:
      "Endurecimiento antes de abrirlo a clientes: límite de intentos en login y códigos, CSP con nonce desde proxy.ts, filtro por empresa extraído a una función pura con tests, páginas 404 y de error, y soporte PWA con iconos generados.",
    historias: [
      {
        id: "AN-09",
        titulo: "Como responsable del sistema, quiero limitar los intentos de login y de códigos para que nadie adivine credenciales ni códigos por fuerza bruta",
        tipo: "historia",
        valor: "alto",
        col: "aceptada",
        par: "IA",
        fecha: "2026-09-20",
        tags: ["seguridad", "rate-limit"],
        requisitos: ["RNF-03"],
        dod: [
          ok("Tabla rate_limit_hits con límites por IP y por usuario en el login."),
          ok("En la entrada de participantes solo cuentan los fallos (un equipo comparte IP)."),
          ok("Poda global probabilística de filas viejas."),
        ],
      },
      {
        id: "AN-10",
        titulo: "Como responsable del sistema, quiero una Content Security Policy estricta para reducir el impacto de cualquier inyección de scripts",
        tipo: "tarea",
        valor: "medio",
        col: "aceptada",
        par: "IA",
        fecha: "2026-09-20",
        tags: ["seguridad", "csp"],
        requisitos: ["RNF-06"],
        dod: [
          ok("proxy.ts genera un nonce por request con strict-dynamic y frame-ancestors 'none'."),
          ok("Imágenes permitidas solo del sitio y de antidotocolombia.com."),
        ],
      },
      {
        id: "AN-11",
        titulo: "Como desarrollador, quiero el filtro por empresa como función pura con tests para que un cambio no filtre datos de otro cliente",
        tipo: "tarea",
        valor: "alto",
        col: "aceptada",
        par: "IA",
        fecha: "2026-09-20",
        tags: ["tests", "roles"],
        requisitos: ["RNF-05", "RNF-25"],
        dod: [
          ok("companyFilter en src/lib/scope.ts usado por todas las consultas."),
          ok("scope.test.mts con node --test."),
          ok("Un admin de empresa sin códigos en una misión no ve su metadata."),
        ],
      },
      {
        id: "AN-12",
        titulo: "Como participante, quiero instalar Antídoto en mi pantalla de inicio y ver páginas de error amables si algo falla",
        tipo: "historia",
        valor: "bajo",
        col: "aceptada",
        par: "MR",
        fecha: "2026-09-20",
        tags: ["pwa", "errores"],
        requisitos: ["RNF-23", "RNF-18"],
        dod: [
          ok("Manifiesto con iconos 192, 512 y maskable generados desde el logo vectorial."),
          ok("Páginas not-found, error y global-error con el estilo de la marca."),
        ],
      },
    ],
  },
  {
    id: "it-vivo-base",
    fase: "Fase 3 · Módulo en vivo",
    nombre: "Juegos en vivo: editor, motor y API",
    rango: "22 sep 2026",
    ghSince: "2026-09-22",
    ghUntil: "2026-09-22",
    commits: 17,
    resumen:
      "La demo simulada de sesión en vivo se reemplaza por un módulo tipo Kahoot real, con la restricción de usar solo capas gratuitas. Un spike confirma Ably free como transporte; el estado y el reloj viven en Turso. Se construyen el editor de juegos, el motor puro con sus tests y los endpoints de /api/live (fases 0 a 4 del plan).",
    historias: [
      {
        id: "AN-13",
        titulo: "Como desarrollador, quiero probar Ably con un canal de ensayo para confirmar que el tiempo real cabe en la capa gratuita",
        tipo: "spike",
        valor: "alto",
        col: "aceptada",
        par: "IA",
        fecha: "2026-09-22",
        tags: ["ably", "spike"],
        requisitos: ["RNF-13", "RNF-15"],
        dod: [
          ok("Canal de prueba con suscripción y manejo de errores de conexión."),
          ok("Decisión registrada: sin WebSockets en Vercel ni Upstash; sin presencia de Ably."),
          ok("Módulo de prueba retirado al cerrar el spike."),
        ],
      },
      {
        id: "AN-14",
        titulo: "Como administrador, quiero crear juegos con preguntas de quiz, verdadero/falso, encuesta y nube de palabras para reutilizarlos en mis sesiones",
        tipo: "historia",
        valor: "alto",
        col: "aceptada",
        par: "IA",
        fecha: "2026-09-22",
        tags: ["editor", "juegos"],
        requisitos: ["RF-401", "RF-402", "RF-403", "RF-404", "RF-405", "RF-406"],
        dod: [
          ok("Tablas live_games, live_questions y live_options."),
          ok("Editor con validación en vivo y la misma validación pura en el servidor."),
          ok("Juegos globales y de empresa con permisos probados en scope.test.mts."),
          ok("Juego con partidas en solo lectura, con opción de duplicar."),
        ],
      },
      {
        id: "AN-15",
        titulo: "Como host, quiero que el servidor controle el reloj y el puntaje para que ninguna respuesta tardía o manipulada cambie el ranking",
        tipo: "historia",
        valor: "alto",
        col: "aceptada",
        par: "IA",
        fecha: "2026-09-22",
        tags: ["motor", "tests"],
        requisitos: ["RF-505", "RF-506", "RF-508", "RNF-09", "RNF-12", "RNF-25"],
        dod: [
          ok("live-engine.ts puro: comandos del host, puntaje por rapidez, racha y ranking."),
          ok("31 tests en live-engine.test.mts."),
          ok("Concurrencia optimista al guardar el estado de la partida."),
        ],
      },
      {
        id: "AN-16",
        titulo: "Como jugador, quiero unirme con un PIN y un apodo y responder desde mi celular por una API segura",
        tipo: "historia",
        valor: "alto",
        col: "aceptada",
        par: "IA",
        fecha: "2026-09-22",
        tags: ["api", "seguridad"],
        requisitos: ["RF-501", "RF-509", "RF-601", "RF-602", "RNF-07", "RNF-08"],
        dod: [
          ok("Route Handlers en /api/live con verificación de mismo origen."),
          ok("Tokens de Ably de solo lectura; solo el servidor publica."),
          ok("Apodo normalizado y único por partida; tope de 100 jugadores."),
          ok("Probado de punta a punta con bots por HTTP."),
        ],
      },
      {
        id: "AN-17",
        titulo: "Como participante, quiero poder entrar aunque mis compañeros usen la misma red, sin que el límite de intentos nos bloquee",
        tipo: "bug",
        valor: "alto",
        col: "aceptada",
        par: "IA",
        fecha: "2026-09-22",
        tags: ["rate-limit", "bug"],
        requisitos: ["RNF-03"],
        dod: [
          ok("La ventana se calcula en SQLite: la comparación de fechas SQLite contra ISO nunca limitaba."),
          ok("isLimited + recordHit para contar solo los fallos en entradas masivas."),
        ],
      },
    ],
  },
  {
    id: "it-vivo-host",
    fase: "Fase 3 · Módulo en vivo",
    nombre: "Pantalla del host en el proyector",
    rango: "22 sep 2026 - en curso",
    ghSince: "2026-09-22",
    ghUntil: "2026-09-23",
    commits: 6,
    resumen:
      "Fase 5 del plan: la pantalla que se proyecta en la sala. Sala de espera con PIN y QR, pregunta con cuenta regresiva, revelado con resultados, ranking y podio, guiados por la investigación UX de Kahoot. La capa que aplica los eventos de Ably al estado del cliente está escrita y con tests, pendiente de integrar.",
    historias: [
      {
        id: "AN-18",
        titulo: "Como host, quiero proyectar la sala de espera con el PIN, un QR y los apodos que llegan para que el grupo entre rápido",
        tipo: "historia",
        valor: "alto",
        col: "aceptacion",
        par: "MR",
        fecha: "2026-09-22",
        tags: ["host", "proyector"],
        requisitos: ["RF-502", "RF-503", "RF-504"],
        dod: [
          ok("HostLobby con PIN, QR y lista de jugadores."),
          ok("Abrir y cerrar la entrada; expulsar con doble toque."),
          pend("Prueba en un proyector real con un grupo."),
        ],
      },
      {
        id: "AN-19",
        titulo: "Como host, quiero conducir la partida desde el proyector (pregunta, revelado, ranking, podio) para que todo el grupo la siga en pantalla",
        tipo: "historia",
        valor: "alto",
        col: "desarrollo",
        par: "IA",
        fecha: "2026-09-22",
        tags: ["host", "tiempo-real"],
        requisitos: ["RF-505", "RF-506", "RF-507", "RF-508", "RNF-11", "RNF-19"],
        dod: [
          ok("HostQuestion, HostReveal, HostLeaderboard y HostPodium con los cuatro estilos de respuesta."),
          ok("Cuenta regresiva corregida con el desfase del reloj del servidor."),
          ok("applyPublicEvent/applyHostEvent puros con tests (live-client-state.test.mts)."),
          pend("HostScreen usando live-client-state para resincronizar tras eventos perdidos."),
          pend("Partida completa de punta a punta con bots viéndose en el proyector."),
        ],
      },
    ],
  },
  {
    id: "it-vivo-jugador",
    fase: "Fase 3 · Módulo en vivo",
    nombre: "Pantalla del jugador",
    rango: "Planeada",
    ghSince: null,
    ghUntil: null,
    resumen:
      "Fase 6: la experiencia en el celular. Toda la API ya existe; falta la interfaz que la usa, pensada para una mano, conexión inestable y pantallas pequeñas.",
    historias: [
      {
        id: "AN-20",
        titulo: "Como jugador, quiero entrar escaneando el QR o escribiendo el PIN y mi apodo para unirme en segundos desde mi celular",
        tipo: "historia",
        valor: "alto",
        col: "iteracion",
        par: "IA",
        tags: ["jugador", "celular"],
        requisitos: ["RF-601", "RF-002"],
        dod: [
          pend("Pantalla de PIN que acepta el enlace del QR ya con el PIN puesto."),
          pend("Apodo con aceptación de política y errores claros (apodo en uso, partida llena, entrada cerrada)."),
        ],
      },
      {
        id: "AN-21",
        titulo: "Como jugador, quiero responder tocando la forma de la opción y ver al instante si acerté y mi posición",
        tipo: "historia",
        valor: "alto",
        col: "iteracion",
        par: "IA",
        tags: ["jugador", "celular"],
        requisitos: ["RF-602", "RF-603", "RNF-19", "RNF-22"],
        dod: [
          pend("Fichas de respuesta con forma y color, usables con una mano."),
          pend("Resultado propio tras el revelado: acierto, puntos, racha y posición."),
          pend("Campo de texto para la nube de palabras."),
        ],
      },
      {
        id: "AN-22",
        titulo: "Como jugador, quiero volver a la partida si se me bloquea el celular o pierdo señal, sin perder mis puntos",
        tipo: "historia",
        valor: "alto",
        col: "iteracion",
        par: "IA",
        tags: ["jugador", "reconexión"],
        requisitos: ["RF-604", "RF-605", "RNF-11"],
        dod: [
          pend("Resincronización con /api/live/me al volver al primer plano."),
          pend("Salir de la partida libera el celular para otra."),
        ],
      },
    ],
  },
  {
    id: "it-vivo-cierre",
    fase: "Fase 3 · Módulo en vivo",
    nombre: "Reportes, carga y pulido del modo en vivo",
    rango: "Pendiente",
    ghSince: null,
    ghUntil: null,
    resumen:
      "Fases 7 y 8: reportes de partidas en el portal, prueba de carga con bots dentro del repo y el pulido de sonido, animación y copy que propone la investigación UX.",
    historias: [
      {
        id: "AN-23",
        titulo: "Como administrador, quiero ver y exportar el reporte completo de cada partida para medir la participación de mis equipos",
        tipo: "historia",
        valor: "alto",
        col: "cola",
        par: "IA",
        tags: ["reportes"],
        requisitos: ["RF-701", "RF-702", "RF-703"],
        dod: [
          pend("Historial de partidas por juego."),
          pend("Detalle con ranking final, resultados por pregunta y por jugador."),
          pend("Export CSV con BOM, respetando el filtro por empresa."),
        ],
      },
      {
        id: "AN-24",
        titulo: "Como desarrollador, quiero una prueba de carga con 50 bots en scripts/ para saber que una sala llena funciona antes de cada evento",
        tipo: "tarea",
        valor: "alto",
        col: "cola",
        par: "IA",
        tags: ["pruebas", "carga"],
        requisitos: ["RNF-16", "RNF-13"],
        dod: [
          pend("Script de bots versionado en scripts/ en vez del scratchpad de una sesión."),
          pend("Medición del retraso del contador de respuestas y del consumo de mensajes de Ably."),
        ],
      },
      {
        id: "AN-25",
        titulo: "Como jugador, quiero música, sonidos y animaciones en los momentos clave para que la partida se sienta como un juego",
        tipo: "historia",
        valor: "medio",
        col: "cola",
        par: "MR",
        tags: ["ux", "sonido"],
        requisitos: ["RNF-21"],
        dod: [
          pend("Sonido de cuenta regresiva, revelado y podio con opción de silenciar."),
          pend("Animaciones de ranking y podio según docs/investigacion-ux-kahoot.md."),
        ],
      },
    ],
  },
  {
    id: "it-desafio",
    fase: "Fase 3 · Módulo en vivo",
    nombre: "Desafío a su ritmo",
    rango: "2026-09-22",
    ghSince: null,
    ghUntil: null,
    resumen:
      "Segunda forma de jugar un juego, como el modo asignado de Kahoot: sin host ni proyector, cada persona juega desde su celular hasta una fecha de cierre. Pedido para el primer cliente (Juan Valdez, Semana de la Salud), con sedes y turnos distintos.",
    historias: [
      {
        id: "AN-29",
        titulo: "Como administrador, quiero asignar un juego como desafío con fecha de cierre y compartir un enlace para que cada empleado lo juegue cuando pueda",
        tipo: "historia",
        valor: "alto",
        col: "aceptacion",
        par: "IA",
        fecha: "2026-09-22",
        tags: ["desafío", "asíncrono"],
        requisitos: ["RF-801", "RF-802", "RF-803", "RF-804", "RF-805"],
        dod: [
          ok("Tablas live_challenges y live_challenge_progress solo con CREATE IF NOT EXISTS (migración segura en producción)."),
          ok("Reglas puras de avance, reloj por jugador y fecha de cierre con tests (live-challenge-engine.test.mts)."),
          ok("Flujo por HTTP en local: intro, respuesta temprana rechazada, puntaje y racha, tiempo vencido, doble toque, final con ranking, un intento por celular y cierre por fecha."),
          ok("Partida en vivo sin cambios de comportamiento (entrada y respuestas probadas)."),
          pend("Revisión visual del panel de asignar y la página del desafío en el admin."),
          pend("Prueba en celulares reales antes del primer uso con el cliente."),
        ],
      },
    ],
  },
  {
    id: "it-escenas",
    fase: "Fase 4 · Experiencias interactivas",
    nombre: "Biblioteca y ruta del café completa: de la finca a la taza",
    rango: "2026-09-23 · 2026-09-24",
    ghSince: null,
    ghUntil: null,
    resumen:
      "Nuevo tipo de actividad: escenas interactivas guardadas en una biblioteca, como las plantillas de Genially. La primera, para la Semana de la Salud de Juan Valdez, es la estación 1 de la Ruta del café: un recolector sube un bulto en una finca de ladera en pixel art estilo Habbo y el participante señala los errores de su forma de trabajar. Investigación previa de Habbo y de manipulación de cargas en docs/investigacion-ux-habbo.md.",
    historias: [
      {
        id: "AN-30",
        titulo: "Como participante, quiero encontrar en una escena los errores de la forma de trabajar de un recolector para aprender a levantar cargas sin lastimarme",
        tipo: "historia",
        valor: "alto",
        col: "aceptacion",
        par: "IA",
        fecha: "2026-09-24",
        tags: ["escenas", "pixel art", "sst"],
        requisitos: ["RF-901", "RF-902", "RF-903", "RF-904", "RF-905", "RF-906"],
        dod: [
          ok("Motor pixel propio (buffer, avatar posable, línea de tiempo) sin DOM, con capturas en PNG desde Node."),
          ok("Tablas nuevas solo con CREATE IF NOT EXISTS (migración segura en producción)."),
          ok("Calificación en el servidor sin mandar la respuesta al navegador; tests en src/lib/experiences.test.mts."),
          ok("Flujo completo en Chromium headless en escritorio y celular, con respuestas y puntaje verificados en la base."),
          ok("Editor de textos: guardar, validar y restaurar probados en el navegador."),
          pend("Revisión del arte y los textos con el usuario y con el cliente."),
          pend("Prueba en celulares reales antes del primer uso."),
        ],
      },
      {
        id: "AN-31",
        titulo: "Como participante, quiero seguir la ruta del café en la estación de transporte y conducción para conocer sus riesgos",
        tipo: "historia",
        valor: "alto",
        col: "aceptacion",
        par: "IA",
        fecha: "2026-09-24",
        tags: ["escenas", "pixel art", "sst", "seguridad vial"],
        requisitos: ["RF-907", "RF-908"],
        dod: [
          ok("Escena del yipao en carretera de montaña: vía que corre, cámara que se acerca a la cabina, historia inicial y viaje correcto al final."),
          ok("Siete riesgos con respaldo en la Ley 769 de 2002 y la Resolución 40595 de 2022, con textos editables."),
          ok("La estación se desbloquea al terminar la finca con el mismo código, sin cambios de base de datos."),
          ok("Tests de catálogo y serie; flujo de vista previa y de participante probados en Chromium headless con datos verificados en la base."),
          pend("Revisión del arte y los textos con el usuario y con el cliente."),
          pend("Prueba en celulares reales antes del primer uso."),
        ],
      },
      {
        id: "AN-32",
        titulo: "Como participante, quiero seguir la ruta del café en la trilladora para conocer los riesgos de la bodega y de la máquina",
        tipo: "historia",
        valor: "alto",
        col: "aceptacion",
        par: "IA",
        fecha: "2026-09-24",
        tags: ["escenas", "pixel art", "sst"],
        requisitos: ["RF-909", "RF-908"],
        dod: [
          ok("Bodega como sala de Habbo: trilladora con tolva, correa y poleas, tablero, arrume, puerta de cargue y montacargas que patrulla."),
          ok("Siete riesgos con respaldo en la Resolución 2400 de 1979, con textos editables."),
          ok("Avatar con gorra, orejeras y tapabocas; cámara con zoom común a las escenas."),
          ok("Vista previa y ruta completa de participante probadas en Chromium headless con datos verificados en la base."),
          pend("Revisión del arte y los textos con el usuario y con el cliente."),
          pend("Prueba en celulares reales antes del primer uso."),
        ],
      },
      {
        id: "AN-33",
        titulo: "Como participante, quiero seguir la ruta del café en la tostión para conocer los riesgos del gas, el fuego, el humo y el calor",
        tipo: "historia",
        valor: "alto",
        col: "aceptacion",
        par: "IA",
        fecha: "2026-09-24",
        tags: ["escenas", "pixel art", "sst"],
        requisitos: ["RF-910", "RF-908"],
        dod: [
          ok("Planta de tostión: tostadora de tambor con llama, humo que se acumula sin extractor, cilindro de gas, colector de cascarilla y bandeja con aspas."),
          ok("Siete riesgos con respaldo en la Resolución 2400 de 1979 y NIOSH, con textos editables."),
          ok("Protagonista nueva (Luz): el avatar ganó pelo largo, moño, cofia y la opción sin bigote."),
          ok("Vista previa y ruta completa de participante (cuatro estaciones) probadas en Chromium headless con datos verificados en la base."),
          pend("Revisión del arte y los textos con el usuario y con el cliente."),
          pend("Prueba en celulares reales antes del primer uso."),
        ],
      },
      {
        id: "AN-34",
        titulo: "Como participante, quiero cerrar la ruta del café en la tienda para conocer los riesgos de la barra",
        tipo: "historia",
        valor: "alto",
        col: "aceptacion",
        par: "IA",
        fecha: "2026-09-24",
        tags: ["escenas", "pixel art", "sst"],
        requisitos: ["RF-911", "RF-908"],
        dod: [
          ok("Tienda como sala de Habbo: barra, vitrina, caja, máquina de espresso con lanceta, lavaplatos, estante alto, fila de clientes y un cliente enojado."),
          ok("Siete riesgos con respaldo en la Resolución 2400 de 1979, la Resolución 2646 de 2008 y OSHA, con textos editables."),
          ok("Cierre de la ruta: el resumen de la última estación celebra la ruta completa y la biblioteca ya no anuncia estaciones en construcción."),
          ok("Vista previa y ruta completa de participante (cinco estaciones, 35 riesgos) probadas en Chromium headless con datos verificados en la base."),
          pend("Revisión del arte y los textos con el usuario y con el cliente."),
          pend("Prueba en celulares reales antes del primer uso."),
        ],
      },
    ],
  },
  {
    id: "it-marca",
    fase: "Marca de empresa",
    nombre: "Co-branding: logo y colores de cada empresa",
    rango: "24 sep 2026 - 25 sep 2026",
    ghSince: "2026-09-24",
    ghUntil: "2026-09-26",
    resumen:
      "Cada empresa configura su identidad visual y la ven sus participantes, la pantalla de los juegos en vivo y sus reportes, siempre con un sello discreto de Antídoto.",
    historias: [
      {
        id: "AN-35",
        titulo: "Como superadmin, quiero dar a cada empresa su logo y sus colores para que sus colaboradores sientan la actividad como propia",
        tipo: "historia",
        valor: "alto",
        col: "aceptacion",
        par: "IA",
        fecha: "2026-09-25",
        tags: ["empresas", "marca", "ux"],
        requisitos: ["RF-303", "RF-307", "RF-308"],
        dod: [
          ok("Editor de marca con vista previa en vivo (participante, proyector y reporte) al crear o editar una empresa, y pestaña Mi marca para el admin de empresa."),
          ok("Logo validado por su firma y sin código (SVG), recortado y comprimido en el navegador, servido con caché por versión."),
          ok("Paleta derivada con contraste AA probado para cualquier color (src/lib/brand-palette.test.mts)."),
          ok("Marca aplicada en misión, misión completada, Ruta del café, proyector y celular en vivo."),
          ok("Reportes PDF por empresa y por partida con la marca."),
          pend("Revisión visual con el usuario y con logos reales de clientes."),
          pend("Aplicar la migración (company_branding) en Turso de producción antes de desplegar."),
        ],
      },
    ],
  },
  {
    id: "it-portal-empresas",
    fase: "Portal admin",
    nombre: "El portal gira alrededor de la empresa",
    rango: "25 sep 2026",
    ghSince: "2026-09-25",
    ghUntil: "2026-09-26",
    resumen:
      "Asignar una actividad, ver su avance por empresa, sacar el informe y dar de baja estaban repartidos entre Actividades, Biblioteca y Configuración, y ni el propio desarrollador encontraba cómo hacerlo. Ahora cada empresa tiene su página con todo lo suyo, asignar es un solo formulario y borrar pasó a archivar.",
    historias: [
      {
        id: "AN-36",
        titulo: "Como superadmin, quiero entrar a una empresa y ver ahí sus actividades, su avance, su informe y sus códigos para gestionarla sin saltar entre secciones",
        tipo: "historia",
        valor: "alto",
        col: "aceptacion",
        par: "IA",
        fecha: "2026-09-25",
        tags: ["portal", "empresas", "ux"],
        requisitos: ["RF-201", "RF-202", "RF-301", "RF-302", "RF-303", "RF-309", "RF-902"],
        dod: [
          ok("Menú Inicio, Empresas, Biblioteca, Juegos en vivo y Ajustes; el admin de empresa ve Mi empresa y entra directo a la suya."),
          ok("Asignar actividad en un formulario: empresa elegida de la lista, actividad y fecha de cierre opcional."),
          ok("Página de empresa con avance, Ver resultados, Informe PDF y códigos para copiar, pausar, cambiar fecha y quitar."),
          ok("Archivar empresa y quitar actividad sin borrar resultados, con restauración; el admin de una empresa archivada ya no entra."),
          ok("Flujo completo probado en Chromium headless como superadmin y como admin de empresa, con los datos de prueba borrados al terminar."),
          pend("Revisión del flujo con el usuario."),
          pend("Aplicar la migración (company_archive, activity_code_archive) en Turso de producción antes de desplegar."),
        ],
      },
    ],
  },
  {
    id: "it-bienvenida",
    fase: "Fase 4 · Experiencias interactivas",
    nombre: "Bienvenida, mapa de la ruta y ficha del participante",
    rango: "26 sep 2026",
    ghSince: "2026-09-26",
    ghUntil: "2026-09-27",
    resumen:
      "La Ruta del café tenía cinco estaciones pero ninguna casa: el participante saltaba de una a otra sin ver cuánto le faltaba. Ahora llega a un mapa, Ramiro le da la bienvenida y le explica los granos, y en la primera estación un tutorial le enseña los controles. De paso cada código puede pedir cargo y lugar de listas cerradas, para que la empresa vea los resultados por cargo y por municipio.",
    historias: [
      {
        id: "AN-37",
        titulo: "Como participante, quiero un mapa de la ruta y que Ramiro me explique cómo se juega para saber cuánto me falta y qué gano",
        tipo: "historia",
        valor: "alto",
        col: "desarrollo",
        par: "IA",
        fecha: "2026-09-26",
        tags: ["escenas", "ux", "pixel art"],
        requisitos: ["RF-912", "RF-908"],
        dod: [
          ok("Mapa con estaciones terminadas, siguiente y cerradas, y celebración al abrir una nueva."),
          ok("Bienvenida de Ramiro en máquina de escribir que resalta el camino y el monedero; sale completa con movimiento reducido."),
          ok("Tutorial de controles en la primera estación, una vez por navegador, con opción de saltarlo."),
          ok("Barra superior con marca, monedero de granos y riesgos, sonido, volver al mapa y salir."),
          ok("Suite de node --test en verde (161 pruebas)."),
          ok("Probado en Chromium en escritorio (1400 px) y celular (390 px): bienvenida, ficha, mapa, tutorial, estación terminada, celebración y salir."),
          pend("Revisión del flujo con el usuario."),
        ],
      },
      {
        id: "AN-38",
        titulo: "Como administrador, quiero pedir el cargo y el municipio de cada participante de listas cerradas para ver los resultados por cargo y por lugar",
        tipo: "historia",
        valor: "alto",
        col: "desarrollo",
        par: "IA",
        fecha: "2026-09-26",
        tags: ["reportes", "empresas", "datos"],
        requisitos: ["RF-913", "RF-914", "RF-301", "RF-308", "RF-906"],
        dod: [
          ok("Paso 4 al asignar: cargos uno por línea (se proponen los últimos de la empresa) y lugar con la DIVIPOLA."),
          ok("Ficha al cerrar la bienvenida, solo con valores de las listas; validación en el servidor."),
          ok("Filtros por cargo, departamento y municipio en el resumen por riesgo, y CSV de participantes con el mismo filtro."),
          ok("Cargo y municipio en el reporte PDF cuando alguien los llenó."),
          ok("Listas y validación cubiertas en src/lib/profile.test.mts."),
          ok("Probado en el navegador: paso 4 con los cargos propuestos, ficha guardada en la base, filtro por cargo, CSV filtrado y columnas en el PDF."),
          pend("Aplicar la migración (activity_code_profile, participant_profiles) en Turso de producción antes de desplegar."),
        ],
      },
      {
        id: "AN-39",
        titulo: "Como participante que casi no usa computador, quiero que la escena me ayude sola a ver dónde están los errores para no depender del botón Pista",
        tipo: "historia",
        valor: "alto",
        col: "desarrollo",
        par: "IA",
        fecha: "2026-10-01",
        tags: ["escenas", "ux", "accesibilidad"],
        requisitos: ["RF-915", "RF-912", "RNF-18"],
        dod: [
          ok("Ayuda automática: tras 15 s sin tocar, o 3 toques fallidos, un anillo grande señala un riesgo pendiente; si sigue sin salir, aparece también la pista escrita. Gratis, sin restar granos."),
          ok("Cada momento muestra cuántos riesgos lleva encontrados (o un check) y late el que aún tiene pendientes."),
          ok("Los riesgos por encontrar del panel se tocan y despliegan una pista escrita (35 pistas en el catálogo, sin revelar la respuesta); la escena cambia al momento del riesgo y lo señala."),
          ok("Zona de toque más generosa con el dedo y aviso \"Estás cerca\" cuando el toque cae junto a un riesgo."),
          ok("Tutorial actualizado con las nuevas ayudas."),
          ok("Probado en Chromium en escritorio (1400 px) y celular (390 px); suite en verde (162 pruebas)."),
          pend("Revisión con el usuario y con personas que no usan computador a diario."),
        ],
      },
      {
        id: "AN-40",
        titulo: "Como participante en campo con señal débil, quiero que mi respuesta no se pierda si se corta la conexión para no repetir la pregunta ni quedar bloqueado",
        tipo: "historia",
        valor: "alto",
        col: "desarrollo",
        par: "IA",
        fecha: "2026-10-01",
        tags: ["escenas", "ux", "resiliencia"],
        requisitos: ["RF-916", "RF-912", "RNF-18"],
        dod: [
          ok("Sin conexión: pregunta abierta, opción marcada, mensaje claro y reenvío automático al volver la señal."),
          ok("Aviso fijo \"Sin conexión\" mientras no haya red; no tapa la barra superior."),
          ok("Una petición colgada se corta a los 20 s y deja reintentar (withTimeout, con pruebas)."),
          ok("Pausa, vencimiento o sesión terminada: ventana explicativa al abrir la pregunta, antes de elegir."),
          ok("Terminar la ruta, rendirse y guardar la ficha avisan y dejan reintentar."),
          ok("Probado en Chromium en escritorio (1400 px) y celular (390 px) cortando y devolviendo la red, pausando y venciendo el código; suite en verde (168 pruebas)."),
          pend("Probar en un celular real con señal intermitente."),
        ],
      },
      {
        id: "AN-41",
        titulo: "Como participante que terminó la ruta, quiero ver mi propio resultado y repasar lo que se me pasó para llevarlo a mi turno",
        tipo: "historia",
        valor: "medio",
        col: "desarrollo",
        par: "IA",
        fecha: "2026-10-01",
        tags: ["escenas", "ux", "aprendizaje"],
        requisitos: ["RF-917", "RF-912"],
        dod: [
          ok("La pantalla de misión cumplida muestra aciertos a la primera, encontrados, granos e insignias de las 5 estaciones."),
          ok("\"Llévate a tu turno\": hasta 3 prácticas de lo que no salió a la primera, priorizando lo que no encontró."),
          ok("Repaso por estación con lo elegido, lo correcto, la explicación y la práctica, con los textos vigentes."),
          ok("Las misiones que no son de escenas no cambian."),
          ok("Lógica cubierta en src/lib/experiences.test.mts (5 pruebas nuevas)."),
          ok("Probado en Chromium en escritorio y celular con 35 respuestas mezcladas (a la primera, otra opción y reveladas)."),
          pend("Revisión del texto y el orden con el usuario."),
        ],
      },
    ],
  },
  {
    id: "it-usuarios",
    fase: "Portal admin",
    nombre: "Usuarios del portal sin tocar la base",
    rango: "1 oct 2026",
    ghSince: "2026-10-01",
    ghUntil: "2026-10-02",
    resumen:
      "Para darle acceso a un cliente había que insertar la fila en admin_users con el hash scrypt a mano, y nadie podía cambiar su contraseña. Ahora el superadmin da accesos desde la página de cada empresa (y a otros superadmins desde Ajustes) con una contraseña generada, y cada quien la cambia en Mi cuenta.",
    historias: [
      {
        id: "AN-26",
        titulo: "Como superadmin, quiero crear y desactivar usuarios del portal desde la interfaz para no editar la base a mano",
        tipo: "historia",
        valor: "medio",
        col: "desarrollo",
        par: "IA",
        fecha: "2026-10-01",
        tags: ["usuarios", "portal", "seguridad"],
        requisitos: ["RF-104", "RF-105", "RF-103", "RNF-01"],
        dod: [
          ok("Alta de admins de empresa (página de la empresa) y de superadmins (Ajustes) con contraseña inicial generada, que se muestra una sola vez con un mensaje listo para enviar."),
          ok("Generar otra contraseña y desactivar o reactivar, con registro en el historial; ambas cierran las sesiones abiertas de esa persona."),
          ok("Mi cuenta para cambiar la propia contraseña, pidiendo la actual y cerrando las demás sesiones."),
          ok("Nadie se desactiva a sí mismo ni al último superadmin activo; el historial nunca guarda contraseñas."),
          ok("Probado en Chromium: alta, usuario repetido, cambio de contraseña, nueva contraseña con sesión cerrada, desactivar sin poder entrar y reactivar; datos de prueba borrados al terminar."),
          pend("Revisión del flujo con el usuario."),
          pend("Aplicar la migración (admin_user_disabled) en Turso de producción antes de desplegar."),
        ],
      },
    ],
  },
  {
    id: "it-backlog",
    fase: "Backlog",
    nombre: "Pendientes del portal y las misiones",
    rango: "Sin fecha",
    ghSince: null,
    ghUntil: null,
    resumen:
      "Huecos conocidos fuera del módulo en vivo, detectados al levantar esta documentación contra el código.",
    historias: [
      {
        id: "AN-27",
        titulo: "Como superadmin, quiero crear misiones con su propio contenido para que el puntaje del participante sea real",
        tipo: "historia",
        valor: "alto",
        col: "cola",
        par: "MR",
        tags: ["misiones"],
        requisitos: ["RF-206", "RF-006"],
        dod: [
          pend("Editor de misiones (título, etiqueta, descripción, retos)."),
          pend("Completar la misión calcula el puntaje en vez de fijarlo en 8.0."),
        ],
      },
      {
        id: "AN-28",
        titulo: "Como administrador, quiero pausar o reactivar un código ya creado y que la pausa impida nuevas entradas",
        tipo: "bug",
        valor: "medio",
        col: "desarrollo",
        par: "IA",
        tags: ["códigos"],
        requisitos: ["RF-004", "RF-302"],
        dod: [
          ok("Acción para cambiar estado y vencimiento de un código existente (página de la empresa, 2026-09-25)."),
          pend("Decidir y aplicar qué pasa al entrar con un código pausado (hoy entra)."),
        ],
      },
    ],
  },
];

export function todasLasHistorias() {
  return ITERACIONES.flatMap((it) => it.historias.map((h) => ({ ...h, iteracion: it })));
}

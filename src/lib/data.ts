import { AppState, LiveRound } from "./types";

export const LIVE_ROUNDS: LiveRound[] = [
  {
    prompt: "¿Cómo te sientes en este momento?",
    options: [
      { label: "Con energía", pct: 48 },
      { label: "Neutral", pct: 35 },
      { label: "Cansado/a", pct: 17 },
    ],
  },
  {
    prompt: "Elige la herramienta de bienestar que más te llama hoy",
    options: [
      { label: "Respiración guiada", pct: 52 },
      { label: "Pausa activa", pct: 30 },
      { label: "Gratitud", pct: 18 },
    ],
  },
  {
    prompt: "¿Qué obstáculo sientes más presente?",
    options: [
      { label: "Falta de tiempo", pct: 44 },
      { label: "Estrés acumulado", pct: 39 },
      { label: "Desmotivación", pct: 17 },
    ],
  },
  {
    prompt: "Selecciona el momento del día donde más lo necesitas",
    options: [
      { label: "Mañana", pct: 29 },
      { label: "Media jornada", pct: 46 },
      { label: "Fin del día", pct: 25 },
    ],
  },
  {
    prompt: "¿Qué tan lista/o te sientes para continuar?",
    options: [
      { label: "Muy lista/o", pct: 57 },
      { label: "Algo lista/o", pct: 33 },
      { label: "Necesito una pausa más", pct: 10 },
    ],
  },
];

export const ESTADO_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  activo: { label: "Activo", bg: "#E0F7EA", color: "#1F8A4C" },
  pausado: { label: "Pausado", bg: "#FFF3D6", color: "#A66B00" },
  vencido: { label: "Vencido", bg: "#FCE4E1", color: "#C0392B" },
};

export const DEFAULT_POLICY_TEXT = `AVISO DE PRIVACIDAD Y POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES

Responsable/Encargado: Antídoto Colombia actúa como encargado del tratamiento en nombre de la empresa u organización que contrató la actividad (responsable del tratamiento).

Finalidad: los datos (nombre y respuestas del ejercicio) se usan únicamente para gestionar tu participación y mostrar el avance agregado de tu equipo. No se comparten con terceros ajenos a la actividad.

Derechos del titular (Ley 1581 de 2012): tienes derecho a conocer, actualizar, rectificar y suprimir tus datos, así como a revocar esta autorización, escribiendo a privacidad@antidotocolombia.com.

Vigencia: los datos se conservan mientras dure la actividad y hasta 12 meses después para fines de reporte, salvo solicitud de eliminación anticipada.

Este es un texto de ejemplo, debe ser revisado y ajustado por el equipo legal antes de producción.`;

export const DEFAULT_TERMS_TEXT = `TÉRMINOS Y CONDICIONES DE USO

Al ingresar tu nombre y código de actividad aceptas participar de forma voluntaria en el ejercicio propuesto por tu organización a través de Antídoto.

La actividad tiene fines de bienestar y no constituye una evaluación de desempeño laboral.

Antídoto no se hace responsable por el uso que la empresa contratante haga de los resultados agregados compartidos con ella.

Este es un texto de ejemplo, debe ser revisado y ajustado por el equipo legal antes de producción.`;

export function createInitialState(): AppState {
  return {
    screen: "landing",
    name: "",
    code: "",
    acceptedPolicy: false,
    codeError: "",
    matchedMissionId: null,
    matchedCodigo: null,
    completedCodes: [],

    loginRole: "super",
    loginCompany: "",
    adminRole: null,
    adminCompany: null,

    selectedMissionId: "m1",
    configTab: "codes",

    newCodeMissionId: "m1",
    newCodeEmpresa: "",
    newCodeEstado: "activo",
    newCodeExpira: "",

    newCompanyName: "",
    lastGeneratedCode: null,

    searchMenu: "",
    searchGroups: "",
    filterEstado: "todos",

    expandedGroupCodigo: null,
    compareSelection: [],
    compareOpen: false,

    previewMissionId: null,
    notifOpen: false,

    liveSession: { status: "lobby", round: 0, totalRounds: LIVE_ROUNDS.length, connected: 0 },
    liveScores: {},

    policyModalOpen: false,
    policyModalTab: "privacidad",
    policyText: DEFAULT_POLICY_TEXT,
    termsText: DEFAULT_TERMS_TEXT,

    confirmDeleteCompany: null,

    auditLog: [
      { time: "18 sep 2026, 09:12", text: "Código RP-SURA01 generado para Banco Sura (Rescata tu pausa)." },
      { time: "12 sep 2026, 15:40", text: "Código MC-ACME02 generado para Grupo Acme (Misión Confiablemente)." },
      { time: "01 sep 2026, 08:05", text: 'Empresa "Universidad Central" añadida.' },
    ],
    notifications: [
      { id: 1, text: "Banco Sura alcanzó 91% de avance en \"Rescata tu pausa\".", time: "Hace 2 h", read: false },
      { id: 2, text: "El código MC-ACME02 venció el 01 sep 2026.", time: "Hace 1 día", read: false },
      { id: 3, text: "Constructora Del Valle pausó su participación.", time: "Hace 2 días", read: true },
      { id: 4, text: "Se generó un nuevo código para Universidad Central.", time: "Hace 4 días", read: true },
    ],
    companies: ["Grupo Acme", "Constructora Del Valle", "Banco Sura", "Universidad Central"],
    missions: [
      {
        id: "m1",
        tag: "RETO 01",
        title: "Rescata tu pausa",
        description:
          "Mini misión interactiva. El participante avanza mediante pequeñas pruebas o decisiones de bienestar. Se siente como un juego, no como un examen ni una evaluación.",
        trend: [24, 38, 50, 62, 70, 75],
        groups: [
          { empresa: "Banco Sura", codigo: "RP-SURA01", participantes: 58, avance: 91, promedio: 9.0, fecha: "15 ago 2026", estado: "activo", expira: "30 nov 2026" },
          { empresa: "Grupo Acme", codigo: "RP-ACME24", participantes: 42, avance: 78, promedio: 8.4, fecha: "03 sep 2026", estado: "activo", expira: "15 oct 2026" },
          { empresa: "Constructora Del Valle", codigo: "RP-DELVALLE", participantes: 30, avance: 55, promedio: 7.1, fecha: "10 sep 2026", estado: "pausado", expira: "01 oct 2026" },
        ],
      },
      {
        id: "m2",
        tag: "RETO 02",
        title: "Misión Confiablemente",
        description:
          "Recorrido interactivo con pequeñas decisiones, acertijos y desafíos: elección de respuestas, descubrimiento de elementos y selección de herramientas de bienestar.",
        trend: [8, 18, 27, 38, 48, 51],
        groups: [
          { empresa: "Universidad Central", codigo: "MC-UCEN24", participantes: 120, avance: 64, promedio: 7.8, fecha: "01 sep 2026", estado: "activo", expira: "20 dic 2026" },
          { empresa: "Grupo Acme", codigo: "MC-ACME02", participantes: 42, avance: 38, promedio: 6.5, fecha: "12 sep 2026", estado: "vencido", expira: "01 sep 2026" },
        ],
      },
    ],
  };
}

export const GAME_MODE: "autoritmo" | "sincronizado" = "autoritmo";
export const LEADERBOARD_METRIC: "avance" | "promedio" = "avance";
export const REQUIRE_CODE_VALIDATION = true;

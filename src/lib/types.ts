export type Estado = "activo" | "pausado" | "vencido";

export interface Group {
  empresa: string;
  codigo: string;
  participantes: number;
  avance: number;
  promedio: number;
  fecha: string;
  estado: Estado;
  expira: string;
}

export interface Mission {
  id: string;
  tag: string;
  title: string;
  description: string;
  trend: number[];
  groups: Group[];
}

export interface AuditEntry {
  time: string;
  text: string;
}

export interface Notification {
  id: number;
  text: string;
  time: string;
  read: boolean;
}

export interface LiveRoundOption {
  label: string;
  pct: number;
}

export interface LiveRound {
  prompt: string;
  options: LiveRoundOption[];
}

export type Screen =
  | "landing"
  | "mission"
  | "mission-complete"
  | "admin-login"
  | "admin-menu"
  | "admin-detail"
  | "admin-config"
  | "admin-live";

export type LoginRole = "super" | "empresa";
export type AdminRole = "super" | "empresa" | null;
export type ConfigTab = "codes" | "companies" | "legal" | "auditoria";
export type LiveStatus = "lobby" | "question" | "reveal" | "finished";

export interface LiveSession {
  status: LiveStatus;
  round: number;
  totalRounds: number;
  connected: number;
}

export interface AppState {
  screen: Screen;

  name: string;
  code: string;
  acceptedPolicy: boolean;
  codeError: string;
  matchedMissionId: string | null;
  matchedCodigo: string | null;
  completedCodes: string[];

  loginRole: LoginRole;
  loginCompany: string;
  adminRole: AdminRole;
  adminCompany: string | null;

  selectedMissionId: string;
  configTab: ConfigTab;

  newCodeMissionId: string;
  newCodeEmpresa: string;
  newCodeEstado: Estado;
  newCodeExpira: string;

  newCompanyName: string;
  lastGeneratedCode: string | null;

  searchMenu: string;
  searchGroups: string;
  filterEstado: "todos" | Estado;

  expandedGroupCodigo: string | null;
  compareSelection: string[];
  compareOpen: boolean;

  previewMissionId: string | null;
  notifOpen: boolean;

  liveSession: LiveSession;
  liveScores: Record<string, number>;

  policyModalOpen: boolean;
  policyModalTab: "privacidad" | "terminos";
  policyText: string;
  termsText: string;

  confirmDeleteCompany: string | null;

  auditLog: AuditEntry[];
  notifications: Notification[];
  companies: string[];
  missions: Mission[];
}

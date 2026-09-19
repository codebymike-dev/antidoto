export type Estado = "activo" | "pausado" | "vencido";

export type ConfigTab = "codes" | "companies" | "legal" | "auditoria";

export type LiveStatus = "lobby" | "question" | "reveal" | "finished";

export interface LiveRoundOption {
  label: string;
  pct: number;
}

export interface LiveRound {
  prompt: string;
  options: LiveRoundOption[];
}

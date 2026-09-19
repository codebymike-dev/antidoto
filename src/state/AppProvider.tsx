"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AppState, Estado } from "@/lib/types";
import { createInitialState, LIVE_ROUNDS } from "@/lib/data";
import {
  exportCSVRows,
  formatExpira,
  formatFechaHoy,
  generateCodigo,
  nowStr,
  validateCode,
} from "@/lib/utils";

type Updater = Partial<AppState> | ((prev: AppState) => Partial<AppState>);

interface AppContextValue {
  state: AppState;
  set: (updater: Updater) => void;
  navigate: (updater: Updater) => void;
  actions: ReturnType<typeof createActions>;
}

const AppContext = createContext<AppContextValue | null>(null);

function createActions(state: AppState, set: (u: Updater) => void, navigate: (u: Updater) => void) {
  return {
    setName: (v: string) => set({ name: v }),
    setCode: (v: string) => set({ code: v }),
    setAcceptedPolicy: (checked: boolean) => set({ acceptedPolicy: checked, codeError: "" }),

    startMission: () => {
      if (!state.name.trim()) {
        set({ codeError: "Ingresa tu nombre." });
        return;
      }
      if (!state.code.trim()) {
        set({ codeError: "Ingresa el código de tu actividad." });
        return;
      }
      if (!state.acceptedPolicy) {
        set({ codeError: "Debes aceptar la política de tratamiento de datos." });
        return;
      }
      const match = validateCode(state.missions, state.code);
      if (!match) {
        set({ codeError: "Código no encontrado o inválido. Verifica con tu administrador." });
        return;
      }
      if (match.group.estado === "vencido") {
        set({ codeError: `Este código venció el ${match.group.expira}. Contacta a tu administrador.` });
        return;
      }
      navigate({
        screen: "mission",
        codeError: "",
        matchedMissionId: match.mission.id,
        matchedCodigo: match.group.codigo,
      });
    },

    finishMission: () =>
      navigate((s) => ({ screen: "mission-complete", completedCodes: [...s.completedCodes, s.matchedCodigo!] })),

    backToLanding: () =>
      navigate({
        screen: "landing",
        name: "",
        code: "",
        codeError: "",
        acceptedPolicy: false,
        matchedMissionId: null,
        matchedCodigo: null,
      }),

    goToAdminLogin: () => navigate({ screen: "admin-login" }),

    setLoginRoleSuper: () => set({ loginRole: "super" }),
    setLoginRoleEmpresa: () =>
      set((s) => ({ loginRole: "empresa", loginCompany: s.loginCompany || s.companies[0] })),
    setLoginCompany: (v: string) => set({ loginCompany: v }),

    submitLogin: () =>
      navigate((s) => ({
        screen: "admin-menu",
        adminRole: s.loginRole,
        adminCompany: s.loginRole === "empresa" ? s.loginCompany || s.companies[0] : null,
      })),

    goToAdminMenu: () => navigate({ screen: "admin-menu" }),
    goToAdminConfig: () =>
      navigate((s) => ({
        screen: "admin-config",
        configTab: "codes",
        newCodeEmpresa: s.adminRole === "empresa" ? s.adminCompany ?? "" : "",
      })),
    goToNewCode: () =>
      navigate((s) => ({
        screen: "admin-config",
        configTab: "codes",
        newCodeEmpresa: s.adminRole === "empresa" ? s.adminCompany ?? "" : "",
      })),
    goToNewCodeForSelected: () =>
      navigate((s) => ({
        screen: "admin-config",
        configTab: "codes",
        newCodeMissionId: s.selectedMissionId,
        newCodeEmpresa: s.adminRole === "empresa" ? s.adminCompany ?? "" : "",
      })),
    logout: () =>
      navigate({
        screen: "landing",
        name: "",
        code: "",
        adminRole: null,
        adminCompany: null,
        notifOpen: false,
        compareOpen: false,
        compareSelection: [],
        expandedGroupCodigo: null,
      }),

    openMission: (id: string) =>
      navigate({ selectedMissionId: id, screen: "admin-detail", expandedGroupCodigo: null, compareOpen: false, compareSelection: [] }),

    goToLive: () => {
      const mission = state.missions.find((m) => m.id === state.selectedMissionId);
      const groups =
        state.adminRole === "empresa"
          ? (mission?.groups ?? []).filter((g) => g.empresa === state.adminCompany)
          : mission?.groups ?? [];
      const scores: Record<string, number> = {};
      groups.forEach((g) => {
        scores[g.codigo] = 0;
      });
      const connected = Math.max(3, Math.round(groups.reduce((a, g) => a + g.participantes, 0) * 0.25));
      navigate({
        screen: "admin-live",
        liveSession: { status: "lobby", round: 0, totalRounds: LIVE_ROUNDS.length, connected },
        liveScores: scores,
      });
    },
    exitLive: () => navigate({ screen: "admin-detail" }),
    simulateJoin: () => set((s) => ({ liveSession: { ...s.liveSession, connected: s.liveSession.connected + 1 } })),
    startLiveSession: () => set((s) => ({ liveSession: { ...s.liveSession, status: "question", round: 1 } })),
    revealRound: () =>
      set((s) => {
        const scores = { ...s.liveScores };
        Object.keys(scores).forEach((codigo) => {
          scores[codigo] += Math.floor(Math.random() * 15) + 5;
        });
        return { liveScores: scores, liveSession: { ...s.liveSession, status: "reveal" } };
      }),
    nextRound: () =>
      set((s) => {
        const next = s.liveSession.round + 1;
        if (next > s.liveSession.totalRounds) return { liveSession: { ...s.liveSession, status: "finished" } };
        return { liveSession: { ...s.liveSession, status: "question", round: next } };
      }),

    setTabCodes: () => set({ configTab: "codes" }),
    setTabCompanies: () => set({ configTab: "companies" }),
    setTabLegal: () => set({ configTab: "legal" }),
    setTabAuditoria: () => set({ configTab: "auditoria" }),

    setNewCodeMission: (v: string) => set({ newCodeMissionId: v }),
    setNewCodeEmpresa: (v: string) => set({ newCodeEmpresa: v }),
    setNewCodeEstado: (v: Estado) => set({ newCodeEstado: v }),
    setNewCodeExpira: (v: string) => set({ newCodeExpira: v }),

    generateCode: () => {
      const { newCodeMissionId, newCodeEmpresa, missions, newCodeEstado, newCodeExpira, auditLog } = state;
      const empresa = newCodeEmpresa.trim();
      if (!empresa) return;
      const mission = missions.find((m) => m.id === newCodeMissionId);
      if (!mission) return;
      const codigo = generateCodigo(mission.title, empresa);
      const fecha = formatFechaHoy();
      const expira = formatExpira(newCodeExpira);
      const newMissions = missions.map((m) =>
        m.id === mission.id
          ? {
              ...m,
              groups: [
                { empresa, codigo, participantes: 0, avance: 0, promedio: 0, fecha, estado: newCodeEstado || "activo", expira },
                ...m.groups,
              ],
            }
          : m
      );
      const entry = { time: nowStr(), text: `Código ${codigo} generado para ${empresa} (${mission.title}).` };
      set({
        missions: newMissions,
        lastGeneratedCode: codigo,
        newCodeEmpresa: state.adminRole === "empresa" ? empresa : "",
        newCodeExpira: "",
        auditLog: [entry, ...auditLog],
      });
    },

    setNewCompanyName: (v: string) => set({ newCompanyName: v }),
    addCompany: () => {
      const name = state.newCompanyName.trim();
      if (!name || state.companies.includes(name)) {
        set({ newCompanyName: "" });
        return;
      }
      const entry = { time: nowStr(), text: `Empresa "${name}" añadida.` };
      set((s) => ({ companies: [...s.companies, name], newCompanyName: "", auditLog: [entry, ...s.auditLog] }));
    },
    askDeleteCompany: (name: string) => set({ confirmDeleteCompany: name }),
    cancelDeleteCompany: () => set({ confirmDeleteCompany: null }),
    confirmDeleteCompanyYes: (name: string) => {
      const entry = { time: nowStr(), text: `Empresa "${name}" eliminada.` };
      set((s) => ({
        companies: s.companies.filter((c) => c !== name),
        confirmDeleteCompany: null,
        auditLog: [entry, ...s.auditLog],
      }));
    },

    setSearchMenu: (v: string) => set({ searchMenu: v }),
    setSearchGroups: (v: string) => set({ searchGroups: v }),
    setFilterEstado: (value: "todos" | Estado) => set({ filterEstado: value, compareSelection: [] }),

    toggleExpand: (codigo: string) =>
      set((s) => ({ expandedGroupCodigo: s.expandedGroupCodigo === codigo ? null : codigo })),

    toggleCompareSelect: (codigo: string) =>
      set((s) => ({
        compareSelection: s.compareSelection.includes(codigo)
          ? s.compareSelection.filter((c) => c !== codigo)
          : [...s.compareSelection, codigo],
      })),
    openCompare: () => set({ compareOpen: true }),
    closeCompare: () => set({ compareOpen: false, compareSelection: [] }),

    toggleNotifications: () =>
      set((s) => {
        const opening = !s.notifOpen;
        return {
          notifOpen: opening,
          notifications: opening ? s.notifications.map((n) => ({ ...n, read: true })) : s.notifications,
        };
      }),

    setPreview: (id: string) => set({ previewMissionId: id }),
    openPreviewSelected: () => set((s) => ({ previewMissionId: s.selectedMissionId })),
    closePreview: () => set({ previewMissionId: null }),

    openPolicyModal: (tab: "privacidad" | "terminos") => set({ policyModalOpen: true, policyModalTab: tab }),
    closePolicyModal: () => set({ policyModalOpen: false }),
    setPolicyModalTab: (tab: "privacidad" | "terminos") => set({ policyModalTab: tab }),
    setPolicyText: (v: string) => set({ policyText: v }),
    setTermsText: (v: string) => set({ termsText: v }),

    duplicateMission: (id: string) => {
      const mission = state.missions.find((m) => m.id === id);
      if (!mission) return;
      const copy = { ...mission, id: "m" + Date.now(), title: mission.title + " (copia)", groups: [] };
      const entry = { time: nowStr(), text: `Actividad "${mission.title}" duplicada.` };
      navigate((s) => ({ missions: [...s.missions, copy], screen: "admin-menu", auditLog: [entry, ...s.auditLog] }));
    },

    exportCSV: () => {
      const mission = state.missions.find((m) => m.id === state.selectedMissionId);
      if (!mission) return;
      const groups =
        state.adminRole === "empresa" ? mission.groups.filter((g) => g.empresa === state.adminCompany) : mission.groups;
      exportCSVRows(mission.title, groups);
    },
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(createInitialState);

  const set = useCallback((updater: Updater) => {
    setState((prev) => ({ ...prev, ...(typeof updater === "function" ? updater(prev) : updater) }));
  }, []);

  const navigate = useCallback(
    (updater: Updater) => {
      if (typeof document !== "undefined" && "startViewTransition" in document) {
        (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(() => set(updater));
      } else {
        set(updater);
      }
    },
    [set]
  );

  const actions = useMemo(() => createActions(state, set, navigate), [state, set, navigate]);

  const value = useMemo(() => ({ state, set, navigate, actions }), [state, set, navigate, actions]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

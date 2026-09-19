"use client";

import { AppProvider, useApp } from "@/state/AppProvider";
import LandingScreen from "./LandingScreen";
import MissionScreen from "./MissionScreen";
import MissionCompleteScreen from "./MissionCompleteScreen";
import AdminLoginScreen from "./AdminLoginScreen";
import AdminShell from "./admin/AdminShell";
import PreviewModal from "./PreviewModal";
import PolicyModal from "./PolicyModal";

function Screens() {
  const { state } = useApp();

  const isAdminShell =
    state.screen === "admin-menu" || state.screen === "admin-detail" || state.screen === "admin-config" || state.screen === "admin-live";

  return (
    <>
      {state.screen === "landing" && <LandingScreen />}
      {state.screen === "mission" && <MissionScreen />}
      {state.screen === "mission-complete" && <MissionCompleteScreen />}
      {state.screen === "admin-login" && <AdminLoginScreen />}
      {isAdminShell && <AdminShell />}
      <PreviewModal />
      <PolicyModal />
    </>
  );
}

export default function AppRoot() {
  return (
    <AppProvider>
      <Screens />
    </AppProvider>
  );
}

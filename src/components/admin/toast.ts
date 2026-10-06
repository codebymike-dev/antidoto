"use client";

// Avisos del portal tras guardar. Un almacén mínimo fuera de React: lo dispara cualquier
// formulario (ActionForm) y lo pinta un solo Toaster en el AdminShell.

export interface Toast {
  id: number;
  text: string;
  tone: "ok" | "error";
}

let current: Toast | null = null;
const listeners = new Set<() => void>();
let nextId = 1;

export function showToast(text: string, tone: Toast["tone"] = "ok") {
  current = { id: nextId++, text, tone };
  listeners.forEach((l) => l());
}

export function dismissToast(id: number) {
  if (current?.id !== id) return;
  current = null;
  listeners.forEach((l) => l());
}

export function subscribeToast(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const toastSnapshot = () => current;

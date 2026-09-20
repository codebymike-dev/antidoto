"use client";

import { useState, useTransition } from "react";
import { markNotificationsRead } from "@/lib/actions";
import { colors } from "@/lib/theme";
import { BellIcon } from "@/components/icons";

interface Notification {
  id: number;
  text: string;
  time: string;
  read: boolean;
}

function formatTime(iso: string) {
  const date = new Date(iso.replace(" ", "T") + (iso.endsWith("Z") ? "" : "Z"));
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsBell({ notifications }: { notifications: Notification[] }) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const hasUnread = notifications.some((n) => !n.read);

  function toggle() {
    const opening = !open;
    setOpen(opening);
    if (opening && hasUnread) startTransition(() => void markNotificationsRead());
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Notificaciones"
        aria-expanded={open}
        className="btn-icon"
        style={{
          cursor: "pointer",
          width: 38,
          height: 38,
          borderRadius: 11,
          background: "#fff",
          boxShadow: colors.cardShadowSmall,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          border: "none",
        }}
      >
        <BellIcon />
        {hasUnread && (
          <span
            style={{
              position: "absolute",
              top: 6,
              right: 7,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#E0553B",
            }}
          />
        )}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: 46,
            right: 0,
            width: 300,
            background: "#fff",
            borderRadius: 14,
            boxShadow: "0 20px 45px rgba(12,92,125,0.18)",
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            zIndex: 20,
          }}
        >
          {notifications.length === 0 && (
            <span style={{ fontSize: 12.5, color: colors.muted, padding: "10px 12px" }}>
              No hay novedades por ahora.
            </span>
          )}
          {notifications.map((n) => (
            <div
              key={n.id}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: n.read ? "transparent" : colors.accentTint,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <span style={{ fontSize: 12.5, color: colors.ink, lineHeight: 1.4 }}>{n.text}</span>
              <span style={{ fontSize: 11, color: colors.muted }}>{formatTime(n.time)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

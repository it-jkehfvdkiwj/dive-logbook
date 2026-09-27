"use client";

import { useEffect } from "react";

/** Registriert den Service Worker (nur in Production, damit Dev-Reloads nicht gecacht werden). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* PWA funktioniert auch ohne SW – bewusst ignoriert */
    });
  }, []);
  return null;
}

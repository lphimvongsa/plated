"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Force clients onto the asset-only SW so stale invite HTML/error pages are dropped.
        registration.update().catch(() => null);
      })
      .catch(() => {
        // The app still works normally when service-worker registration fails.
      });
  }, []);
  return null;
}

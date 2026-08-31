"use client";

import { partyThemeCssVars } from "@/lib/party/themes";
import { useEffect } from "react";

let cleanupTimer: number | null = null;

export function PartyThemeBridge({ scheme }: { scheme: string }) {
  useEffect(() => {
    const root = document.documentElement;
    if (cleanupTimer != null) {
      window.clearTimeout(cleanupTimer);
      cleanupTimer = null;
    }

    const vars = partyThemeCssVars(scheme) as Record<string, string>;
    const previous = new Map<string, string>();
    root.classList.add("global-party-theme");
    for (const [key, value] of Object.entries(vars)) {
      previous.set(key, root.style.getPropertyValue(key));
      root.style.setProperty(key, value);
    }

    return () => {
      for (const [key, value] of previous) {
        if (value) root.style.setProperty(key, value);
        else root.style.removeProperty(key);
      }
      cleanupTimer = window.setTimeout(() => {
        root.classList.remove("global-party-theme");
        cleanupTimer = null;
      }, 520);
    };
  }, [scheme]);

  return null;
}

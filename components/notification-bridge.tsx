"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";

const kindPrefs: Record<string, string> = {
  rsvp: "rsvp",
  collaborator_invite: "collabInvite",
  collaborator_accept: "collabAccept",
};

export function NotificationBridge() {
  useEffect(() => {
    const supabase = createClient();
    let channel: { unsubscribe?: () => void } | null = null;

    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      channel = (supabase as any)
        .channel("plated-native-notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${data.user.id}`,
          },
          async (payload: { new: { type?: string; title?: string; body?: string | null; href?: string | null } }) => {
            const prefs = JSON.parse(localStorage.getItem("plated.settings") || "{}") as Record<string, boolean>;
            const prefKey = kindPrefs[payload.new.type ?? ""] ?? payload.new.type;
            if (prefs.master === false || (prefKey && prefs[prefKey] === false) || Notification.permission !== "granted") {
              return;
            }
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification(payload.new.title || "plated.", {
              body: payload.new.body || "",
              data: { url: payload.new.href || "/app" },
            });
          },
        )
        .subscribe();
    });

    return () => {
      if (channel) (supabase as any).removeChannel(channel);
    };
  }, []);

  return null;
}

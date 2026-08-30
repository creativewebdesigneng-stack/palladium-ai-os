import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { getNotificationPreferences } from "@/lib/notifications/notifications.functions";

const LIVE_QUERY_KEYS = [
  ["notifications"],
  ["dashboard-summary"],
  ["mission-overview"],
  ["usage-overview"],
];

export const VOICE_NOTIFICATION_EVENT = "palladium:voice-notification";

/**
 * Subscribes the signed-in user to their own notification stream.
 * Browser notifications remain opt-in. A same-tab custom event is also emitted
 * so the authenticated global voice assistant can optionally speak the alert;
 * that event never leaves the current browser context.
 */
export default function useRealtimeNotifications() {
  const qc = useQueryClient();
  const prefsFn = useServerFn(getNotificationPreferences);
  const [userId, setUserId] = useState(null);
  const [unread, setUnread] = useState(0);
  const [prefs, setPrefs] = useState(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setUserId(data.session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setUserId(s?.user?.id ?? null),
    );
    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!userId) {
      setUnread(0);
      return;
    }
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);
    setUnread(count ?? 0);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setPrefs(null);
      return;
    }
    let alive = true;
    prefsFn({ data: {} })
      .then((p) => {
        if (alive) setPrefs(p);
      })
      .catch((e) => console.error("[notifications] preferences", e));
    refreshUnread();
    return () => {
      alive = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new;
          setUnread((n) => n + 1);
          LIVE_QUERY_KEYS.forEach((key) => qc.invalidateQueries({ queryKey: key }));
          toast({
            title: row.title,
            description: row.body ?? undefined,
            variant: row.severity === "critical" ? "destructive" : undefined,
          });
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent(VOICE_NOTIFICATION_EVENT, {
              detail: { id: row.id, title: row.title, severity: row.severity, link: row.link ?? null },
            }));
          }
          if (
            prefs?.browser_push &&
            typeof window !== "undefined" &&
            "Notification" in window &&
            window.Notification.permission === "granted"
          ) {
            new window.Notification("PalladiumAI", {
              body: prefs.browser_push_details ? row.title : "You have a new notification.",
              tag: row.id,
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refreshUnread();
          qc.invalidateQueries({ queryKey: ["notifications"] });
        },
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications" }, () => {
        refreshUnread();
        qc.invalidateQueries({ queryKey: ["notifications"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, prefs?.browser_push, prefs?.browser_push_details]);

  return { unread, refreshUnread };
}

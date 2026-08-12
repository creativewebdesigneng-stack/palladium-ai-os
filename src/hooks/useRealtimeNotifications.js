import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { getNotificationPreferences } from "@/lib/notifications/notifications.functions";

// Queries that are affected by backend activity and must refresh live.
const LIVE_QUERY_KEYS = [
  ["notifications"],
  ["dashboard-summary"],
  ["mission-overview"],
  ["usage-overview"],
];

/**
 * Subscribes the signed-in user to their own notification stream.
 *
 * Privacy: browser notifications are only ever requested when the user has
 * explicitly enabled them, and the body is withheld unless they have also
 * opted in to seeing details outside the app. Titles are generic by design —
 * no amounts, outputs or personal data are pushed through the browser channel.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          if (
            prefs?.browser_push &&
            typeof window !== "undefined" &&
            "Notification" in window &&
            window.Notification.permission === "granted"
          ) {
            // Details stay inside the app unless explicitly allowed.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, prefs?.browser_push, prefs?.browser_push_details]);

  return { unread, refreshUnread };
}
